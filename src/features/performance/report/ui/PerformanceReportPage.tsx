import type { ActionType, ProColumns, ProFormInstance } from "@ant-design/pro-components";
import type { PerformanceReportRow, PerformanceReportSummary } from "../model/performance.report.types";
import type { OperatorGovernmentFilters } from "../model/sms-report-variants";
import type { ReportRequest } from "../queries/performance-report.fetch";
import type { CompanyTypeSelection, PeriodType, ReportAggregationKey, ReportAuditColumnKey, ReportSelectOption, ReportServiceOption, SmsContractTypeFilter, SmsReportType } from "./constants";
import type { ReportExportExtraTitles, ReportExportLabels, ReportFinancialColumnKey } from "./export";
import ReportResultsIcon from "#src/assets/svg/performance/report-results.svg?react";
import { BasicContent, BasicTable } from "#src/components";
import { normalizeServiceCode } from "#src/features/performance/shared/model/performance.helpers";
import {
	companiesByServiceQuery,
	performanceReportAvailabilityQuery,
	servicesQuery,
	smsCommissionAgentsQuery,
} from "#src/features/performance/shared/queries/performance.queries";
import { MONTH_OPTIONS } from "#src/features/performance/shared/ui/form/constants/jalali-date-options";
import { useAccess } from "#src/hooks";
import { SingleOptionSync } from "#src/shared/ui/rhf-pro";
import { FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Space } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	buildPerformanceReportParams,
	buildReportAvailabilityQuery,
	getDefaultFinancialColumns,
	getFinancialColumnKeys,
	isValidDefaultConversionRatio,
	normalizePeriods,
	parsePeriod,
	prunePeriodsToAvailability,
} from "../model/performance-report.params";
import { buildOperatorGovernmentParams, DEFAULT_OPERATOR_GOVERNMENT_FILTERS, resolveSmsCommissionScope } from "../model/sms-report-variants";
import { fetchReportPage } from "../queries/performance-report.fetch";
import { ALL_COMPANY_TYPES, getReportCompanyTypeLabel, hasCompanyTypeSelection, isOnlyCompanyType, isUnitConversionCompanyType } from "./company-type";
import { ReportCompanyPicker } from "./components/ReportCompanyPicker";
import { ReportPeriodPicker } from "./components/ReportPeriodPicker";
import { ReportRowActions } from "./components/ReportRowActions";
import { ReportSettingsPanel } from "./components/ReportSettingsPanel";
import { ReportSummaryCards } from "./components/ReportSummaryCards";
import { ReportTotalsSummary } from "./components/ReportTotalsSummary";
import {
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
import { formatReportMoney, formatReportNumber } from "./report-number-format";
import { addSmsVariantExportColumns } from "./sms-variant-export-columns";

const INITIAL_FINANCIAL_COLUMNS = getDefaultFinancialColumns("default", "normal", false);

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

// In the fiscal calendar the period month is 3 months ahead of the month it
// represents to the user (fiscal month 1 = دی, 11 = آبان, 12 = آذر). Only the
// displayed name is shifted; the underlying period value stays untouched.

export function PerformanceReportPage() {
	const { t, i18n } = useTranslation();
	const { getPermittedCompanyTypes, getPermittedServiceIds } = useAccess();

	const actionRef = useRef<ActionType>(null);
	const formRef = useRef<ProFormInstance | undefined>(undefined);

	const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
	const [selectedServiceCode, setSelectedServiceCode] = useState<string | null>(null);
	const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
	const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>([]);
	const [userClearedCompanies, setUserClearedCompanies] = useState(false);
	const [autoSelectCompanies, setAutoSelectCompanies] = useState(true);
	const [selectedSmsReportType, setSelectedSmsReportType] = useState<SmsReportType>("normal");
	const [selectedPeriodType, setSelectedPeriodType] = useState<PeriodType>("sh");
	const [selectedCompanyType, setSelectedCompanyType] = useState<CompanyTypeSelection>(null);
	const [selectedContractType, setSelectedContractType] = useState<SmsContractTypeFilter>("all");
	const [selectedFinancialColumns, setSelectedFinancialColumns] = useState<ReportFinancialColumnKey[]>(INITIAL_FINANCIAL_COLUMNS);
	const [selectedAuditColumns, setSelectedAuditColumns] = useState<ReportAuditColumnKey[]>([]);
	const [selectedAggregation, setSelectedAggregation] = useState<ReportAggregationKey[]>([]);
	const [defaultConversionRatio, setDefaultConversionRatio] = useState<number | null>(null);
	const [debouncedDefaultConversionRatio, setDebouncedDefaultConversionRatio] = useState<number | null>(null);
	const [summary, setSummary] = useState<PerformanceReportSummary>(null);
	const [totalsRows, setTotalsRows] = useState<PerformanceReportRow[]>([]);
	const [operatorGovernmentFilters, setOperatorGovernmentFilters] = useState<OperatorGovernmentFilters>(DEFAULT_OPERATOR_GOVERNMENT_FILTERS);

	const permittedViewIdsFromPerformances = getPermittedServiceIds("performances", "view");
	const permittedViewIdsFromContracts = getPermittedServiceIds("contracts", "view");
	const permittedViewServiceIdsList = permittedViewIdsFromPerformances.length > 0
		? permittedViewIdsFromPerformances
		: permittedViewIdsFromContracts;

	const permittedViewServiceIds = useMemo(
		() => new Set(permittedViewServiceIdsList),
		[permittedViewServiceIdsList.join(",")],
	);

	const serviceLayout = getReportServiceLayout(selectedServiceCode);
	const isSmsService = serviceLayout === "sms";
	const isSmsCommissionService = serviceLayout === "sms-commission";
	const isTrafficService = serviceLayout === "traffic";
	const isPspService = serviceLayout === "psp";
	const isSalesAgencyService = serviceLayout === "sales-agency";
	const supportsOperatorLanguageAggregationFilter = supportsOperatorLanguageAggregation(selectedServiceCode);
	const isOperatorGovernment = isSmsService && selectedSmsReportType === "operatorGovernment";
	const isFinanceDepartment = isSmsService && selectedSmsReportType === "finance";
	const isOverallSms = isSmsService && selectedSmsReportType === "summary";
	const requiresCompanyType = (isSmsService || isPspService || isTrafficService || isSalesAgencyService) && !isOperatorGovernment;
	const supportsContractType = isSmsService || isTrafficService;
	const hasSelectedCompanyType = hasCompanyTypeSelection(selectedCompanyType);
	const isSalesAgencyOutbound = isSalesAgencyService && isOnlyCompanyType(selectedCompanyType, "OUTBOUND");
	const isCollocation = isTrafficService && isOnlyCompanyType(selectedCompanyType, "COLLOCATION");
	const isUnitConversion = isTrafficService && isUnitConversionCompanyType(selectedCompanyType);
	const hasRequiredAvailabilityFilters = !!selectedServiceId && (!requiresCompanyType || hasSelectedCompanyType);
	const isAggregated = selectedAggregation.some(key => key !== "by_data_center");
	const isAuditColumnsDisabled = selectedAggregation.length > 0 || (isSmsService && selectedSmsReportType !== "normal");

	const availabilityInput = {
		serviceId: selectedServiceId,
		periodType: selectedPeriodType,
		companyType: selectedCompanyType,
		supportsContractType,
		contractType: selectedContractType,
		aggregation: selectedAggregation,
		isCollocation,
		overallSmsPerformance: isOverallSms,
	};

	const services = useQuery(servicesQuery());
	const companies = useQuery(companiesByServiceQuery(selectedServiceId));
	const smsCommissionAgents = useQuery(smsCommissionAgentsQuery(isSmsCommissionService));
	const availabilityBase = useQuery(performanceReportAvailabilityQuery(
		hasRequiredAvailabilityFilters ? buildReportAvailabilityQuery({ ...availabilityInput, periods: [] }) : null,
	));
	const availabilityByPeriods = useQuery(performanceReportAvailabilityQuery(
		hasRequiredAvailabilityFilters && selectedPeriods.length > 0
			? buildReportAvailabilityQuery({ ...availabilityInput, periods: selectedPeriods })
			: null,
	));

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

	const canViewSmsCommission = useMemo(
		() => serviceOptions.some(option => getReportServiceLayout(option.code) === "sms-commission"),
		[serviceOptions],
	);

	const selectedServiceName = useMemo(() => {
		if (!selectedServiceId)
			return null;
		return serviceOptions.find(item => item.value === selectedServiceId)?.label ?? null;
	}, [selectedServiceId, serviceOptions]);
	const isBaseUnitHidden = !selectedFinancialColumns.includes("showBaseUnit");
	const hasDefaultConversionRatio = defaultConversionRatio != null;
	const isDefaultConversionRatioInvalid = isUnitConversion && isBaseUnitHidden && hasDefaultConversionRatio && !isValidDefaultConversionRatio(defaultConversionRatio);

	const availablePeriods = useMemo(() => normalizePeriods(availabilityBase.data?.periods), [availabilityBase.data]);

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
		return availablePeriods.reduce<ReportSelectOption[]>((acc, period) => {
			const parsed = parsePeriod(period);
			if (!parsed)
				return acc;

			const displayMonth = getReportDisplayMonth(parsed.month, selectedPeriodType);
			const monthName = t(`performance.months.${displayMonth}`);
			acc.push({
				value: parsed.period,
				label: `${monthName} (${parsed.year}/${parsed.month})`,
			});
			return acc;
		}, []);
	}, [availablePeriods, selectedPeriodType, t]);

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

			const permittedOptions = getPermittedCompanyTypes("performances", "view", selectedServiceId)
				.map(item => ({ label: item.value, value: item.key }));

			return isSmsService
				? [{ label: t("performance.labels.selectAll"), value: ALL_COMPANY_TYPES }, ...permittedOptions]
				: permittedOptions;
		},
		[requiresCompanyType, selectedServiceId, getPermittedCompanyTypes, isSmsService, t],
	);

	const resetCompanySelection = () => {
		setSelectedCompanyIds([]);
		setUserClearedCompanies(false);
		setAutoSelectCompanies(true);
	};

	useEffect(() => {
		if (!requiresCompanyType || !hasSelectedCompanyType)
			return;

		const selectedTypes = Array.isArray(selectedCompanyType) ? selectedCompanyType : [selectedCompanyType];
		if (selectedTypes.every(selectedType => companyTypeOptions.some(option => String(option.value) === selectedType)))
			return;

		setSelectedCompanyType(null);
		resetCompanySelection();
		setSummary(null);
		formRef.current?.setFieldsValue({ company_type: undefined });
	}, [requiresCompanyType, hasSelectedCompanyType, selectedCompanyType, companyTypeOptions]);

	const agentNameByCompanyId = useMemo(() => {
		const names = new Map<number, string>();
		(smsCommissionAgents.data?.results ?? []).forEach(agent => names.set(Number(agent.company), agent.name));
		return names;
	}, [smsCommissionAgents.data]);

	const companyOptions = useMemo(() => {
		if (!selectedServiceId)
			return [];

		const availability = selectedPeriods.length > 0
			? availabilityByPeriods.data
			: availabilityBase.data;
		if (!availability)
			return [];

		if (availability.companies?.length) {
			const seenCompanyIds = new Set<number>();
			return availability.companies.reduce<ReportSelectOption[]>((options, company) => {
				const companyId = Number(company.id);
				if (!Number.isInteger(companyId) || companyId <= 0 || seenCompanyIds.has(companyId))
					return options;

				seenCompanyIds.add(companyId);
				const companyName = String(company.name ?? "").trim() || String(companyId);
				const agentName = agentNameByCompanyId.get(companyId);
				options.push({
					label: agentName ? `${companyName} - ${agentName}` : companyName,
					value: companyId,
				});
				return options;
			}, []);
		}

		const companiesList = companies.data?.results ?? [];
		const availableSet = new Set(availableCompanyIds.map(id => Number(id)));
		return companiesList
			.filter(company => availableSet.has(Number(company.id)))
			.map(company => ({
				label: agentNameByCompanyId.has(Number(company.id)) ? `${company.name} - ${agentNameByCompanyId.get(Number(company.id))}` : company.name,
				value: company.id,
			}));
	}, [
		selectedServiceId,
		selectedPeriods.join(","),
		availabilityBase.data,
		availabilityByPeriods.data,
		companies.data,
		availableCompanyIds.join(","),
		agentNameByCompanyId,
	]);

	useEffect(() => {
		if (!autoSelectCompanies || companyOptions.length === 0)
			return;
		setSelectedCompanyIds(companyOptions.map(option => Number(option.value)));
		setUserClearedCompanies(false);
	}, [autoSelectCompanies, companyOptions]);

	const contractTypeOptions = useMemo<ReportSelectOption[]>(() => ([
		{ label: t("performance.contractType.all"), value: "all" },
		{ label: t("performance.contractType.official"), value: "official" },
		{ label: t("performance.contractType.unofficial"), value: "unofficial" },
	]), [t]);
	const smsReportTypeOptions = useMemo<ReportSelectOption[]>(() => ([
		{ label: t("performance.smsReportType.normal"), value: "normal" },
		{ label: t("performance.smsReportType.finance"), value: "finance" },
		...(canViewSmsCommission ? [{ label: t("performance.smsReportType.summary"), value: "summary" }] : []),
		{ label: t("performance.smsReportType.operatorGovernment"), value: "operatorGovernment" },
	]), [canViewSmsCommission, t]);
	const periodTypeOptions = useMemo<ReportSelectOption[]>(() => ([
		{ label: t("performance.periodType.sh"), value: "sh" },
		{ label: t("performance.periodType.fiscal"), value: "fiscal" },
	]), [t]);
	const aggregationOptions = useMemo<ReportSelectOption[]>(() => {
		const options: ReportSelectOption[] = [
			...(isOperatorGovernment ? [] : [{ label: t("performance.aggregation.byCompany"), value: "by_company" }]),
			{ label: t("performance.aggregation.byMonth"), value: "by_month" },
		];
		if (supportsOperatorLanguageAggregationFilter) {
			options.push(
				{ label: t("performance.aggregation.byOperator"), value: "by_operator" },
				{ label: t("performance.aggregation.byLanguage"), value: "by_language" },
			);
		}
		if (isCollocation)
			options.push({ label: t("performance.aggregation.byDataCenter"), value: "by_data_center" });
		return options;
	}, [supportsOperatorLanguageAggregationFilter, isCollocation, isOperatorGovernment, t]);

	const allowedAggregationKeys = useMemo(
		() => getAllowedAggregationKeys(selectedServiceCode, isCollocation).filter(key => !(isOperatorGovernment && key === "by_company")),
		[selectedServiceCode, isCollocation, isOperatorGovernment],
	);

	useEffect(() => {
		setSelectedAggregation((prev) => {
			const next = filterAggregationKeys(prev, allowedAggregationKeys);
			return next.join(",") === prev.join(",") ? prev : next;
		});
	}, [allowedAggregationKeys.join(",")]);

	useEffect(() => {
		if (!isAuditColumnsDisabled || selectedAuditColumns.length === 0)
			return;

		setSelectedAuditColumns([]);
	}, [isAuditColumnsDisabled, selectedAuditColumns.length]);

	const financialColumnOptions = useMemo<ReportSelectOption[]>(
		() => getFinancialColumnKeys(serviceLayout, selectedSmsReportType, isUnitConversion)
			.map(key => ({ label: t(`performance.columns.${key}`), value: key })),
		[serviceLayout, selectedSmsReportType, isUnitConversion, t],
	);

	const auditColumnOptions = useMemo<ReportSelectOption[]>(() => ([
		{ label: t("performance.columns.createdByUser"), value: "createdByUser" },
		{ label: t("performance.columns.updatedByUser"), value: "updatedByUser" },
	]), [t]);

	useEffect(() => {
		setSelectedFinancialColumns((prev) => {
			const hasShowBaseUnit = prev.includes("showBaseUnit");
			if (isUnitConversion)
				return hasShowBaseUnit ? prev : ["showBaseUnit", ...prev];
			return hasShowBaseUnit ? prev.filter(key => key !== "showBaseUnit") : prev;
		});

		if (isUnitConversion)
			return;

		setDefaultConversionRatio(null);
		setDebouncedDefaultConversionRatio(null);
		formRef.current?.setFieldsValue({ default_conversion_ratio: undefined });
	}, [isUnitConversion]);

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

	const selectedFinancialColumnTitles = useMemo(
		() => Object.fromEntries(
			selectedFinancialColumns.map(key => [key, t(`performance.columns.${key}`)]),
		) as Partial<Record<ReportFinancialColumnKey, string>>,
		[selectedFinancialColumns, t],
	);

	const reportSummaryItems = useMemo(() => {
		if (!selectedFinancialColumns.includes("total") || !summary)
			return [];

		const showRial = selectedFinancialColumns.includes("rial");
		const items: Array<{ key: string, label: string, value: string }> = [];
		if (selectedFinancialColumnTitles.total) {
			items.push(isSalesAgencyService
				? {
					key: "total",
					label: t(isSalesAgencyOutbound ? "performance.columns.totalSales" : "performance.columns.creditTotal"),
					value: formatReportMoney(pickSummaryValue(summary, [...REPORT_FIELD_KEYS.creditTotal, ...REPORT_FIELD_KEYS.totalSales]), showRial),
				}
				: {
					key: "total",
					label: selectedFinancialColumnTitles.total,
					value: formatReportNumber(summary.value),
				});
		}
		if (selectedFinancialColumnTitles.income) {
			items.push({
				key: "income",
				label: selectedFinancialColumnTitles.income,
				value: formatReportMoney(summary.income_financial, showRial),
			});
		}
		if (selectedFinancialColumnTitles.expense) {
			items.push({
				key: "expense",
				label: selectedFinancialColumnTitles.expense,
				value: formatReportMoney(summary.expense_financial, showRial),
			});
		}
		if (selectedFinancialColumnTitles.profit) {
			items.push({
				key: "profit",
				label: selectedFinancialColumnTitles.profit,
				value: formatReportMoney(summary.profit_financial, showRial),
			});
		}

		const extendedFields: Array<{
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
		extendedFields.forEach((field) => {
			if (!field.title || !selectedFinancialColumns.includes(field.key))
				return;
			const value = pickSummaryValue(summary, field.keys);
			if (value == null)
				return;
			items.push({ key: field.key, label: field.title, value: formatReportMoney(value, showRial) });
		});

		return items;
	}, [selectedFinancialColumnTitles, selectedFinancialColumns, summary, isSalesAgencyService, isSalesAgencyOutbound, t]);

	const setSelectedService = (serviceId: number | null, serviceCode: string | null) => {
		const normalizedServiceCode = serviceCode ? normalizeServiceCode(serviceCode) : null;
		const nextSmsReportType: SmsReportType = "normal";
		const nextFinancialColumns = getDefaultFinancialColumns(getReportServiceLayout(normalizedServiceCode), nextSmsReportType, false);

		setSelectedServiceId(serviceId);
		setSelectedServiceCode(normalizedServiceCode);
		setSelectedPeriods([]);
		resetCompanySelection();
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
			service_id: serviceId ?? undefined,
			company_type: undefined,
			sms_report_type: nextSmsReportType,
			is_official: "all",
			default_conversion_ratio: undefined,
		});
	};

	useEffect(() => {
		if (!selectedServiceId)
			return;
		if (permittedViewServiceIds.has(selectedServiceId))
			return;

		setSelectedService(null, null);
		setSelectedPeriodType("sh");
	}, [selectedServiceId, permittedViewServiceIdsList.join(",")]);

	const handlePeriodsChange = (periods: string[]) => {
		setSelectedPeriods(periods);
		setSummary(null);
	};

	useEffect(() => {
		if (!availabilityBase.data)
			return;

		const pruned = prunePeriodsToAvailability(selectedPeriods, availabilityBase.data.periods ?? []);
		if (pruned !== selectedPeriods)
			handlePeriodsChange(pruned);
	}, [availabilityBase.data]);

	// Old behaviour: a user-emptied list means "no request", and picking every company hands control back to auto-select.
	const handleCompanyIdsChange = (companyIds: number[]) => {
		setSelectedCompanyIds(companyIds);
		setUserClearedCompanies(companyIds.length === 0);
		setAutoSelectCompanies(companyIds.length > 0 && companyIds.length === companyOptions.length);
		setSummary(null);
	};

	const handleCompanyTypeChange = (value: CompanyTypeSelection) => {
		setSelectedCompanyType(value);
		resetCompanySelection();
		setSummary(null);
		formRef.current?.setFieldsValue({ company_type: value ?? undefined });
	};

	const handleSmsReportTypeChange = (reportType: SmsReportType) => {
		setSelectedSmsReportType(reportType);
		setSelectedFinancialColumns(getDefaultFinancialColumns("sms", reportType, false));
		setSummary(null);
		formRef.current?.setFieldsValue({ sms_report_type: reportType });
	};

	const handleContractTypeChange = (value: SmsContractTypeFilter) => {
		setSelectedContractType(value);
		setOperatorGovernmentFilters(prev => ({ ...prev, smsCommission: resolveSmsCommissionScope(prev.smsCommission, value) }));
		formRef.current?.setFieldsValue({ is_official: value });
	};

	const handlePeriodTypeChange = (value: PeriodType) => {
		setSelectedPeriodType(value);
		setSelectedPeriods([]);
		resetCompanySelection();
		setSummary(null);
	};

	const handleFinancialColumnsChange = (columns: ReportFinancialColumnKey[]) => {
		const nextColumns = columns.length > 0 ? columns : getDefaultFinancialColumns(serviceLayout, selectedSmsReportType, isUnitConversion);
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

	const handleOperatorGovernmentFiltersChange = (filters: Partial<OperatorGovernmentFilters>) => {
		setOperatorGovernmentFilters(prev => ({ ...prev, ...filters }));
		setSummary(null);
	};

	const handleAggregationChange = (values: ReportAggregationKey[]) => {
		// The data-center switch only means something on top of company aggregation (old UI lock).
		const next = values.includes("by_company") ? values : values.filter(key => key !== "by_data_center");
		setSelectedAggregation(next);
		setSummary(null);
		if (next.length === 0)
			return;

		setSelectedAuditColumns([]);
		const hasCompanyTypeColumn = getFinancialColumnKeys(serviceLayout, selectedSmsReportType, isUnitConversion).includes("companyType");
		if (next.includes("by_company") && !selectedAggregation.includes("by_company") && hasCompanyTypeColumn)
			setSelectedFinancialColumns(prev => prev.includes("companyType") ? prev : [...prev, "companyType"]);
	};

	const isPeriodDisabled = !selectedServiceId || availabilityBase.isLoading;
	const isCompanyDisabled = !selectedServiceId || selectedPeriods.length === 0 || companies.isLoading || (selectedPeriods.length > 0 && availabilityByPeriods.isFetching) || (requiresCompanyType && !hasSelectedCompanyType) || isOperatorGovernment;

	const columns: ProColumns<PerformanceReportRow>[] = useMemo(() => {
		return getPerformanceReportColumns({
			t,
			selectedServiceCode,
			selectedServiceName,
			serviceOptions,
			companyTypeOptions,
			contractTypeOptions,
			smsReportTypeOptions,
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
			isTrafficService,
			supportsOperatorLanguageAggregation: supportsOperatorLanguageAggregationFilter,
			requiresCompanyType,
			onServiceChange: setSelectedService,
			onCompanyTypeChange: handleCompanyTypeChange,
			onContractTypeChange: handleContractTypeChange,
			onSmsReportTypeChange: handleSmsReportTypeChange,
			operatorGovernmentFilters,
			canFilterSmsCommission: canViewSmsCommission,
			onOperatorGovernmentFiltersChange: handleOperatorGovernmentFiltersChange,
			onDefaultConversionRatioChange: setDefaultConversionRatio,
			renderRowActions: row => (
				<ReportRowActions
					row={row}
					serviceId={selectedServiceId}
					serviceCode={selectedServiceCode}
					selectedCompanyType={Array.isArray(selectedCompanyType) ? null : selectedCompanyType}
					isAggregated={isAggregated}
				/>
			),
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
		operatorGovernmentFilters,
		canViewSmsCommission,
		selectedPeriodType,
		selectedCompanyType,
		isSmsService,
		isSmsCommissionService,
		isTrafficService,
		supportsOperatorLanguageAggregationFilter,
		requiresCompanyType,
		isPeriodDisabled,
		isCompanyDisabled,
		isAggregated,
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

	const buildReportRequest = useCallback((page: number, pageSize: number, options?: { total?: boolean, ratio?: number | null }): ReportRequest | null => {
		const total = options?.total ?? selectedFinancialColumns.includes("total");
		if (isOperatorGovernment) {
			const query = buildOperatorGovernmentParams({
				serviceId: selectedServiceId,
				periodType: selectedPeriodType,
				periods: selectedPeriods,
				contractType: selectedContractType,
				canFilterSmsCommission: canViewSmsCommission,
				filters: operatorGovernmentFilters,
				aggregation: selectedAggregation,
				page,
				pageSize,
				total,
			});
			return query && { kind: "operator-government", query };
		}

		const query = buildPerformanceReportParams({
			serviceId: selectedServiceId,
			serviceCode: selectedServiceCode,
			periodType: selectedPeriodType,
			periods: selectedPeriods,
			companyType: selectedCompanyType,
			requiresCompanyType,
			supportsContractType,
			contractType: selectedContractType,
			selectedCompanyIds,
			availableCompanyIds: companyOptions.map(option => Number(option.value)),
			requireCompanies: (userClearedCompanies && selectedCompanyIds.length === 0) || (isSmsCommissionService && !isAggregated),
			aggregation: selectedAggregation,
			isUnitConversion,
			showBaseUnit: selectedFinancialColumns.includes("showBaseUnit"),
			conversionRatio: options?.ratio === undefined ? debouncedDefaultConversionRatio : options.ratio,
			overallSmsPerformance: isOverallSms,
			page,
			pageSize,
			total,
		});
		return query && { kind: isFinanceDepartment ? "finance" : "performance", query };
	}, [
		canViewSmsCommission,
		companyOptions,
		debouncedDefaultConversionRatio,
		isAggregated,
		isFinanceDepartment,
		isOperatorGovernment,
		isOverallSms,
		isSmsCommissionService,
		isUnitConversion,
		operatorGovernmentFilters,
		requiresCompanyType,
		selectedAggregation,
		selectedCompanyIds,
		selectedCompanyType,
		selectedContractType,
		selectedFinancialColumns,
		selectedPeriodType,
		selectedPeriods,
		selectedServiceCode,
		selectedServiceId,
		supportsContractType,
		userClearedCompanies,
	]);

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
		return getReportCompanyTypeLabel(companyType, companyTypeOptions);
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

	const trafficLayout = isTrafficService
		? getTrafficReportLayout(selectedCompanyType)
		: getTrafficReportLayout(null);

	const effectiveAuditColumns = !selectedServiceId || isAuditColumnsDisabled ? [] : selectedAuditColumns;

	const exportExtraTitles = useMemo<ReportExportExtraTitles>(() => ({
		rackFullCount: t("performance.columns.rackFullCount"),
		rackQuarterCount: t("performance.columns.rackQuarterCount"),
		rackUnitCount: t("performance.columns.rackUnitCount"),
		rackFullIncome: t("performance.columns.rackFullIncome"),
		rackQuarterIncome: t("performance.columns.rackQuarterIncome"),
		rackUnitIncome: t("performance.columns.rackUnitIncome"),
		newCustomerCount: t("performance.columns.newCustomerCount"),
		newCustomerIncome: t("performance.columns.newCustomerIncome"),
		performanceIncome: t("performance.columns.performanceIncome"),
		creditTotal: t("performance.columns.creditTotal"),
		totalSales: t("performance.columns.totalSales"),
		costItems: t("performance.columns.costItems"),
		totalCost: t("performance.columns.totalCost"),
	}), [t]);

	const exportColumns = useMemo(() => {
		const baseColumns = createPerformanceReportExportColumns({
			layout: serviceLayout,
			idTitle: t("performance.columns.id"),
			serviceNameTitle: t("performance.columns.serviceName"),
			serviceNameFallback: selectedServiceName,
			companyNameTitle: t("performance.columns.companyName"),
			companyTypeTitle: t("performance.columns.companyType"),
			yearTitle: reportYearTitle,
			shYearTitle: t("performance.columns.shYear"),
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
			extraTitles: exportExtraTitles,
			isSalesAgencyOutbound,
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
			hideCompanyColumn: selectedAggregation.includes("by_company") || isOperatorGovernment,
			hideMonthColumn: selectedAggregation.includes("by_month"),
			showOperatorLanguageColumns: supportsOperatorLanguageAggregationFilter,
			hideOperatorColumn: selectedAggregation.includes("by_operator") || isFinanceDepartment,
			hideLanguageColumn: selectedAggregation.includes("by_language") || isFinanceDepartment,
		});
		return addSmsVariantExportColumns(baseColumns, {
			variant: isSmsService ? selectedSmsReportType : "normal",
			countTitle: t("performance.columns.count"),
			serviceNameTitle: t("performance.columns.service"),
			serviceNameFallback: selectedServiceName,
			rowTypeTitle: t("performance.columns.rowType"),
			rowTypeLabels: {
				government: t("performance.rowType.government"),
				profit: t("performance.rowType.profit"),
				overall: t("performance.rowType.overall"),
			},
			getOperatorLabel,
			getLanguageLabel,
		});
	}, [
		isFinanceDepartment,
		isOperatorGovernment,
		isSmsService,
		selectedSmsReportType,
		getCompanyTypeLabel,
		getLanguageLabel,
		getMonthLabel,
		getOperationTypeLabel,
		getOperatorLabel,
		getTrafficLocationLabel,
		reportYearTitle,
		reportMonthTitle,
		serviceLayout,
		trafficLayout,
		selectedServiceName,
		selectedPeriodType,
		effectiveAuditColumns,
		selectedAggregation,
		selectedFinancialColumnTitles,
		supportsOperatorLanguageAggregationFilter,
		exportExtraTitles,
		isSalesAgencyOutbound,
		t,
	]);

	const fetchAllRowsForExport = useCallback(async () => {
		const initialRequest = buildReportRequest(1, 500, { ratio: defaultConversionRatio });
		if (!initialRequest) {
			window.$message?.warning(t("performance.messages.selectReportFiltersFirst"));
			return null;
		}

		const firstPage = await fetchReportPage(initialRequest);
		const rows = [...firstPage.rows];
		const totalPages = Math.max(1, Math.ceil(firstPage.count / 500));

		for (let page = 2; page <= totalPages; page++) {
			const request = buildReportRequest(page, 500, { total: false, ratio: defaultConversionRatio });
			if (!request)
				break;
			rows.push(...(await fetchReportPage(request)).rows);
		}

		if (rows.length === 0) {
			window.$message?.warning(t("performance.messages.noReportData"));
			return null;
		}

		return {
			rows,
			summary: firstPage.summary ?? summary,
			totals: firstPage.totalsRows.length > 0
				? { rows: firstPage.totalsRows, label: t("performance.columns.total"), labelColumnTitles: [t("performance.columns.companyName"), t("performance.columns.operationType")] }
				: undefined,
		};
	}, [buildReportRequest, defaultConversionRatio, summary, t]);

	const exportLabels = useMemo<ReportExportLabels>(() => ({
		summary: t("performance.reportPage.export.summary"),
		generatedAt: t("performance.reportPage.export.generatedAt"),
		brandName: t("performance.reportPage.export.brandName"),
		footer: t("performance.reportPage.export.footer"),
		service: t("performance.columns.service"),
		currencyUnit: t("performance.labels.currencyUnit"),
	}), [t]);

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
			labels: exportLabels,
			serviceName: selectedServiceName,
			currencyValue,
			rows: exportData.rows,
			columns: exportColumns,
			summary: exportData.summary,
			totals: exportData.totals,
			financialColumnTitles: selectedFinancialColumnTitles,
		});
	}, [exportColumns, exportLabels, fetchAllRowsForExport, selectedFinancialColumnTitles, selectedFinancialColumns, selectedServiceName, t]);

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
				labels: exportLabels,
				serviceName: selectedServiceName,
				currencyValue,
				rows: exportData.rows,
				columns: exportColumns,
				summary: exportData.summary,
				totals: exportData.totals,
				financialColumnTitles: selectedFinancialColumnTitles,
			});
		}
		catch {
			window.$message?.warning(t("performance.messages.popupBlocked"));
		}
	}, [exportColumns, exportLabels, fetchAllRowsForExport, selectedFinancialColumnTitles, selectedFinancialColumns, selectedServiceName, t]);

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
		JSON.stringify(operatorGovernmentFilters),
		debouncedDefaultConversionRatio,
		companyOptions.length,
	].join("|");

	useEffect(() => {
		actionRef.current?.reload?.();
	}, [reportFilterKey]);

	const reportTitle = selectedServiceName
		? `${t("performance.titles.performanceReport")} - ${selectedServiceName}`
		: t("performance.titles.performanceReport");
	const reportTableSubtitle = selectedServiceName
		? selectedPeriods.length > 0
			? `${selectedServiceName} | ${t("performance.titles.performanceReportPeriodCount", {
				periodCount: selectedPeriods.length.toLocaleString(i18n.resolvedLanguage ?? i18n.language),
			})}`
			: selectedServiceName
		: t("performance.titles.performanceReportResultsSubtitle");

	return (
		<BasicContent className="h-full">
			<BasicTable<PerformanceReportRow>
				className="performance-report-table"
				rowKey={record => String(record.id)}
				columns={columns}
				actionRef={actionRef}
				formRef={formRef}
				autoSearchDebounceTime={800}
				search={{
					defaultCollapsed: false,
					span: 12,
					optionRender: false,
				}}
				filterTitle={t("performance.reportPage.filterTitle")}
				filterSubtitle=""
				tableExtraRender={() => (
					<div className="performance-report-extra-panels">
						<SingleOptionSync
							options={serviceOptions}
							value={selectedServiceId}
							onSelect={value => setSelectedService(Number(value), serviceOptions.find(option => option.value === Number(value))?.code ?? null)}
						/>
						{requiresCompanyType && (
							<SingleOptionSync
								options={companyTypeOptions.filter(option => option.value !== ALL_COMPANY_TYPES)}
								value={selectedCompanyType}
								onSelect={value => handleCompanyTypeChange(isTrafficService ? [String(value)] : String(value))}
							/>
						)}
						<ReportPeriodPicker
							key={`${selectedServiceId ?? "no-service"}-${selectedPeriodType}`}
							yearOptions={yearOptions}
							periodOptions={periodOptions}
							periodTypeOptions={periodTypeOptions}
							selectedPeriodType={selectedPeriodType}
							selectedPeriods={selectedPeriods}
							disabled={isPeriodDisabled}
							onPeriodTypeChange={handlePeriodTypeChange}
							onPeriodsChange={handlePeriodsChange}
						/>
						<ReportSettingsPanel
							financialOptions={financialColumnOptions}
							aggregationOptions={aggregationOptions}
							auditOptions={auditColumnOptions}
							selectedFinancialColumns={selectedFinancialColumns}
							selectedAggregation={selectedAggregation}
							selectedAuditColumns={selectedAuditColumns}
							disabled={selectedPeriods.length === 0}
							auditDisabled={isAuditColumnsDisabled}
							aggregationDisabledKeys={selectedAggregation.includes("by_company") ? [] : ["by_data_center"]}
							onFinancialColumnsChange={handleFinancialColumnsChange}
							onAggregationChange={handleAggregationChange}
							onAuditColumnsChange={setSelectedAuditColumns}
						/>
					</div>
				)}
				cardProps={{
					title: (
						<div className="performance-report-table-heading-content">
							<ReportCompanyPicker
								key={`${selectedServiceId ?? "no-service"}-${Array.isArray(selectedCompanyType) ? selectedCompanyType.join(",") : selectedCompanyType ?? "no-type"}-${selectedPeriods.join(",")}`}
								options={companyOptions}
								selectedCompanyIds={selectedCompanyIds}
								disabled={isCompanyDisabled}
								loading={!!selectedServiceId && selectedPeriods.length > 0 && (companies.isLoading || availabilityByPeriods.isFetching)}
								onChange={handleCompanyIdsChange}
							/>
							<ReportSummaryCards items={reportSummaryItems} />
						</div>
					),
				}}
				form={{
					initialValues: {
						sms_report_type: "normal",
						company_type: undefined,
						is_official: "all",
						default_conversion_ratio: undefined,
					},
				}}
				summary={() => totalsRows.length > 0
					? <ReportTotalsSummary columns={columns} rows={totalsRows} label={t("performance.columns.total")} />
					: null}
				request={async (params) => {
					const current = params.current ?? 1;
					const pageSize = params.pageSize ?? 20;
					const reportRequest = isDefaultConversionRatioInvalid ? null : buildReportRequest(current, pageSize);
					if (!reportRequest) {
						setSummary(null);
						setTotalsRows([]);
						return {
							data: [],
							total: 0,
							success: true,
						};
					}

					const page = await fetchReportPage(reportRequest);
					setSummary(reportRequest.query.total ? page.summary : null);
					// The total line belongs to the end of the report.
					setTotalsRows(reportRequest.query.total && current * pageSize >= page.count ? page.totalsRows : []);

					return {
						data: page.rows,
						total: page.count,
						success: true,
					};
				}}
				headerTitle={reportTitle}
				tableTitle={t("performance.titles.performanceReportResults")}
				tableSubtitle={reportTableSubtitle}
				tableIcon={<ReportResultsIcon />}
				toolBarRender={() => {
					const items: React.ReactNode[] = [];

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
