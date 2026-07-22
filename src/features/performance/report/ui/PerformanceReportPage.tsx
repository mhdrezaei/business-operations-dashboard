import type { ActionType, ProColumns, ProFormInstance } from "@ant-design/pro-components";
import type { PerformanceReportRow, PerformanceReportSummary } from "../model/performance.report.types";
import type { CompanyType, PeriodType, ReportAggregationKey, ReportAuditColumnKey, ReportSelectOption, ReportServiceOption, SmsContractTypeFilter, SmsReportType } from "./constants";
import type { ReportFinancialColumnKey } from "./export";
import { BasicContent, BasicTable } from "#src/components";
import { fetchPerformanceReport } from "#src/features/performance/api/performances.api";
import { companyTypeMatches, normalizeServiceCode, pickCompanyTypeToken } from "#src/features/performance/shared/model/performance.helpers";
import {
	companiesByServiceQuery,
	performanceReportAvailabilityQuery,
	servicesQuery,
} from "#src/features/performance/shared/queries/performance.queries";
import { MONTH_OPTIONS } from "#src/features/performance/shared/ui/form/constants/jalali-date-options";
import { useAccess } from "#src/hooks";
import { FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Space, Typography } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	buildReportAggregationParams,
	filterAggregationKeys,
	getAllowedAggregationKeys,
	getPerformanceReportColumns,
	getReportDisplayMonth,
	getReportServiceLayout,
	getTrafficReportLayout,
	REPORT_FIELD_KEYS,
	supportsOperatorLanguageAggregation,
} from "./constants";
import {
	createPerformanceReportExportColumns,
	downloadPerformanceReportExcel,
	openPerformanceReportPdfPrint,
} from "./export";

interface ParsedPeriod {
	period: string
	year: number
	month: number
}

function parsePeriod(period: string): ParsedPeriod | null {
	const text = String(period ?? "").trim();
	if (!text)
		return null;

	const [yearRaw, monthRaw] = text.split("-");
	const year = Number(yearRaw);
	const month = Number(monthRaw);
	if (!Number.isFinite(year) || !Number.isFinite(month))
		return null;
	if (month < 1 || month > 12)
		return null;

	return {
		period: `${year}-${month}`,
		year,
		month,
	};
}

function sortPeriods(periods: string[]) {
	return [...periods].sort((a, b) => {
		const parsedA = parsePeriod(a);
		const parsedB = parsePeriod(b);
		if (!parsedA || !parsedB)
			return String(a).localeCompare(String(b));
		if (parsedA.year !== parsedB.year)
			return parsedA.year - parsedB.year;
		return parsedA.month - parsedB.month;
	});
}

function normalizePeriods(values: unknown) {
	if (!Array.isArray(values))
		return [];

	const dedup = new Set<string>();
	values.forEach((item) => {
		const parsed = parsePeriod(String(item ?? ""));
		if (!parsed)
			return;
		dedup.add(parsed.period);
	});

	return sortPeriods(Array.from(dedup));
}

function normalizeNumberList(values: unknown) {
	if (!Array.isArray(values))
		return [];

	const dedup = new Set<number>();
	values.forEach((item) => {
		const numeric = Number(item);
		if (Number.isInteger(numeric) && numeric > 0)
			dedup.add(numeric);
	});

	return Array.from(dedup);
}

function formatSummaryNumber(value: number | null | undefined) {
	if (value == null)
		return "-";
	return Number(value).toLocaleString("en-US");
}

function formatSummaryMoney(value: number | null | undefined, showRial: boolean) {
	if (value == null)
		return "-";
	return (showRial ? Number(value) : Number(value) / 10).toLocaleString("en-US");
}

function pickSummaryValue(summary: PerformanceReportSummary, keys: readonly string[]) {
	if (!summary)
		return null;

	const record = summary as Record<string, unknown>;
	for (const key of keys) {
		const value = record[key];
		if (value !== undefined && value !== null && value !== "") {
			const numeric = Number(value);
			if (Number.isFinite(numeric))
				return numeric;
		}
	}
	return null;
}

function isValidDefaultConversionRatio(value: number | null) {
	return value != null && Number.isFinite(value) && value >= 0 && value <= 10;
}

// In the fiscal calendar the period month is 3 months ahead of the month it
// represents to the user (fiscal month 1 = دی, 11 = آبان, 12 = آذر). Only the
// displayed name is shifted; the underlying period value stays untouched.

const DEFAULT_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = ["rial", "income", "expense", "profit", "total"];
const OPENAPI_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = ["rial", "income", "expense"];
const PSP_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = ["rial", "income", "expense", "profit"];
const SHAHKAR_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = ["rial", "income", "expense", "profit", "total"];
const TRAFFIC_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = ["rial", "income", "expense", "profit", "contractType", "total"];
const TRAFFIC_CP_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = ["showBaseUnit", ...TRAFFIC_FINANCIAL_COLUMNS];
const SMS_NORMAL_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = ["rial", "income", "expense", "contractType"];
const SMS_FINANCE_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = ["rial", "income", "total"];
const SMS_SUMMARY_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = ["rial", "income", "expense", "profit", "contractType", "total"];
const SMS_COMMISSION_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = [
	"rial",
	"unitPrice",
	"karashabIncome",
	"karashabExpense",
	"karashabProfit",
	"telecomIncome",
	"firstPartyIncome",
	"regionIncome",
	"salesAgentIncome",
	"total",
];
function getSmsFinancialDefaults(reportType: SmsReportType) {
	if (reportType === "finance")
		return SMS_FINANCE_FINANCIAL_COLUMNS;
	if (reportType === "summary")
		return SMS_SUMMARY_FINANCIAL_COLUMNS;
	return SMS_NORMAL_FINANCIAL_COLUMNS;
}

export function PerformanceReportPage() {
	const { t } = useTranslation();
	const { getPermittedCompanyTypes, getPermittedServiceIds } = useAccess();

	const actionRef = useRef<ActionType>(null);
	const formRef = useRef<ProFormInstance | undefined>(undefined);

	const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
	const [selectedServiceCode, setSelectedServiceCode] = useState<string | null>(null);
	const [selectedYear, setSelectedYear] = useState<number | null>(null);
	const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
	const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>([]);
	const [selectedSmsReportType, setSelectedSmsReportType] = useState<SmsReportType>("normal");
	const [selectedPeriodType, setSelectedPeriodType] = useState<PeriodType>("sh");
	const [selectedCompanyType, setSelectedCompanyType] = useState<CompanyType | null>(null);
	const [selectedContractType, setSelectedContractType] = useState<SmsContractTypeFilter>("all");
	const [selectedFinancialColumns, setSelectedFinancialColumns] = useState<ReportFinancialColumnKey[]>(DEFAULT_FINANCIAL_COLUMNS);
	const [selectedAuditColumns, setSelectedAuditColumns] = useState<ReportAuditColumnKey[]>([]);
	const [selectedAggregation, setSelectedAggregation] = useState<ReportAggregationKey[]>([]);
	const [defaultConversionRatio, setDefaultConversionRatio] = useState<number | null>(null);
	const [debouncedDefaultConversionRatio, setDebouncedDefaultConversionRatio] = useState<number | null>(null);
	const [summary, setSummary] = useState<PerformanceReportSummary>(null);

	const permittedViewIdsFromPerformances = getPermittedServiceIds("performances", "view");
	const permittedViewIdsFromContracts = getPermittedServiceIds("contracts", "view");
	const permittedViewServiceIdsList = permittedViewIdsFromPerformances.length > 0
		? permittedViewIdsFromPerformances
		: permittedViewIdsFromContracts;

	const permittedViewServiceIds = useMemo(
		() => new Set(permittedViewServiceIdsList),
		[permittedViewServiceIdsList.join(",")],
	);

	const normalizedSelectedServiceCode = normalizeServiceCode(selectedServiceCode);
	const availabilityRequiresCompanyType = normalizedSelectedServiceCode === "sms" || normalizedSelectedServiceCode === "psp" || normalizedSelectedServiceCode === "traffic";
	const hasRequiredAvailabilityFilters = !!selectedServiceId && (!availabilityRequiresCompanyType || !!selectedCompanyType);

	const services = useQuery(servicesQuery());
	const companies = useQuery(companiesByServiceQuery(selectedServiceId));
	const availabilityBase = useQuery({
		...performanceReportAvailabilityQuery({
			serviceId: selectedServiceId,
			companyType: selectedCompanyType,
			periodType: selectedPeriodType,
		}),
		enabled: hasRequiredAvailabilityFilters,
	});
	const availabilityByPeriods = useQuery({
		...performanceReportAvailabilityQuery({
			serviceId: selectedServiceId,
			shPeriods: selectedPeriods,
			companyType: selectedCompanyType,
			periodType: selectedPeriodType,
		}),
		enabled: hasRequiredAvailabilityFilters && selectedPeriods.length > 0,
	});

	const serviceOptions: ReportServiceOption[] = useMemo(() => {
		return (services.data?.results ?? [])
			.filter(service => permittedViewServiceIds.has(Number(service.id)))
			.map((service) => {
				const code = normalizeServiceCode(service.code);
				return {
					label: service.name,
					value: service.id,
					code,
				};
			});
	}, [services.data, permittedViewServiceIdsList.join(",")]);

	useEffect(() => {
		if (!selectedServiceId)
			return;
		if (permittedViewServiceIds.has(selectedServiceId))
			return;

		setSelectedServiceId(null);
		setSelectedServiceCode(null);
		setSelectedYear(null);
		setSelectedPeriods([]);
		setSelectedCompanyIds([]);
		setSelectedSmsReportType("normal");
		setSelectedPeriodType("sh");
		setSelectedCompanyType(null);
		setSelectedContractType("all");
		setSelectedFinancialColumns(DEFAULT_FINANCIAL_COLUMNS);
		setSelectedAuditColumns([]);
		setSelectedAggregation([]);
		setDefaultConversionRatio(null);
		setDebouncedDefaultConversionRatio(null);
		setSummary(null);
		formRef.current?.setFieldsValue({
			service_id: undefined,
			sh_year: undefined,
			sh_periods: undefined,
			company_ids: undefined,
			company_type: undefined,
			sms_report_type: "normal",
			period_type: "sh",
			is_official: "all",
			financial_columns: DEFAULT_FINANCIAL_COLUMNS,
			audit_columns: undefined,
			aggregation: [],
			default_conversion_ratio: undefined,
		});
	}, [selectedServiceId, permittedViewServiceIdsList.join(",")]);

	const selectedServiceName = useMemo(() => {
		if (!selectedServiceId)
			return null;
		return serviceOptions.find(item => item.value === selectedServiceId)?.label ?? null;
	}, [selectedServiceId, serviceOptions]);
	const isSmsService = selectedServiceCode === "sms";
	const isSmsCommissionService = selectedServiceCode === "sms-commission" || selectedServiceCode === "sms_commission";
	const isOpenApiService = selectedServiceCode === "openapi";
	const isTrafficService = selectedServiceCode === "traffic";
	const isPspService = selectedServiceCode === "psp";
	const isShahkarService = selectedServiceCode === "shahkar";
	const supportsOperatorLanguageAggregationFilter = supportsOperatorLanguageAggregation(selectedServiceCode);
	const requiresCompanyType = isSmsService || isPspService || isTrafficService;
	const supportsContractType = isSmsService || isTrafficService;
	const isAuditColumnsDisabled = selectedAggregation.length > 0;
	const isTrafficCp = isTrafficService && String(selectedCompanyType ?? "").trim().toUpperCase() === "CP";
	const isBaseUnitHidden = !selectedFinancialColumns.includes("showBaseUnit");
	const hasDefaultConversionRatio = defaultConversionRatio != null;
	const isDefaultConversionRatioInvalid = isTrafficCp && isBaseUnitHidden && hasDefaultConversionRatio && !isValidDefaultConversionRatio(defaultConversionRatio);

	const availablePeriods = useMemo(() => {
		const fromApi = availabilityBase.data?.periods ?? [];
		const dedup = new Set<string>();
		fromApi.forEach((item) => {
			const parsed = parsePeriod(String(item ?? ""));
			if (!parsed)
				return;
			dedup.add(parsed.period);
		});
		return sortPeriods(Array.from(dedup));
	}, [availabilityBase.data]);

	const yearOptions = useMemo(() => {
		const years = new Set<number>();
		availablePeriods.forEach((period) => {
			const parsed = parsePeriod(period);
			if (!parsed)
				return;
			years.add(parsed.year);
		});
		return Array.from(years)
			.sort((a, b) => b - a)
			.map(year => ({ label: String(year), value: year }));
	}, [availablePeriods]);

	const periodOptions = useMemo<ReportSelectOption[]>(() => {
		if (!selectedYear)
			return [];

		return availablePeriods.reduce<ReportSelectOption[]>((acc, period) => {
			const parsed = parsePeriod(period);
			if (!parsed || parsed.year !== selectedYear)
				return acc;

			const displayMonth = getReportDisplayMonth(parsed.month, selectedPeriodType);
			const monthName = t(`performance.months.${displayMonth}`);
			acc.push({
				value: parsed.period,
				label: `${monthName} (${parsed.year}/${parsed.month})`,
			});
			return acc;
		}, []);
	}, [availablePeriods, selectedYear, selectedPeriodType, t]);

	const availableCompanyIds = useMemo(() => {
		if (selectedPeriods.length > 0) {
			return availabilityByPeriods.data?.company_ids ?? [];
		}
		return availabilityBase.data?.company_ids ?? [];
	}, [selectedPeriods.join(","), availabilityBase.data, availabilityByPeriods.data]);

	const companyTypeOptions = useMemo<ReportSelectOption[]>(
		() => {
			if (!requiresCompanyType || !selectedServiceId)
				return [];

			return getPermittedCompanyTypes("performances", "view", selectedServiceId)
				.map(item => ({ label: item.value, value: item.key }));
		},
		[requiresCompanyType, selectedServiceId, getPermittedCompanyTypes],
	);

	useEffect(() => {
		if (!requiresCompanyType || !selectedCompanyType)
			return;

		if (companyTypeOptions.some(option => String(option.value) === selectedCompanyType))
			return;

		setSelectedCompanyType(null);
		setSelectedCompanyIds([]);
		setSummary(null);
		formRef.current?.setFieldsValue({
			company_type: undefined,
			company_ids: undefined,
		});
	}, [requiresCompanyType, selectedCompanyType, companyTypeOptions]);

	const companyOptions = useMemo(() => {
		if (!selectedServiceId)
			return [];
		if (selectedPeriods.length > 0 && !availabilityByPeriods.data)
			return [];
		if (selectedPeriods.length === 0 && !availabilityBase.data)
			return [];

		const companiesList = companies.data?.results ?? [];
		const availableSet = new Set(availableCompanyIds.map(id => Number(id)));
		return companiesList
			.filter(company => availableSet.has(Number(company.id)))
			.filter(company => !requiresCompanyType || !selectedCompanyType || companyTypeMatches(company.company_type, selectedCompanyType))
			.map(company => ({
				label: company.name,
				value: company.id,
			}));
	}, [
		selectedServiceId,
		selectedPeriods.join(","),
		availabilityBase.data,
		availabilityByPeriods.data,
		companies.data,
		availableCompanyIds.join(","),
		requiresCompanyType,
		selectedCompanyType,
	]);

	const contractTypeOptions = useMemo<ReportSelectOption[]>(() => ([
		{ label: t("performance.contractType.all"), value: "all" },
		{ label: t("performance.contractType.official"), value: "official" },
		{ label: t("performance.contractType.unofficial"), value: "unofficial" },
	]), [t]);
	const smsReportTypeOptions = useMemo<ReportSelectOption[]>(() => ([
		{ label: t("performance.smsReportType.normal"), value: "normal" },
		{ label: t("performance.smsReportType.finance"), value: "finance" },
		{ label: t("performance.smsReportType.summary"), value: "summary" },
	]), [t]);
	const periodTypeOptions = useMemo<ReportSelectOption[]>(() => ([
		{ label: t("performance.periodType.sh"), value: "sh" },
		{ label: t("performance.periodType.fiscal"), value: "fiscal" },
	]), [t]);
	const aggregationOptions = useMemo<ReportSelectOption[]>(() => {
		const options: ReportSelectOption[] = [
			{ label: t("performance.aggregation.byCompany"), value: "by_company" },
			{ label: t("performance.aggregation.byMonth"), value: "by_month" },
		];
		if (supportsOperatorLanguageAggregationFilter) {
			options.push(
				{ label: t("performance.aggregation.byOperator"), value: "by_operator" },
				{ label: t("performance.aggregation.byLanguage"), value: "by_language" },
			);
		}
		return options;
	}, [supportsOperatorLanguageAggregationFilter, t]);

	const allowedAggregationKeys = useMemo(
		() => getAllowedAggregationKeys(selectedServiceCode),
		[selectedServiceCode],
	);

	useEffect(() => {
		setSelectedAggregation((prev) => {
			const next = filterAggregationKeys(prev, allowedAggregationKeys);
			if (next.join(",") === prev.join(","))
				return prev;

			formRef.current?.setFieldsValue({
				aggregation: next.length > 0 ? next : undefined,
			});
			return next;
		});
	}, [allowedAggregationKeys.join(",")]);

	useEffect(() => {
		if (!isAuditColumnsDisabled || selectedAuditColumns.length === 0)
			return;

		setSelectedAuditColumns([]);
		formRef.current?.setFieldsValue({
			audit_columns: undefined,
		});
	}, [isAuditColumnsDisabled, selectedAuditColumns.length]);

	const financialColumnOptions = useMemo<ReportSelectOption[]>(() => {
		const rialOption = { label: t("performance.columns.rial"), value: "rial" };
		if (isSmsCommissionService) {
			return [
				rialOption,
				{ label: t("performance.columns.unitPrice"), value: "unitPrice" },
				{ label: t("performance.columns.karashabIncome"), value: "karashabIncome" },
				{ label: t("performance.columns.karashabExpense"), value: "karashabExpense" },
				{ label: t("performance.columns.karashabProfit"), value: "karashabProfit" },
				{ label: t("performance.columns.telecomIncome"), value: "telecomIncome" },
				{ label: t("performance.columns.firstPartyIncome"), value: "firstPartyIncome" },
				{ label: t("performance.columns.regionIncome"), value: "regionIncome" },
				{ label: t("performance.columns.salesAgentIncome"), value: "salesAgentIncome" },
				{ label: t("performance.columns.total"), value: "total" },
			];
		}
		if (isOpenApiService) {
			return [
				rialOption,
				{ label: t("performance.columns.income"), value: "income" },
				{ label: t("performance.columns.expense"), value: "expense" },
				{ label: t("performance.columns.profit"), value: "profit" },
				{ label: t("performance.columns.total"), value: "total" },
			];
		}
		if (isPspService) {
			return [
				rialOption,
				{ label: t("performance.columns.income"), value: "income" },
				{ label: t("performance.columns.expense"), value: "expense" },
				{ label: t("performance.columns.profit"), value: "profit" },
				{ label: t("performance.columns.total"), value: "total" },
			];
		}
		if (isShahkarService) {
			return [
				rialOption,
				{ label: t("performance.columns.income"), value: "income" },
				{ label: t("performance.columns.expense"), value: "expense" },
				{ label: t("performance.columns.profit"), value: "profit" },
				{ label: t("performance.columns.total"), value: "total" },
			];
		}
		if (isTrafficService) {
			const options: ReportSelectOption[] = [
				rialOption,
				{ label: t("performance.columns.income"), value: "income" },
				{ label: t("performance.columns.expense"), value: "expense" },
				{ label: t("performance.columns.profit"), value: "profit" },
				{ label: t("performance.columns.contractType"), value: "contractType" },
				{ label: t("performance.columns.total"), value: "total" },
			];
			if (isTrafficCp) {
				return [
					{ label: t("performance.columns.showBaseUnit"), value: "showBaseUnit" },
					...options,
				];
			}
			return options;
		}
		if (isSmsService && selectedSmsReportType === "finance") {
			return [
				rialOption,
				{ label: t("performance.columns.income"), value: "income" },
				{ label: t("performance.columns.total"), value: "total" },
			];
		}
		const options: ReportSelectOption[] = [
			rialOption,
			{ label: t("performance.columns.income"), value: "income" },
			{ label: t("performance.columns.expense"), value: "expense" },
			{ label: t("performance.columns.profit"), value: "profit" },
		];
		if (supportsContractType)
			options.push({ label: t("performance.columns.contractType"), value: "contractType" });
		options.push({ label: t("performance.columns.total"), value: "total" });
		return options;
	}, [isOpenApiService, isPspService, isShahkarService, isTrafficService, isTrafficCp, isSmsCommissionService, isSmsService, selectedSmsReportType, supportsContractType, t]);

	const auditColumnOptions = useMemo<ReportSelectOption[]>(() => ([
		{ label: t("performance.columns.createdByUser"), value: "createdByUser" },
		{ label: t("performance.columns.updatedByUser"), value: "updatedByUser" },
	]), [t]);

	useEffect(() => {
		setSelectedFinancialColumns((prev) => {
			const hasShowBaseUnit = prev.includes("showBaseUnit");
			if (isTrafficCp) {
				if (hasShowBaseUnit)
					return prev;
				const next = ["showBaseUnit", ...prev] as ReportFinancialColumnKey[];
				formRef.current?.setFieldsValue({ financial_columns: next });
				return next;
			}

			if (!hasShowBaseUnit)
				return prev;
			const next = prev.filter(key => key !== "showBaseUnit");
			formRef.current?.setFieldsValue({ financial_columns: next });
			return next;
		});

		if (isTrafficCp)
			return;

		setDefaultConversionRatio(null);
		setDebouncedDefaultConversionRatio(null);
		formRef.current?.setFieldsValue({ default_conversion_ratio: undefined });
	}, [isTrafficCp]);

	useEffect(() => {
		if (isDefaultConversionRatioInvalid)
			return;

		const timeoutId = window.setTimeout(() => {
			setDebouncedDefaultConversionRatio(defaultConversionRatio);
		}, 500);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [defaultConversionRatio, isDefaultConversionRatioInvalid]);

	const selectedFinancialColumnTitles = useMemo(() => {
		const titles: Partial<Record<ReportFinancialColumnKey, string>> = {};
		selectedFinancialColumns.forEach((key) => {
			if (key === "income")
				titles.income = t("performance.columns.income");
			if (key === "expense")
				titles.expense = t("performance.columns.expense");
			if (key === "profit")
				titles.profit = t("performance.columns.profit");
			if (key === "total")
				titles.total = t("performance.columns.total");
			if (key === "contractType")
				titles.contractType = t("performance.columns.contractType");
			if (key === "showBaseUnit")
				titles.showBaseUnit = t("performance.columns.showBaseUnit");
			if (key === "rial")
				titles.rial = t("performance.columns.rial");
			if (key === "unitPrice")
				titles.unitPrice = t("performance.columns.unitPrice");
			if (key === "karashabIncome")
				titles.karashabIncome = t("performance.columns.karashabIncome");
			if (key === "karashabExpense")
				titles.karashabExpense = t("performance.columns.karashabExpense");
			if (key === "karashabProfit")
				titles.karashabProfit = t("performance.columns.karashabProfit");
			if (key === "telecomIncome")
				titles.telecomIncome = t("performance.columns.telecomIncome");
			if (key === "firstPartyIncome")
				titles.firstPartyIncome = t("performance.columns.firstPartyIncome");
			if (key === "regionIncome")
				titles.regionIncome = t("performance.columns.regionIncome");
			if (key === "salesAgentIncome")
				titles.salesAgentIncome = t("performance.columns.salesAgentIncome");
		});
		return titles;
	}, [selectedFinancialColumns, t]);

	const setSelectedService = (serviceId: number | null, serviceCode: string | null) => {
		const normalizedServiceCode = serviceCode ? normalizeServiceCode(serviceCode) : null;
		const nextIsSmsService = normalizedServiceCode === "sms";
		const nextIsSmsCommissionService = normalizedServiceCode === "sms-commission" || normalizedServiceCode === "sms_commission";
		const nextIsOpenApiService = normalizedServiceCode === "openapi";
		const nextIsPspService = normalizedServiceCode === "psp";
		const nextIsShahkarService = normalizedServiceCode === "shahkar";
		const nextIsTrafficService = normalizedServiceCode === "traffic";
		const nextSmsReportType: SmsReportType = "normal";
		const nextFinancialColumns = nextIsSmsCommissionService
			? SMS_COMMISSION_FINANCIAL_COLUMNS
			: nextIsSmsService
				? getSmsFinancialDefaults(nextSmsReportType)
				: nextIsOpenApiService
					? OPENAPI_FINANCIAL_COLUMNS
					: nextIsPspService
						? PSP_FINANCIAL_COLUMNS
						: nextIsShahkarService
							? SHAHKAR_FINANCIAL_COLUMNS
							: nextIsTrafficService
								? TRAFFIC_FINANCIAL_COLUMNS
								: DEFAULT_FINANCIAL_COLUMNS;

		setSelectedServiceId(serviceId);
		setSelectedServiceCode(normalizedServiceCode);
		setSelectedYear(null);
		setSelectedPeriods([]);
		setSelectedCompanyIds([]);
		setSelectedSmsReportType(nextSmsReportType);
		setSelectedCompanyType(null);
		setSelectedContractType("all");
		setSelectedFinancialColumns(nextFinancialColumns);
		setSelectedAuditColumns([]);
		setSelectedAggregation([]);
		setDefaultConversionRatio(null);
		setDebouncedDefaultConversionRatio(null);
		setSummary(null);

		formRef.current?.setFieldsValue({
			sh_year: undefined,
			sh_periods: undefined,
			company_ids: undefined,
			company_type: undefined,
			sms_report_type: nextSmsReportType,
			is_official: "all",
			financial_columns: nextFinancialColumns,
			audit_columns: undefined,
			aggregation: [],
			default_conversion_ratio: undefined,
		});
	};

	const handleYearChange = (year: number | null) => {
		setSelectedYear(year);
		setSelectedPeriods([]);
		setSelectedCompanyIds([]);
		setSummary(null);
		formRef.current?.setFieldsValue({
			sh_year: year ?? undefined,
			sh_periods: undefined,
			company_ids: undefined,
		});
	};

	const handlePeriodsChange = (periods: string[]) => {
		setSelectedPeriods(periods);
		setSelectedCompanyIds([]);
		setSummary(null);
		formRef.current?.setFieldsValue({
			sh_periods: periods.length > 0 ? periods : undefined,
			company_ids: undefined,
		});
	};

	const handleCompanyIdsChange = (companyIds: number[]) => {
		setSelectedCompanyIds(companyIds);
		setSummary(null);
		formRef.current?.setFieldsValue({
			company_ids: companyIds.length > 0 ? companyIds : undefined,
		});
	};

	const handleCompanyTypeChange = (value: CompanyType | null) => {
		setSelectedCompanyType(value);
		setSelectedCompanyIds([]);
		setSummary(null);
		formRef.current?.setFieldsValue({
			company_type: value ?? undefined,
			company_ids: undefined,
		});
	};

	const handleSmsReportTypeChange = (reportType: SmsReportType) => {
		const nextColumns = getSmsFinancialDefaults(reportType);
		setSelectedSmsReportType(reportType);
		setSelectedFinancialColumns(nextColumns);
		formRef.current?.setFieldsValue({
			sms_report_type: reportType,
			financial_columns: nextColumns,
		});
	};

	const handleContractTypeChange = (value: SmsContractTypeFilter) => {
		setSelectedContractType(value);
		formRef.current?.setFieldsValue({
			is_official: value,
		});
	};

	const handlePeriodTypeChange = (value: PeriodType) => {
		setSelectedPeriodType(value);
		setSelectedYear(null);
		setSelectedPeriods([]);
		setSelectedCompanyIds([]);
		setSummary(null);
		formRef.current?.setFieldsValue({
			period_type: value,
			sh_year: undefined,
			sh_periods: undefined,
			company_ids: undefined,
		});
	};

	const handleFinancialColumnsChange = (columns: ReportFinancialColumnKey[]) => {
		let fallback = DEFAULT_FINANCIAL_COLUMNS;
		if (isSmsCommissionService)
			fallback = SMS_COMMISSION_FINANCIAL_COLUMNS;
		else if (isSmsService)
			fallback = getSmsFinancialDefaults(selectedSmsReportType);
		else if (isOpenApiService)
			fallback = OPENAPI_FINANCIAL_COLUMNS;
		else if (isPspService)
			fallback = PSP_FINANCIAL_COLUMNS;
		else if (isShahkarService)
			fallback = SHAHKAR_FINANCIAL_COLUMNS;
		else if (isTrafficService)
			fallback = isTrafficCp ? TRAFFIC_CP_FINANCIAL_COLUMNS : TRAFFIC_FINANCIAL_COLUMNS;

		const nextColumns = columns.length > 0 ? columns : fallback;
		const shouldClearDefaultConversionRatio = !selectedFinancialColumns.includes("showBaseUnit") && nextColumns.includes("showBaseUnit");
		setSelectedFinancialColumns(nextColumns);
		if (shouldClearDefaultConversionRatio) {
			setDefaultConversionRatio(null);
			setDebouncedDefaultConversionRatio(null);
			formRef.current?.setFieldsValue({
				default_conversion_ratio: undefined,
			});
		}
	};

	const handleAuditColumnsChange = (columns: ReportAuditColumnKey[]) => {
		setSelectedAuditColumns(columns);
		formRef.current?.setFieldsValue({
			audit_columns: columns.length > 0 ? columns : undefined,
		});
	};

	const handleAggregationChange = (values: ReportAggregationKey[]) => {
		setSelectedAggregation(values);
		setSummary(null);
		if (values.length > 0) {
			setSelectedAuditColumns([]);
			formRef.current?.setFieldsValue({
				aggregation: values,
				audit_columns: undefined,
			});
			return;
		}
		formRef.current?.setFieldsValue({
			aggregation: undefined,
		});
	};

	const isPeriodDisabled = !selectedServiceId || !selectedYear || availabilityBase.isLoading;
	const isCompanyDisabled = !selectedServiceId || selectedPeriods.length === 0 || companies.isLoading || (selectedPeriods.length > 0 && availabilityByPeriods.isFetching) || (requiresCompanyType && !selectedCompanyType);

	const columns: ProColumns<PerformanceReportRow>[] = useMemo(() => {
		return getPerformanceReportColumns({
			t,
			selectedServiceCode,
			selectedServiceId,
			selectedServiceName,
			serviceOptions,
			yearOptions,
			periodOptions,
			companyOptions,
			companyTypeOptions,
			contractTypeOptions,
			smsReportTypeOptions,
			periodTypeOptions,
			financialColumnOptions,
			auditColumnOptions,
			aggregationOptions,
			selectedPeriods,
			selectedCompanyIds,
			selectedFinancialColumns,
			selectedAuditColumns,
			defaultConversionRatio,
			isDefaultConversionRatioInvalid,
			isAuditColumnsDisabled,
			selectedAggregation,
			selectedSmsReportType,
			selectedPeriodType,
			selectedCompanyType,
			isSmsService,
			isSmsCommissionService,
			isTrafficService,
			supportsOperatorLanguageAggregation: supportsOperatorLanguageAggregationFilter,
			requiresCompanyType,
			isPeriodDisabled,
			isCompanyDisabled,
			onServiceChange: setSelectedService,
			onYearChange: handleYearChange,
			onPeriodsChange: handlePeriodsChange,
			onCompanyIdsChange: handleCompanyIdsChange,
			onCompanyTypeChange: handleCompanyTypeChange,
			onContractTypeChange: handleContractTypeChange,
			onSmsReportTypeChange: handleSmsReportTypeChange,
			onPeriodTypeChange: handlePeriodTypeChange,
			onFinancialColumnsChange: handleFinancialColumnsChange,
			onAuditColumnsChange: handleAuditColumnsChange,
			onDefaultConversionRatioChange: setDefaultConversionRatio,
			onAggregationChange: handleAggregationChange,
		});
	}, [
		t,
		selectedServiceCode,
		selectedServiceId,
		selectedServiceName,
		serviceOptions,
		yearOptions,
		periodOptions,
		companyOptions,
		companyTypeOptions,
		contractTypeOptions,
		smsReportTypeOptions,
		periodTypeOptions,
		financialColumnOptions,
		auditColumnOptions,
		aggregationOptions,
		selectedPeriods,
		selectedCompanyIds,
		selectedFinancialColumns,
		selectedAuditColumns,
		defaultConversionRatio,
		isDefaultConversionRatioInvalid,
		isAuditColumnsDisabled,
		selectedAggregation,
		selectedSmsReportType,
		selectedPeriodType,
		selectedCompanyType,
		isSmsService,
		isSmsCommissionService,
		isTrafficService,
		supportsOperatorLanguageAggregationFilter,
		requiresCompanyType,
		isPeriodDisabled,
		isCompanyDisabled,
	]);

	const getMonthLabel = useCallback((month: unknown) => {
		const numericMonth = Number(month);
		return MONTH_OPTIONS.find(item => item.value === numericMonth)?.label ?? String(month ?? "-");
	}, []);

	const getOperationTypeLabel = useCallback((operationType: unknown) => {
		const value = String(operationType ?? "").trim().toUpperCase();
		if (value === "BILL_INQUIRY")
			return t("performance.operationType.billInquiry");
		if (value === "RECEIPT_REGISTER")
			return t("performance.operationType.receiptRegister");
		return String(operationType ?? "-");
	}, [t]);

	const buildReportQuery = useCallback((page: number, pageSize: number, total?: boolean) => {
		if (!selectedServiceId || !selectedServiceCode)
			return null;

		const includeTotals = total ?? selectedFinancialColumns.includes("total");

		const formValues = formRef.current?.getFieldsValue?.(true) as Record<string, unknown> | undefined;
		const periods = normalizePeriods(formValues?.sh_periods ?? selectedPeriods);
		if (periods.length === 0)
			return null;

		const companyIds = normalizeNumberList(formValues?.company_ids ?? selectedCompanyIds);
		const companyType = requiresCompanyType
			? (formValues?.company_type == null || formValues.company_type === "" ? undefined : String(formValues.company_type))
			: undefined;
		const contractType = String(formValues?.is_official ?? selectedContractType ?? "all") as SmsContractTypeFilter;
		const isOfficial = contractType === "official" ? true : contractType === "unofficial" ? false : undefined;
		const ratioRaw = formValues?.default_conversion_ratio ?? defaultConversionRatio;
		const ratio = ratioRaw == null || ratioRaw === "" ? null : Number(ratioRaw);
		const isBaseUnitHidden = !selectedFinancialColumns.includes("showBaseUnit");
		if (isTrafficCp && isBaseUnitHidden && ratio != null && !isValidDefaultConversionRatio(ratio)) {
			window.$message?.warning(t("performance.validation.traffic.conversionRatioRange"));
			return null;
		}
		const shouldSendDefaultConversionRatio = isTrafficCp && isBaseUnitHidden && isValidDefaultConversionRatio(ratio);
		const payloadDefaultConversionRatio = shouldSendDefaultConversionRatio ? Number(ratio) : undefined;

		const periodsKey = selectedPeriodType === "fiscal" ? "fiscal_periods" : "sh_periods";

		return {
			service_id: selectedServiceId,
			service_code: selectedServiceCode,
			[periodsKey]: periods.join(","),
			company_ids: isSmsService ? undefined : companyIds.length > 0 ? companyIds.join(",") : undefined,
			company_type: companyType,
			is_official: supportsContractType ? isOfficial : undefined,
			default_conversion_ratio: payloadDefaultConversionRatio,
			...buildReportAggregationParams(selectedAggregation),
			page,
			page_size: pageSize,
			total: includeTotals,
		};
	}, [defaultConversionRatio, isSmsService, isTrafficCp, requiresCompanyType, selectedAggregation, selectedCompanyIds, selectedContractType, selectedFinancialColumns, selectedPeriods, selectedServiceId, selectedServiceCode, selectedPeriodType, supportsContractType, t]);

	const getOperatorLabel = useCallback((operator: unknown) => {
		const value = String(operator ?? "").trim().toUpperCase();
		if (!value)
			return "-";
		if (value === "IRANCELL")
			return t("performance.operator.irancell");
		if (value === "MCI")
			return t("performance.operator.mci");
		if (value === "OTHER")
			return t("performance.operator.other");
		return String(operator);
	}, [t]);

	const getLanguageLabel = useCallback((language: unknown) => {
		const value = String(language ?? "").trim().toUpperCase();
		if (!value)
			return "-";
		if (value === "FA")
			return t("performance.language.fa");
		if (value === "EN")
			return t("performance.language.en");
		return String(language);
	}, [t]);

	const getCompanyTypeLabel = useCallback((companyType: unknown) => {
		const token = pickCompanyTypeToken(companyType);
		if (!token)
			return "-";
		return companyTypeOptions.find(option => String(option.value) === token)?.label ?? token;
	}, [companyTypeOptions]);

	const getTrafficLocationLabel = useCallback((location: unknown) => {
		const key = String(location ?? "").trim().toUpperCase();
		if (!key)
			return "-";
		if (key === "TEHRAN")
			return t("performance.traffic.locations.tehran");
		if (key === "COUNTY")
			return t("performance.traffic.locations.county");
		return String(location);
	}, [t]);

	const reportYearTitle = selectedPeriodType === "fiscal"
		? t("performance.columns.fiscalYear")
		: t("performance.columns.year");
	const reportMonthTitle = selectedPeriodType === "fiscal"
		? t("performance.columns.fiscalMonth")
		: t("performance.columns.month");

	const reportServiceLayout = getReportServiceLayout(selectedServiceCode);
	const trafficLayout = isTrafficService
		? getTrafficReportLayout(selectedCompanyType)
		: getTrafficReportLayout(null);

	const effectiveAuditColumns = !selectedServiceId || isAuditColumnsDisabled ? [] : selectedAuditColumns;

	const exportColumns = useMemo(() => {
		return createPerformanceReportExportColumns({
			layout: reportServiceLayout,
			idTitle: t("performance.columns.id"),
			serviceNameTitle: t("performance.columns.serviceName"),
			serviceNameFallback: selectedServiceName,
			companyNameTitle: t("performance.columns.companyName"),
			companyTypeTitle: t("performance.columns.companyType"),
			yearTitle: reportYearTitle,
			monthTitle: reportMonthTitle,
			operationTypeTitle: t("performance.columns.operationType"),
			operatorTitle: t("performance.columns.operator"),
			languageTitle: t("performance.columns.language"),
			countTitle: t("performance.columns.count"),
			unitPriceTitle: t("performance.columns.unitPrice"),
			incomeTitle: t("performance.columns.income"),
			expenseTitle: t("performance.columns.expense"),
			profitTitle: t("performance.columns.profit"),
			totalTitle: t("performance.columns.total"),
			contractTypeTitle: t("performance.columns.contractType"),
			karashabIncomeTitle: t("performance.columns.karashabIncome"),
			karashabExpenseTitle: t("performance.columns.karashabExpense"),
			karashabProfitTitle: t("performance.columns.karashabProfit"),
			telecomIncomeTitle: t("performance.columns.telecomIncome"),
			firstPartyIncomeTitle: t("performance.columns.firstPartyIncome"),
			regionIncomeTitle: t("performance.columns.regionIncome"),
			salesAgentTitle: t("performance.columns.salesAgent"),
			salesAgentIncomeTitle: t("performance.columns.salesAgentIncome"),
			contractUnitTitle: t("performance.columns.contractUnit"),
			positionTitle: t("performance.columns.position"),
			sentTrafficTitle: t("performance.fields.traffic.sentTraffic"),
			receivedTrafficTitle: t("performance.fields.traffic.receivedTraffic"),
			sentTrafficGbMonthTitle: t("performance.fields.traffic.sentTrafficWithUnit", { unit: "GB/month", interpolation: { escapeValue: false } }),
			receivedTrafficGbMonthTitle: t("performance.fields.traffic.receivedTrafficWithUnit", { unit: "GB/month", interpolation: { escapeValue: false } }),
			sentTrafficMbpsTitle: t("performance.fields.traffic.sentTrafficWithUnit", { unit: "Mbps" }),
			receivedTrafficMbpsTitle: t("performance.fields.traffic.receivedTrafficWithUnit", { unit: "Mbps" }),
			conversionRatioTitle: t("performance.columns.conversionRatio"),
			datacenterTitle: t("performance.columns.datacenter"),
			partnerTypeTitle: t("performance.columns.partnerType"),
			rackHalfCountTitle: t("performance.columns.rackHalfCount"),
			ipCountTitle: t("performance.columns.ipCount"),
			portCountTitle: t("performance.columns.portCount"),
			bandwidthUsedTitle: t("performance.columns.bandwidthUsed"),
			ampereUsedTitle: t("performance.columns.ampereUsed"),
			rackHalfIncomeTitle: t("performance.columns.rackHalfIncome"),
			rackIncomeTitle: t("performance.columns.rackIncome"),
			ipIncomeTitle: t("performance.columns.ipIncome"),
			portIncomeTitle: t("performance.columns.portIncome"),
			bandwidthIncomeTitle: t("performance.columns.bandwidthIncome"),
			ampereIncomeTitle: t("performance.columns.ampereIncome"),
			trafficLocationLabelByValue: getTrafficLocationLabel,
			trafficLayout,
			periodType: selectedPeriodType,
			selectedAuditColumns: effectiveAuditColumns,
			createdByUserTitle: t("performance.columns.createdByUser"),
			updatedByUserTitle: t("performance.columns.updatedByUser"),
			monthNameByValue: getMonthLabel,
			operationTypeLabelByValue: getOperationTypeLabel,
			operatorLabelByValue: getOperatorLabel,
			languageLabelByValue: getLanguageLabel,
			companyTypeLabelByValue: getCompanyTypeLabel,
			contractTypeLabelByValue: (isOfficial) => {
				if (isOfficial === true)
					return t("performance.contractType.official");
				if (isOfficial === false)
					return t("performance.contractType.unofficial");
				return "-";
			},
			financialColumnTitles: selectedFinancialColumnTitles,
			hideCompanyColumn: selectedAggregation.includes("by_company"),
			hideMonthColumn: selectedAggregation.includes("by_month"),
			showOperatorLanguageColumns: supportsOperatorLanguageAggregationFilter,
			hideOperatorColumn: selectedAggregation.includes("by_operator"),
			hideLanguageColumn: selectedAggregation.includes("by_language"),
		});
	}, [
		getCompanyTypeLabel,
		getLanguageLabel,
		getMonthLabel,
		getOperationTypeLabel,
		getOperatorLabel,
		getTrafficLocationLabel,
		reportYearTitle,
		reportMonthTitle,
		reportServiceLayout,
		trafficLayout,
		selectedServiceName,
		selectedPeriodType,
		effectiveAuditColumns,
		selectedAggregation,
		selectedFinancialColumnTitles,
		supportsOperatorLanguageAggregationFilter,
		t,
	]);

	const fetchAllRowsForExport = useCallback(async () => {
		const initialQuery = buildReportQuery(1, 500);
		if (!initialQuery) {
			window.$message?.warning(t("performance.messages.selectReportFiltersFirst"));
			return null;
		}

		const firstResponse = await fetchPerformanceReport(initialQuery);
		const rows = [...firstResponse.results];
		const totalCount = Number(firstResponse.count ?? rows.length);
		const totalPages = Math.max(1, Math.ceil(totalCount / 500));

		for (let page = 2; page <= totalPages; page++) {
			const query = buildReportQuery(page, 500, false);
			if (!query)
				break;
			const response = await fetchPerformanceReport(query);
			rows.push(...response.results);
		}

		if (rows.length === 0) {
			window.$message?.warning(t("performance.messages.noReportData"));
			return null;
		}

		return {
			rows,
			summary: firstResponse.totals ?? summary,
		};
	}, [buildReportQuery, summary, t]);

	const handleDownloadExcel = useCallback(async () => {
		const exportData = await fetchAllRowsForExport();
		if (!exportData)
			return;

		const currencyValue = selectedFinancialColumns.includes("rial")
			? t("performance.columns.rial")
			: t("performance.columns.toman");

		downloadPerformanceReportExcel({
			filename: `performance-report-${new Date().toISOString().slice(0, 10)}.xls`,
			title: t("performance.titles.performanceReport"),
			serviceLabel: t("performance.columns.service"),
			serviceName: selectedServiceName,
			currencyLabel: t("performance.labels.currencyUnit"),
			currencyValue,
			rows: exportData.rows,
			columns: exportColumns,
			summary: exportData.summary,
			financialColumnTitles: selectedFinancialColumnTitles,
		});
	}, [exportColumns, fetchAllRowsForExport, selectedFinancialColumnTitles, selectedFinancialColumns, selectedServiceName, t]);

	const handleDownloadPdf = useCallback(async () => {
		const exportData = await fetchAllRowsForExport();
		if (!exportData)
			return;

		const currencyValue = selectedFinancialColumns.includes("rial")
			? t("performance.columns.rial")
			: t("performance.columns.toman");

		try {
			openPerformanceReportPdfPrint({
				title: t("performance.titles.performanceReport"),
				serviceLabel: t("performance.columns.service"),
				serviceName: selectedServiceName,
				currencyLabel: t("performance.labels.currencyUnit"),
				currencyValue,
				rows: exportData.rows,
				columns: exportColumns,
				summary: exportData.summary,
				financialColumnTitles: selectedFinancialColumnTitles,
			});
		}
		catch {
			window.$message?.warning(t("performance.messages.popupBlocked"));
		}
	}, [exportColumns, fetchAllRowsForExport, selectedFinancialColumnTitles, selectedFinancialColumns, selectedServiceName, t]);

	const canExport = !!selectedServiceId && !!selectedServiceCode && selectedPeriods.length > 0 && !isDefaultConversionRatioInvalid;
	const reportReloadFinancialColumnsKey = selectedFinancialColumns
		.filter(column => column !== "rial")
		.join(",");

	const reportFilterKey = [
		selectedServiceId,
		selectedServiceCode,
		selectedPeriods.join(","),
		selectedCompanyIds.join(","),
		selectedCompanyType,
		selectedContractType,
		selectedPeriodType,
		selectedAggregation.join(","),
		reportReloadFinancialColumnsKey,
		selectedSmsReportType,
	].join("|");

	useEffect(() => {
		actionRef.current?.reload?.();
	}, [reportFilterKey]);

	const reportTitle = selectedServiceName
		? `${t("performance.titles.performanceReport")} - ${selectedServiceName}`
		: t("performance.titles.performanceReport");

	return (
		<BasicContent className="h-full">
			<BasicTable<PerformanceReportRow>
				rowKey={record => String(record.id)}
				columns={columns}
				actionRef={actionRef}
				formRef={formRef}
				autoSearchDebounceTime={800}
				search={{
					defaultCollapsed: false,
				}}
				form={{
					initialValues: {
						financial_columns: DEFAULT_FINANCIAL_COLUMNS,
						audit_columns: undefined,
						sms_report_type: "normal",
						period_type: "sh",
						company_type: undefined,
						is_official: "all",
						aggregation: [],
						default_conversion_ratio: undefined,
					},
				}}
				request={async (params) => {
					if (!selectedServiceId || !selectedServiceCode) {
						setSummary(null);
						return {
							data: [],
							total: 0,
							success: true,
						};
					}

					const periods = normalizePeriods(selectedPeriods);
					if (periods.length === 0) {
						setSummary(null);
						return {
							data: [],
							total: 0,
							success: true,
						};
					}

					if (requiresCompanyType && !selectedCompanyType) {
						setSummary(null);
						return {
							data: [],
							total: 0,
							success: true,
						};
					}

					const companyIds = normalizeNumberList(selectedCompanyIds);
					const companyType = requiresCompanyType ? selectedCompanyType ?? undefined : undefined;
					const contractType = selectedContractType;
					const isOfficial = contractType === "official" ? true : contractType === "unofficial" ? false : undefined;
					const isBaseUnitHidden = !selectedFinancialColumns.includes("showBaseUnit");
					if (isTrafficCp && isBaseUnitHidden && isDefaultConversionRatioInvalid) {
						return {
							data: [],
							total: 0,
							success: true,
						};
					}
					const shouldSendDefaultConversionRatio = isTrafficCp && isBaseUnitHidden && isValidDefaultConversionRatio(debouncedDefaultConversionRatio);
					const payloadDefaultConversionRatio = shouldSendDefaultConversionRatio ? Number(debouncedDefaultConversionRatio) : undefined;

					const includeTotals = selectedFinancialColumns.includes("total");

					const response = await fetchPerformanceReport({
						service_id: selectedServiceId,
						service_code: selectedServiceCode,
						[selectedPeriodType === "fiscal" ? "fiscal_periods" : "sh_periods"]: periods.join(","),
						company_ids: isSmsService ? undefined : companyIds.length > 0 ? companyIds.join(",") : undefined,
						company_type: companyType,
						is_official: supportsContractType ? isOfficial : undefined,
						default_conversion_ratio: payloadDefaultConversionRatio,
						...buildReportAggregationParams(selectedAggregation),
						page: params.current ?? 1,
						page_size: params.pageSize ?? 20,
						total: includeTotals,
					});

					setSummary(includeTotals ? response.totals ?? null : null);

					return {
						data: response.results,
						total: response.count,
						success: true,
					};
				}}
				headerTitle={reportTitle}
				toolBarRender={() => {
					const items: React.ReactNode[] = [];
					const showReportSummary = selectedFinancialColumns.includes("total") && summary;
					const showRial = selectedFinancialColumns.includes("rial");

					if (showReportSummary) {
						const summaryFields: React.ReactNode[] = [];

						if (selectedFinancialColumnTitles.total) {
							summaryFields.push(
								<Typography.Text key="total">{`${selectedFinancialColumnTitles.total}: ${formatSummaryNumber(summary.value)}`}</Typography.Text>,
							);
						}
						if (selectedFinancialColumnTitles.income) {
							summaryFields.push(
								<Typography.Text key="income">{`${selectedFinancialColumnTitles.income}: ${formatSummaryMoney(summary.income_financial, showRial)}`}</Typography.Text>,
							);
						}
						if (selectedFinancialColumnTitles.expense) {
							summaryFields.push(
								<Typography.Text key="expense">{`${selectedFinancialColumnTitles.expense}: ${formatSummaryMoney(summary.expense_financial, showRial)}`}</Typography.Text>,
							);
						}
						if (selectedFinancialColumnTitles.profit) {
							summaryFields.push(
								<Typography.Text key="profit">{`${selectedFinancialColumnTitles.profit}: ${formatSummaryMoney(summary.profit_financial, showRial)}`}</Typography.Text>,
							);
						}
						const extendedSummaryFields: Array<{
							key: ReportFinancialColumnKey
							title?: string
							keys: readonly string[]
						}> = [
							{ key: "karashabIncome", title: selectedFinancialColumnTitles.karashabIncome, keys: REPORT_FIELD_KEYS.karashabIncome },
							{ key: "karashabExpense", title: selectedFinancialColumnTitles.karashabExpense, keys: REPORT_FIELD_KEYS.karashabExpense },
							{ key: "karashabProfit", title: selectedFinancialColumnTitles.karashabProfit, keys: REPORT_FIELD_KEYS.karashabProfit },
							{ key: "telecomIncome", title: selectedFinancialColumnTitles.telecomIncome, keys: REPORT_FIELD_KEYS.telecomIncome },
							{ key: "firstPartyIncome", title: selectedFinancialColumnTitles.firstPartyIncome, keys: REPORT_FIELD_KEYS.firstPartyIncome },
							{ key: "regionIncome", title: selectedFinancialColumnTitles.regionIncome, keys: REPORT_FIELD_KEYS.regionIncome },
							{ key: "salesAgentIncome", title: selectedFinancialColumnTitles.salesAgentIncome, keys: REPORT_FIELD_KEYS.salesAgentIncome },
						];

						extendedSummaryFields.forEach((field) => {
							if (!field.title || !selectedFinancialColumns.includes(field.key))
								return;

							const value = pickSummaryValue(summary, field.keys);
							if (value == null)
								return;

							summaryFields.push(
								<Typography.Text key={field.key}>{`${field.title}: ${formatSummaryMoney(value, showRial)}`}</Typography.Text>,
							);
						});

						if (summaryFields.length > 0) {
							items.push(
								<Space key="summary" size={16} wrap>
									{summaryFields}
								</Space>,
							);
						}
					}

					items.push(
						<Space key="exports" size={8} wrap>
							<Button key="pdf" icon={<FilePdfOutlined />} onClick={handleDownloadPdf} disabled={!canExport}>
								{t("performance.actions.downloadPdf")}
							</Button>
							<Button key="excel" icon={<FileExcelOutlined />} onClick={handleDownloadExcel} disabled={!canExport}>
								{t("performance.actions.downloadExcel")}
							</Button>
						</Space>,
					);

					return items;
				}}
			/>
		</BasicContent>
	);
}
