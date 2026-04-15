import type { ActionType, ProColumns, ProFormInstance } from "@ant-design/pro-components";
import type { PerformanceReportRow, PerformanceReportSummary } from "../model/performance.report.types";
import type { ReportSelectOption, ReportServiceOption, SmsContractTypeFilter, SmsReportType, TrafficCompanyType } from "./constants";
import type { ReportFinancialColumnKey } from "./export";
import { BasicContent, BasicTable } from "#src/components";
import { fetchPerformanceReport } from "#src/features/performance/api/performances.api";
import { normalizeServiceCode } from "#src/features/performance/shared/model/performance.helpers";
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
	getPerformanceReportColumns,
	TRAFFIC_COMPANY_TYPE_OPTIONS,
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

const DEFAULT_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = ["income", "expense", "profit", "total"];
const SMS_NORMAL_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = ["income", "expense", "contractType"];
const SMS_FINANCE_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = ["income", "total"];
const SMS_SUMMARY_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = ["income", "expense", "profit", "contractType", "total"];
const SMS_COMMISSION_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = [
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

export default function PerformanceReportPage() {
	const { t } = useTranslation();
	const { getPermittedServiceIds } = useAccess();

	const actionRef = useRef<ActionType>(null);
	const formRef = useRef<ProFormInstance | undefined>(undefined);

	const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
	const [selectedServiceCode, setSelectedServiceCode] = useState<string | null>(null);
	const [selectedYear, setSelectedYear] = useState<number | null>(null);
	const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
	const [selectedSmsReportType, setSelectedSmsReportType] = useState<SmsReportType>("normal");
	const [selectedTrafficCompanyType, setSelectedTrafficCompanyType] = useState<TrafficCompanyType | null>(null);
	const [selectedContractType, setSelectedContractType] = useState<SmsContractTypeFilter>("all");
	const [selectedFinancialColumns, setSelectedFinancialColumns] = useState<ReportFinancialColumnKey[]>(DEFAULT_FINANCIAL_COLUMNS);
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

	const services = useQuery(servicesQuery());
	const companies = useQuery(companiesByServiceQuery(selectedServiceId));
	const availabilityBase = useQuery(performanceReportAvailabilityQuery({
		serviceId: selectedServiceId,
	}));
	const availabilityByPeriods = useQuery({
		...performanceReportAvailabilityQuery({
			serviceId: selectedServiceId,
			shPeriods: selectedPeriods,
		}),
		enabled: !!selectedServiceId && selectedPeriods.length > 0,
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
		setSelectedSmsReportType("normal");
		setSelectedTrafficCompanyType(null);
		setSelectedContractType("all");
		setSelectedFinancialColumns(DEFAULT_FINANCIAL_COLUMNS);
		setSummary(null);
		formRef.current?.setFieldsValue({
			service_id: undefined,
			sh_year: undefined,
			sh_periods: undefined,
			company_ids: undefined,
			company_type: undefined,
			sms_report_type: "normal",
			is_official: "all",
			financial_columns: DEFAULT_FINANCIAL_COLUMNS,
		});
	}, [selectedServiceId, permittedViewServiceIdsList.join(",")]);

	const selectedServiceName = useMemo(() => {
		if (!selectedServiceId)
			return null;
		return serviceOptions.find(item => item.value === selectedServiceId)?.label ?? null;
	}, [selectedServiceId, serviceOptions]);
	const isSmsService = selectedServiceCode === "sms";
	const isSmsCommissionService = selectedServiceCode === "sms-commission" || selectedServiceCode === "sms_commission";
	const isTrafficService = selectedServiceCode === "traffic";
	const supportsContractType = isSmsService || isTrafficService;

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

			const monthName = MONTH_OPTIONS.find(item => item.value === parsed.month)?.label ?? String(parsed.month);
			acc.push({
				value: parsed.period,
				label: `${monthName} (${parsed.year}/${parsed.month})`,
			});
			return acc;
		}, []);
	}, [availablePeriods, selectedYear]);

	const availableCompanyIds = useMemo(() => {
		if (selectedPeriods.length > 0) {
			return availabilityByPeriods.data?.company_ids ?? [];
		}
		return availabilityBase.data?.company_ids ?? [];
	}, [selectedPeriods.join(","), availabilityBase.data, availabilityByPeriods.data]);

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
			.filter(company => !isTrafficService || !selectedTrafficCompanyType || company.company_type === selectedTrafficCompanyType)
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
		isTrafficService,
		selectedTrafficCompanyType,
	]);

	const trafficCompanyTypeOptions = useMemo<ReportSelectOption[]>(
		() => TRAFFIC_COMPANY_TYPE_OPTIONS.map(option => ({ label: option.label, value: option.value })),
		[],
	);

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
	const financialColumnOptions = useMemo<ReportSelectOption[]>(() => {
		if (isSmsCommissionService) {
			return [
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
		if (isSmsService && selectedSmsReportType === "finance") {
			return [
				{ label: t("performance.columns.income"), value: "income" },
				{ label: t("performance.columns.total"), value: "total" },
			];
		}
		const options: ReportSelectOption[] = [
			{ label: t("performance.columns.income"), value: "income" },
			{ label: t("performance.columns.expense"), value: "expense" },
			{ label: t("performance.columns.profit"), value: "profit" },
		];
		if (supportsContractType)
			options.push({ label: t("performance.columns.contractType"), value: "contractType" });
		options.push({ label: t("performance.columns.total"), value: "total" });
		return options;
	}, [isSmsCommissionService, isSmsService, selectedSmsReportType, supportsContractType, t]);

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
		const nextSmsReportType: SmsReportType = "normal";
		const nextFinancialColumns = nextIsSmsCommissionService
			? SMS_COMMISSION_FINANCIAL_COLUMNS
			: nextIsSmsService
				? getSmsFinancialDefaults(nextSmsReportType)
				: DEFAULT_FINANCIAL_COLUMNS;

		setSelectedServiceId(serviceId);
		setSelectedServiceCode(normalizedServiceCode);
		setSelectedYear(null);
		setSelectedPeriods([]);
		setSelectedSmsReportType(nextSmsReportType);
		setSelectedTrafficCompanyType(null);
		setSelectedContractType("all");
		setSelectedFinancialColumns(nextFinancialColumns);
		setSummary(null);

		formRef.current?.setFieldsValue({
			sh_year: undefined,
			sh_periods: undefined,
			company_ids: undefined,
			company_type: undefined,
			sms_report_type: nextSmsReportType,
			is_official: "all",
			financial_columns: nextFinancialColumns,
		});

		actionRef.current?.reload?.();
	};

	const handleYearChange = (year: number | null) => {
		setSelectedYear(year);
		setSelectedPeriods([]);
		setSummary(null);
		formRef.current?.setFieldsValue({
			sh_periods: undefined,
			company_ids: undefined,
		});
	};

	const handlePeriodsChange = (periods: string[]) => {
		setSelectedPeriods(periods);
		setSummary(null);
		formRef.current?.setFieldsValue({
			company_ids: undefined,
		});
	};

	const handleTrafficCompanyTypeChange = (value: TrafficCompanyType | null) => {
		setSelectedTrafficCompanyType(value);
		setSummary(null);
		formRef.current?.setFieldsValue({
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
	};

	const handleFinancialColumnsChange = (columns: ReportFinancialColumnKey[]) => {
		const fallback = isSmsCommissionService
			? SMS_COMMISSION_FINANCIAL_COLUMNS
			: isSmsService
				? getSmsFinancialDefaults(selectedSmsReportType)
				: DEFAULT_FINANCIAL_COLUMNS;
		const nextColumns = columns.length > 0 ? columns : fallback;
		setSelectedFinancialColumns(nextColumns);
	};

	const isPeriodDisabled = !selectedServiceId || !selectedYear || availabilityBase.isLoading;
	const isCompanyDisabled = !selectedServiceId || selectedPeriods.length === 0 || companies.isLoading || (selectedPeriods.length > 0 && availabilityByPeriods.isFetching) || (isTrafficService && !selectedTrafficCompanyType);

	const columns: ProColumns<PerformanceReportRow>[] = useMemo(() => {
		return getPerformanceReportColumns({
			t,
			serviceOptions,
			yearOptions,
			periodOptions,
			companyOptions,
			trafficCompanyTypeOptions,
			contractTypeOptions,
			smsReportTypeOptions,
			financialColumnOptions,
			selectedFinancialColumns,
			selectedSmsReportType,
			isSmsService,
			isSmsCommissionService,
			isTrafficService,
			isPeriodDisabled,
			isCompanyDisabled,
			onServiceChange: setSelectedService,
			onYearChange: handleYearChange,
			onPeriodsChange: handlePeriodsChange,
			onTrafficCompanyTypeChange: handleTrafficCompanyTypeChange,
			onContractTypeChange: handleContractTypeChange,
			onSmsReportTypeChange: handleSmsReportTypeChange,
			onFinancialColumnsChange: handleFinancialColumnsChange,
		});
	}, [
		t,
		serviceOptions,
		yearOptions,
		periodOptions,
		companyOptions,
		trafficCompanyTypeOptions,
		contractTypeOptions,
		smsReportTypeOptions,
		financialColumnOptions,
		selectedFinancialColumns,
		selectedSmsReportType,
		isSmsService,
		isSmsCommissionService,
		isTrafficService,
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

	const buildReportQuery = useCallback((page: number, pageSize: number, total = true) => {
		if (!selectedServiceId || !selectedServiceCode)
			return null;

		const formValues = formRef.current?.getFieldsValue?.(true) as Record<string, unknown> | undefined;
		const periods = normalizePeriods(formValues?.sh_periods ?? selectedPeriods);
		if (periods.length === 0)
			return null;

		const companyIds = normalizeNumberList(formValues?.company_ids);
		const trafficCompanyType = isTrafficService
			? (formValues?.company_type == null || formValues.company_type === "" ? undefined : String(formValues.company_type))
			: undefined;
		const contractType = String(formValues?.is_official ?? selectedContractType ?? "all") as SmsContractTypeFilter;
		const isOfficial = contractType === "official" ? true : contractType === "unofficial" ? false : undefined;

		return {
			service_id: selectedServiceId,
			service_code: selectedServiceCode,
			sh_periods: periods.join(","),
			company_ids: isSmsService ? undefined : companyIds.length > 0 ? companyIds.join(",") : undefined,
			company_type: trafficCompanyType,
			is_official: supportsContractType ? isOfficial : undefined,
			page,
			page_size: pageSize,
			total,
		};
	}, [isSmsService, isTrafficService, selectedContractType, selectedPeriods, selectedServiceId, selectedServiceCode, supportsContractType]);

	const exportColumns = useMemo(() => {
		return createPerformanceReportExportColumns({
			companyNameTitle: t("performance.columns.companyName"),
			yearTitle: t("performance.columns.year"),
			monthTitle: t("performance.columns.month"),
			operationTypeTitle: t("performance.columns.operationType"),
			contractTypeTitle: t("performance.columns.contractType"),
			monthNameByValue: getMonthLabel,
			operationTypeLabelByValue: getOperationTypeLabel,
			contractTypeLabelByValue: (isOfficial) => {
				if (isOfficial === true)
					return t("performance.contractType.official");
				if (isOfficial === false)
					return t("performance.contractType.unofficial");
				return "-";
			},
			financialColumnTitles: selectedFinancialColumnTitles,
		});
	}, [getMonthLabel, getOperationTypeLabel, selectedFinancialColumnTitles, t]);

	const fetchAllRowsForExport = useCallback(async () => {
		const initialQuery = buildReportQuery(1, 500, true);
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

		downloadPerformanceReportExcel({
			filename: `performance-report-${new Date().toISOString().slice(0, 10)}.xls`,
			title: t("performance.titles.performanceReport"),
			serviceLabel: t("performance.columns.service"),
			serviceName: selectedServiceName,
			rows: exportData.rows,
			columns: exportColumns,
			summary: exportData.summary,
			financialColumnTitles: selectedFinancialColumnTitles,
		});
	}, [exportColumns, fetchAllRowsForExport, selectedFinancialColumnTitles, selectedServiceName, t]);

	const handleDownloadPdf = useCallback(async () => {
		const exportData = await fetchAllRowsForExport();
		if (!exportData)
			return;

		try {
			openPerformanceReportPdfPrint({
				title: t("performance.titles.performanceReport"),
				serviceLabel: t("performance.columns.service"),
				serviceName: selectedServiceName,
				rows: exportData.rows,
				columns: exportColumns,
				summary: exportData.summary,
				financialColumnTitles: selectedFinancialColumnTitles,
			});
		}
		catch {
			window.$message?.warning(t("performance.messages.popupBlocked"));
		}
	}, [exportColumns, fetchAllRowsForExport, selectedFinancialColumnTitles, selectedServiceName, t]);

	const canExport = !!selectedServiceId && !!selectedServiceCode && selectedPeriods.length > 0;

	return (
		<BasicContent className="h-full">
			<BasicTable<PerformanceReportRow>
				adaptive
				autoSearchDebounceTime={400}
				rowKey={record => String(record.id)}
				columns={columns}
				actionRef={actionRef}
				formRef={formRef}
				search={{
					defaultCollapsed: false,
				}}
				form={{
					initialValues: {
						financial_columns: DEFAULT_FINANCIAL_COLUMNS,
						sms_report_type: "normal",
						company_type: undefined,
						is_official: "all",
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

					const formValues = params as Record<string, unknown>;
					const periods = normalizePeriods(formValues.sh_periods);
					if (periods.length === 0) {
						setSummary(null);
						return {
							data: [],
							total: 0,
							success: true,
						};
					}

					const companyIds = normalizeNumberList(formValues.company_ids);
					const trafficCompanyType = isTrafficService
						? (formValues.company_type == null || formValues.company_type === "" ? undefined : String(formValues.company_type))
						: undefined;
					const contractType = String(formValues.is_official ?? selectedContractType ?? "all") as SmsContractTypeFilter;
					const isOfficial = contractType === "official" ? true : contractType === "unofficial" ? false : undefined;

					const response = await fetchPerformanceReport({
						service_id: selectedServiceId,
						service_code: selectedServiceCode,
						sh_periods: periods.join(","),
						company_ids: isSmsService ? undefined : companyIds.length > 0 ? companyIds.join(",") : undefined,
						company_type: trafficCompanyType,
						is_official: supportsContractType ? isOfficial : undefined,
						page: params.current ?? 1,
						page_size: params.pageSize ?? 20,
						total: true,
					});

					setSummary(response.totals ?? null);

					return {
						data: response.results,
						total: response.count,
						success: true,
					};
				}}
				headerTitle={t("performance.titles.performanceReport")}
				toolBarRender={() => {
					const items: React.ReactNode[] = [];

					if (summary) {
						items.push(
							<Space key="summary" size={16} wrap>
								<Typography.Text>{`${t("performance.summary.totalCount")}: ${formatSummaryNumber(summary.value)}`}</Typography.Text>
								<Typography.Text>{`${t("performance.summary.totalIncome")}: ${formatSummaryNumber(summary.income_financial)}`}</Typography.Text>
								<Typography.Text>{`${t("performance.summary.totalExpense")}: ${formatSummaryNumber(summary.expense_financial)}`}</Typography.Text>
								<Typography.Text>{`${t("performance.summary.totalProfit")}: ${formatSummaryNumber(summary.profit_financial)}`}</Typography.Text>
							</Space>,
						);
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
