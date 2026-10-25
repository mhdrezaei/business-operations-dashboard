import type { ServiceDto } from "#src/api/common/common.types";
import type {
	PredictionSummaryPeriodMode,
	PredictionSummaryResponse,
	PredictionSummarySelectedPeriod,
} from "#src/features/performance/api/performances.api";
import type { TFunction } from "i18next";
import type { CSSProperties } from "react";
import type { PredictionSummaryDisplayRow, PredictionSummarySection } from "./predictions-summary-export";
import type { PredictionSummaryMetric } from "./predictions-summary-format";
import ContractFilterSearchIcon from "#src/assets/svg/header/contract-filter-search.svg?react";
import ReportResultsIcon from "#src/assets/svg/performance/report-results.svg?react";
import { BasicContent } from "#src/components";
import { fetchPredictionPerformanceSummary } from "#src/features/performance/api/performances.api";
import { normalizeServiceCode } from "#src/features/performance/shared/model/performance.helpers";
import { servicesQuery } from "#src/features/performance/shared/queries/performance.queries";
import { useAccess } from "#src/hooks";
import { dayjs } from "#src/shared/lib/dayjs-jalali";
import { DownOutlined, FileExcelOutlined, FilePdfOutlined, SearchOutlined, UpOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Checkbox, ConfigProvider, Empty, Form, InputNumber, Select, Space, Switch, Table, Tag, theme, Typography } from "antd";
import { useContext, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ReportPeriodPicker } from "./components/ReportPeriodPicker";
import { getReportDisplayMonth } from "./constants";
import {
	downloadPredictionSummaryExcel,
	formatSummaryMetric,
	getCurrencyLabel,
	getMetricLabel,
	getPeriodModeLabel,
	getSectionLabel,
	openPredictionSummaryPdfPrint,
} from "./predictions-summary-export";
import { formatCollocationUsage } from "./predictions-summary-format";
import "./predictions-summary-report.css";

type ReportMode = "separated" | "total";
type OutputMode = "classic" | "single-table";

interface PeriodSelection {
	id: string
	year: number
	values: number[]
}

const PERIOD_MODES: PredictionSummaryPeriodMode[] = ["shamsi_months", "fiscal_months", "shamsi_quarters", "fiscal_quarters"];

const START_YEAR = 1401;
const DEFAULT_YEAR = 1405;
const FUTURE_YEARS = 5;
const SUMMARY_SERVICE_CODES = ["openapi", "psp", "shahkar", "sms", "sms_commission", "traffic"];

const YEAR_OPTIONS = Array.from(
	{ length: Math.max(dayjs().calendar("jalali").year() + FUTURE_YEARS - START_YEAR + 1, 1) },
	(_, index) => START_YEAR + index,
).map(year => ({
	label: String(year),
	value: year,
}));

const METRIC_KEYS = [
	"value",
	"value_receive",
	"value_mbps",
	"value_receive_mbps",
	"value_gb_month",
	"value_receive_gb_month",
	"ip_count",
	"port_count",
	"bandwidth_used",
	"ampere_used",
	"income",
	"income_financial",
	"expense",
	"expense_financial",
	"profit",
	"profit_financial",
	"new_customer_count",
	"new_customer_income",
	"performance_income",
];

function isQuarterMode(periodMode: PredictionSummaryPeriodMode) {
	return periodMode === "shamsi_quarters" || periodMode === "fiscal_quarters";
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeApiServiceCode(code: string | null | undefined) {
	return normalizeServiceCode(code).replace(/-/g, "_");
}

function getMonthName(displayMonth: number, t: TFunction) {
	return t(`performance.months.${displayMonth}`, { defaultValue: String(displayMonth) });
}

function getPeriodValueOptions(periodMode: PredictionSummaryPeriodMode, t: TFunction) {
	if (isQuarterMode(periodMode)) {
		return [1, 2, 3, 4].map(value => ({
			label: t("performance.predictionsSummary.quarter", { value }),
			value,
		}));
	}

	const periodType = periodMode === "fiscal_months" ? "fiscal" : "sh";
	return Array.from({ length: 12 }, (_, index) => {
		const value = index + 1;
		const displayMonth = getReportDisplayMonth(value, periodType);
		return {
			label: getMonthName(displayMonth, t),
			value,
		};
	});
}

function getPeriodMonthLabel(month: number, periodMode: PredictionSummaryPeriodMode, t: TFunction) {
	const periodType = periodMode.startsWith("fiscal") ? "fiscal" : "sh";
	const displayMonth = getReportDisplayMonth(month, periodType);
	return getMonthName(displayMonth, t);
}

function formatPersianInteger(value: number | null | undefined) {
	if (value == null || !Number.isFinite(value))
		return "-";
	return value.toLocaleString("fa-IR", { useGrouping: false });
}

function getQuarterMonths(quarter: number) {
	const start = (quarter - 1) * 3 + 1;
	return [start, start + 1, start + 2];
}

function getRealMonthYear(year: number, month: number, periodMode: PredictionSummaryPeriodMode) {
	if (!Number.isFinite(year))
		return null;
	if (!periodMode.startsWith("fiscal"))
		return year;

	return month >= 1 && month <= 3 ? year - 1 : year;
}

function formatRealMonthsLabel(
	year: number,
	months: Array<{ month: number, year?: number | null, isActualShamsiMonth?: boolean }>,
	periodMode: PredictionSummaryPeriodMode,
	t: TFunction,
) {
	const realMonths = months.map(item => ({
		label: getPeriodMonthLabel(item.month, item.isActualShamsiMonth ? "shamsi_months" : periodMode, t),
		year: item.year ?? getRealMonthYear(year, item.month, periodMode),
	}));

	if (realMonths.length === 0)
		return "-";

	const firstMonth = realMonths[0];
	const lastMonth = realMonths[realMonths.length - 1];

	const yearLabel = firstMonth.year == null ? "" : t("performance.predictionsSummary.yearPrefix", { year: formatPersianInteger(firstMonth.year) });

	if (realMonths.length === 1)
		return `${yearLabel}${firstMonth.label}`;

	if (firstMonth.year != null && lastMonth.year != null && firstMonth.year !== lastMonth.year) {
		return t("performance.predictionsSummary.monthRangeCrossYear", {
			from: firstMonth.label,
			fromYear: formatPersianInteger(firstMonth.year),
			to: lastMonth.label,
			toYear: formatPersianInteger(lastMonth.year),
		});
	}

	return `${yearLabel}${t("performance.predictionsSummary.monthRange", { from: firstMonth.label, to: lastMonth.label })}`;
}

function getPeriodMonthsLabel(period: Record<string, unknown>, periodMode: PredictionSummaryPeriodMode, t: TFunction) {
	const year = Number(period.year);
	const month = Number(period.month);
	const quarter = Number(period.quarter);
	const monthsExpanded = Array.isArray(period.months_expanded)
		? period.months_expanded.map((item) => {
			if (isPlainRecord(item)) {
				return {
					month: Number(item.sh_month),
					year: Number.isFinite(Number(item.sh_year)) ? Number(item.sh_year) : null,
					isActualShamsiMonth: true,
				};
			}
			return { month: Number(item) };
		}).filter(item => Number.isFinite(item.month) && item.month >= 1 && item.month <= 12)
		: [];
	let months: Array<{ month: number, year?: number | null, isActualShamsiMonth?: boolean }> = [];
	if (monthsExpanded.length > 0)
		months = monthsExpanded;
	else if (Number.isFinite(month) && month >= 1 && month <= 12)
		months = [{ month }];
	else if (Number.isFinite(quarter) && quarter >= 1 && quarter <= 4)
		months = getQuarterMonths(quarter).map(item => ({ month: item }));

	return formatRealMonthsLabel(year, months, periodMode, t);
}

function getPeriodLabel(period: Record<string, unknown>, periodMode: PredictionSummaryPeriodMode, t: TFunction) {
	const year = Number(period.year);
	const month = Number(period.month);
	const quarter = Number(period.quarter);
	if (Number.isFinite(month) && month > 0)
		return t("performance.predictionsSummary.periodMonth", { year: formatPersianInteger(year), month: formatPersianInteger(month) });
	if (Number.isFinite(quarter) && quarter > 0)
		return t("performance.predictionsSummary.periodQuarter", { year: formatPersianInteger(year), quarter: formatPersianInteger(quarter) });

	const monthsExpanded = Array.isArray(period.months_expanded)
		? period.months_expanded.map(item => Number(isPlainRecord(item) ? item.sh_month : item)).filter(Number.isFinite)
		: [];
	if (monthsExpanded.length > 0)
		return t("performance.predictionsSummary.periodMonths", { year: formatPersianInteger(year), months: monthsExpanded.map(formatPersianInteger).join(t("performance.predictionsSummary.listSeparator")) });

	return Number.isFinite(year) ? formatPersianInteger(year) : getPeriodModeLabel(periodMode, t);
}

function getPeriodStableKey(period: Record<string, unknown>, periodMode: PredictionSummaryPeriodMode, t: TFunction) {
	return [
		period.calendar_type,
		period.bucket_type,
		period.year,
		period.month,
		period.quarter,
		getPeriodLabel(period, periodMode, t),
	].map(item => String(item ?? "")).join("-");
}

function pickFirstMetricValue(record: Record<string, unknown>, keys: string[]) {
	for (const key of keys) {
		const value = record[key];
		if (value !== undefined && value !== null && value !== "")
			return value;
	}
	return null;
}

function pickTrafficMetric(record: Record<string, unknown>, candidates: Array<{ key: string, unit: string | null }>) {
	for (const candidate of candidates) {
		const value = record[candidate.key];
		if (value !== undefined && value !== null && value !== "") {
			return {
				value,
				unit: candidate.unit,
			};
		}
	}
	return {
		value: null,
		unit: null,
	};
}

function hasMetricLeaf(record: Record<string, unknown>) {
	return METRIC_KEYS.some(key => key in record && !isPlainRecord(record[key]) && !Array.isArray(record[key]));
}

function flattenMetricRecords(value: unknown, path: string[] = []): Array<{ typeLabel: string, record: Record<string, unknown> }> {
	if (!isPlainRecord(value))
		return [];

	if (hasMetricLeaf(value)) {
		return [{
			typeLabel: path.length > 0 ? path.join(" / ") : "TOTAL",
			record: value,
		}];
	}

	return Object.entries(value).flatMap(([key, child]) => {
		if (!isPlainRecord(child))
			return [];
		return flattenMetricRecords(child, [...path, key]);
	});
}

function normalizeTypeToken(value: string) {
	return value.trim().toUpperCase().replace(/-/g, "_");
}

const OPENAPI_TYPE_LABEL_KEYS: Record<string, string> = {
	RECEIPT_REGISTER: "performance.operationType.receiptRegister",
	BILL_INQUIRY: "performance.operationType.billInquiry",
	BILL_INQUIRY_MIDTERM: "performance.predictionsSummary.types.BILL_INQUIRY_MIDTERM",
	BILL_INQUIRY_ENDTERM: "performance.predictionsSummary.types.BILL_INQUIRY_ENDTERM",
	RECEIPT_REGISTER_CONNECTED: "performance.predictionsSummary.types.RECEIPT_REGISTER_CONNECTED",
	RECEIPT_REGISTER_DISCONNECTED: "performance.predictionsSummary.types.RECEIPT_REGISTER_DISCONNECTED",
	SMS: "performance.predictionsSummary.types.SMS",
	TRAFFIC: "performance.predictionsSummary.types.TRAFFIC",
};

const SMS_TYPE_LABEL_KEYS: Record<string, string> = {
	KARASHAB: "performance.predictionsSummary.types.KARASHAB",
	NON_TELECOM: "performance.predictionsSummary.types.NON_TELECOM",
	TELECOM: "performance.predictionsSummary.types.TELECOM",
};

const TRAFFIC_REGION_LABEL_KEYS: Record<string, string> = {
	TEHRAN: "performance.predictionsSummary.regions.tehran",
	COUNTY: "performance.predictionsSummary.regions.county",
};

function getOpenApiTypeLabel(token: string, t: TFunction) {
	const key = OPENAPI_TYPE_LABEL_KEYS[token];
	return key ? t(key) : null;
}

function getSmsTypeLabel(token: string, t: TFunction) {
	if (token === "CP")
		return token;
	const key = SMS_TYPE_LABEL_KEYS[token];
	return key ? t(key) : null;
}

function getTrafficTypeLabel(parts: string[], t: TFunction) {
	const first = normalizeTypeToken(parts[0] ?? "");
	const second = normalizeTypeToken(parts[1] ?? "");

	if (first === "COLLOCATION")
		return "COLLOCATION";
	const regionKey = TRAFFIC_REGION_LABEL_KEYS[second];
	const isCpCounty = first === "CP" && second === "COUNTY";
	const isTehranType = second === "TEHRAN" && ["CP", "IXP", "TCI", "PREMIUM"].includes(first);
	if (!regionKey || !(isCpCounty || isTehranType))
		return null;
	return t("performance.predictionsSummary.trafficType", { type: first === "PREMIUM" ? "Premium" : first, region: t(regionKey) });
}

function formatTypeLabel(serviceCode: string, typeLabel: string, t: TFunction) {
	const normalizedServiceCode = normalizeApiServiceCode(serviceCode);
	const parts = typeLabel.split("/").map(part => part.trim()).filter(Boolean);
	const token = normalizeTypeToken(typeLabel);
	const firstToken = normalizeTypeToken(parts[0] ?? typeLabel);

	if (token === "TOTAL")
		return t("performance.predictionsSummary.total");

	if (normalizedServiceCode === "openapi")
		return getOpenApiTypeLabel(token, t) ?? typeLabel;

	if (normalizedServiceCode === "sms" || normalizedServiceCode === "sms_commission")
		return getSmsTypeLabel(firstToken, t) ?? getOpenApiTypeLabel(token, t) ?? typeLabel;

	if (normalizedServiceCode === "traffic")
		return getTrafficTypeLabel(parts, t) ?? getSmsTypeLabel(firstToken, t) ?? typeLabel;

	if (normalizedServiceCode === "shahkar")
		return getSmsTypeLabel(firstToken, t) ?? typeLabel;

	if (normalizedServiceCode === "psp")
		return getOpenApiTypeLabel(token, t) ?? typeLabel;

	return typeLabel;
}

function shouldIncludeMetricType(serviceCode: string, typeLabel: string) {
	if (normalizeApiServiceCode(serviceCode) !== "openapi")
		return true;

	const rootType = normalizeTypeToken(typeLabel.split("/")[0] ?? typeLabel);
	return rootType !== "SMS" && rootType !== "TRAFFIC";
}

function renderMultiline(text: string) {
	const lines = text.split("\n");
	if (lines.length === 1)
		return text;
	return (
		<Space direction="vertical" size={0}>
			{lines.map(line => (
				<Typography.Text key={line}>{line}</Typography.Text>
			))}
		</Space>
	);
}

function normalizeSummaryRows(response: PredictionSummaryResponse | null | undefined, serviceNameByCode: Map<string, string>, t: TFunction) {
	const services = response?.services ?? [];
	return services.flatMap((service, serviceIndex) => {
		const serviceCode = normalizeApiServiceCode(service.service_code);
		const serviceName = serviceNameByCode.get(serviceCode) ?? String(service.service_code ?? "-");
		const periodMode = (service.period_mode || "shamsi_months") as PredictionSummaryPeriodMode;

		return (service.periods ?? []).flatMap((period, periodIndex) => {
			const periodLabel = getPeriodLabel(period, periodMode, t);
			const periodMonthsLabel = getPeriodMonthsLabel(period, periodMode, t);
			const isFiscal = periodMode.startsWith("fiscal");

			return (["performance", "predictions"] as PredictionSummarySection[]).flatMap((section) => {
				const sectionRows = flattenMetricRecords(period[section])
					.filter(item => shouldIncludeMetricType(serviceCode, item.typeLabel));
				return sectionRows.map((item, rowIndex): PredictionSummaryDisplayRow => {
					const sentTraffic = pickTrafficMetric(item.record, [
						{ key: "value_gb_month", unit: "GB/month" },
						{ key: "value_mbps", unit: "Mbps" },
						{ key: "value", unit: null },
					]);
					const receivedTraffic = pickTrafficMetric(item.record, [
						{ key: "value_receive_gb_month", unit: "GB/month" },
						{ key: "value_receive_mbps", unit: "Mbps" },
						{ key: "value_receive", unit: null },
					]);
					const isTrafficCollocation = serviceCode === "traffic" && normalizeTypeToken(item.typeLabel.split("/")[0] ?? "") === "COLLOCATION";
					return {
						key: `${serviceIndex}-${periodIndex}-${section}-${rowIndex}-${item.typeLabel}`,
						serviceCode,
						serviceName,
						periodKey: getPeriodStableKey(period, periodMode, t),
						periodLabel,
						periodMonthsLabel,
						isFiscal,
						yearLabel: Number.isFinite(Number(period.year))
							? Number(period.year).toLocaleString("fa-IR", { useGrouping: false })
							: "-",
						section,
						typeLabel: formatTypeLabel(serviceCode, item.typeLabel, t),
						value: pickFirstMetricValue(item.record, ["value", "count", "ip_count", "port_count", "bandwidth_used", "ampere_used"]),
						sentTraffic: sentTraffic.value,
						sentTrafficUnit: sentTraffic.unit,
						sentTrafficMbps: pickFirstMetricValue(item.record, ["value_mbps"]),
						sentTrafficGbMonth: pickFirstMetricValue(item.record, ["value_gb_month"]),
						receivedTraffic: receivedTraffic.value,
						receivedTrafficUnit: receivedTraffic.unit,
						receivedTrafficMbps: pickFirstMetricValue(item.record, ["value_receive_mbps"]),
						receivedTrafficGbMonth: pickFirstMetricValue(item.record, ["value_receive_gb_month"]),
						trafficResourcesLabel: formatCollocationUsage(item.record, t),
						isTrafficCollocation,
						income: pickFirstMetricValue(item.record, ["income", "income_financial"]),
						expense: pickFirstMetricValue(item.record, ["expense", "expense_financial"]),
						profit: pickFirstMetricValue(item.record, ["profit", "profit_financial"]),
						newCustomerCount: pickFirstMetricValue(item.record, ["new_customer_count"]),
						newCustomerIncome: pickFirstMetricValue(item.record, ["new_customer_income"]),
						performanceIncome: pickFirstMetricValue(item.record, ["performance_income"]),
					};
				});
			});
		});
	});
}

function buildSelectedPeriods(periodMode: PredictionSummaryPeriodMode, selections: PeriodSelection[]): PredictionSummarySelectedPeriod[] {
	const useQuarters = isQuarterMode(periodMode);
	return selections.reduce<PredictionSummarySelectedPeriod[]>((acc, selection) => {
		const values = Array.from(new Set(selection.values))
			.filter(value => Number.isInteger(value) && value >= 1 && value <= (useQuarters ? 4 : 12))
			.sort((a, b) => a - b);

		if (values.length === 0)
			return acc;

		acc.push(useQuarters
			? { year: selection.year, quarters: values }
			: { year: selection.year, months: values });
		return acc;
	}, []).sort((a, b) => a.year - b.year);
}

function getQueryPeriodEntries(periodsJson: string | undefined) {
	if (!periodsJson)
		return [];
	try {
		const periods = JSON.parse(periodsJson) as unknown;
		if (!Array.isArray(periods))
			return [];
		return periods.flatMap((period) => {
			if (!isPlainRecord(period))
				return [];
			const values = Array.isArray(period.quarters) ? period.quarters : Array.isArray(period.months) ? period.months : [];
			return values.map(value => ({ year: Number(period.year), value: Number(value) }));
		});
	}
	catch {
		return [];
	}
}

function getExportServicesLabel(serviceCodes: string | undefined, serviceNameByCode: Map<string, string>, t: TFunction) {
	const codes = serviceCodes?.split(",").map(value => value.trim()).filter(Boolean) ?? [];
	if (codes.length === 1)
		return serviceNameByCode.get(codes[0]) ?? codes[0];
	return t("performance.predictionsSummary.servicesCount", { total: formatPersianInteger(codes.length) });
}

function getExportPeriodsLabel(periodsJson: string | undefined, periodMode: PredictionSummaryPeriodMode, t: TFunction) {
	const entries = getQueryPeriodEntries(periodsJson);
	if (entries.length !== 1)
		return t("performance.titles.performanceReportPeriodCount", { periodCount: formatPersianInteger(entries.length) });
	const [{ year, value }] = entries;
	const valueLabel = getPeriodValueOptions(periodMode, t).find(option => option.value === value)?.label ?? String(value);
	return `${formatPersianInteger(year)} / ${valueLabel}`;
}

function buildSummaryQuery({
	serviceCodes,
	periodMode,
	reportMode,
	periodSelections,
	defaultConversionRatio,
}: {
	serviceCodes: string[]
	periodMode: PredictionSummaryPeriodMode
	reportMode: ReportMode
	periodSelections: PeriodSelection[]
	defaultConversionRatio?: number | null
}) {
	const periods = buildSelectedPeriods(periodMode, periodSelections);
	const hasTrafficService = serviceCodes.includes("traffic");
	return {
		service_codes: serviceCodes.join(","),
		period_mode: periodMode,
		periods: JSON.stringify(periods),
		total: reportMode === "total",
		default_conversion_ratio: hasTrafficService && defaultConversionRatio != null && defaultConversionRatio > 0 ? defaultConversionRatio : undefined,
	};
}

function validateFilters(serviceCodes: string[], periodSelections: PeriodSelection[], t: TFunction) {
	if (serviceCodes.length === 0)
		return t("performance.predictionsSummary.validation.selectService");
	if (periodSelections.length === 0)
		return t("performance.predictionsSummary.validation.addYear");
	if (periodSelections.some(selection => selection.values.length === 0))
		return t("performance.predictionsSummary.validation.selectPeriodValues");
	return null;
}

function createPeriodSelection(year: number): PeriodSelection {
	return {
		id: `${year}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
		year,
		values: [],
	};
}

export function PredictionsSummaryReportPage() {
	const { t } = useTranslation();
	const { getPermittedServiceIds } = useAccess();
	const { token } = theme.useToken();
	const antdContext = useContext(ConfigProvider.ConfigContext);
	const configuredCardRadius = antdContext.theme?.components?.Card?.borderRadiusLG;
	const filterRadius = typeof configuredCardRadius === "number" ? configuredCardRadius : token.borderRadiusLG;
	const [filterCollapsed, setFilterCollapsed] = useState(false);
	const [serviceCodes, setServiceCodes] = useState<string[]>([]);
	const [periodMode, setPeriodMode] = useState<PredictionSummaryPeriodMode>("fiscal_quarters");
	const [reportMode, setReportMode] = useState<ReportMode>("separated");
	const [outputMode, setOutputMode] = useState<OutputMode>("classic");
	const [showRial, setShowRial] = useState(true);
	const [defaultConversionRatio, setDefaultConversionRatio] = useState<number | null>(null);
	const [periodSelections, setPeriodSelections] = useState<PeriodSelection[]>(() => [createPeriodSelection(DEFAULT_YEAR)]);
	const [validationError, setValidationError] = useState<string | null>(null);

	const services = useQuery(servicesQuery());
	const permittedIds = [...new Set([
		...getPermittedServiceIds("performances", "view"),
		...getPermittedServiceIds("predictions", "view"),
	])];
	const permittedIdSet = useMemo(() => new Set(permittedIds), [permittedIds.join(",")]);

	const serviceOptions = useMemo(() => {
		return (services.data?.results ?? [])
			.filter(service => permittedIdSet.has(Number(service.id)))
			.map((service: ServiceDto) => ({
				label: service.name,
				value: normalizeApiServiceCode(service.code),
			}))
			.filter(option => SUMMARY_SERVICE_CODES.includes(option.value))
			.sort((a, b) => SUMMARY_SERVICE_CODES.indexOf(a.value) - SUMMARY_SERVICE_CODES.indexOf(b.value));
	}, [services.data, permittedIds.join(",")]);

	const serviceNameByCode = useMemo(() => {
		return new Map(serviceOptions.map(option => [option.value, option.label]));
	}, [serviceOptions]);
	const hasTrafficService = serviceCodes.includes("traffic");

	const pickerKind = isQuarterMode(periodMode) ? "quarter" : "month";
	const periodModeOptions = useMemo(() => PERIOD_MODES.map(value => ({ label: getPeriodModeLabel(value, t), value })), [t]);
	const periodValueOptions = useMemo(() => getPeriodValueOptions(periodMode, t), [periodMode, t]);
	const summaryPeriodOptions = useMemo(() => YEAR_OPTIONS.flatMap(year => periodValueOptions.map(value => ({
		label: `${year.label} - ${value.label}`,
		value: `${year.value}-${value.value}`,
	}))), [periodValueOptions]);
	const selectedPeriodValues = useMemo(() => periodSelections.flatMap(selection => selection.values.map(value => `${selection.year}-${value}`)), [periodSelections]);

	const mutation = useMutation({
		mutationFn: fetchPredictionPerformanceSummary,
	});

	const rows = useMemo(() => normalizeSummaryRows(mutation.data, serviceNameByCode, t), [mutation.data, serviceNameByCode, t]);
	const hasServices = (mutation.data?.services ?? []).length > 0;
	const exportMeta = useMemo(() => ({
		servicesLabel: getExportServicesLabel(mutation.variables?.service_codes, serviceNameByCode, t),
		periodsLabel: getExportPeriodsLabel(mutation.variables?.periods, mutation.variables?.period_mode ?? periodMode, t),
		periodMode: mutation.variables?.period_mode ?? periodMode,
		showRial,
		t,
	}), [serviceNameByCode, t, mutation.variables?.period_mode, mutation.variables?.periods, mutation.variables?.service_codes, periodMode, showRial]);
	const canExport = rows.length > 0 && !mutation.isPending;

	const handleDownloadExcel = () => {
		if (!canExport)
			return;
		try {
			downloadPredictionSummaryExcel({
				filename: `predictions-performance-summary-${new Date().toISOString().slice(0, 10)}.xls`,
				rows,
				meta: exportMeta,
				mode: outputMode,
			});
		}
		catch {
			window.$message?.error(t("performance.predictionsSummary.messages.exportFailed"));
		}
	};

	const handleDownloadPdf = () => {
		if (!canExport || outputMode !== "classic")
			return;
		try {
			openPredictionSummaryPdfPrint(rows, exportMeta);
		}
		catch {
			window.$message?.warning(t("performance.predictionsSummary.messages.popupBlocked"));
		}
	};

	const handlePeriodModeChange = (value: PredictionSummaryPeriodMode) => {
		setPeriodMode(value);
		setPeriodSelections(prev => prev.map(selection => ({
			...selection,
			values: [],
		})));
	};

	const handleApplyReport = () => {
		const error = validateFilters(serviceCodes, periodSelections, t);
		setValidationError(error);
		if (error)
			return;

		const query = buildSummaryQuery({
			serviceCodes,
			periodMode,
			reportMode,
			periodSelections,
			defaultConversionRatio,
		});
		mutation.mutate(query);
	};

	const handleSelectedPeriodValuesChange = (values: string[]) => {
		const existingIds = new Map(periodSelections.map(selection => [selection.year, selection.id]));
		const groupedValues = new Map<number, number[]>();
		values.forEach((value) => {
			const [yearRaw, periodRaw] = value.split("-");
			const year = Number(yearRaw);
			const period = Number(periodRaw);
			if (!Number.isInteger(year) || !Number.isInteger(period))
				return;
			groupedValues.set(year, [...(groupedValues.get(year) ?? []), period]);
		});
		setPeriodSelections([...groupedValues.entries()]
			.sort(([firstYear], [secondYear]) => firstYear - secondYear)
			.map(([year, selectedValues]) => ({
				id: existingIds.get(year) ?? `summary-period-${year}`,
				year,
				values: [...selectedValues].sort((first, second) => first - second),
			})));
	};

	const sectionColumn = {
		title: t("performance.predictionsSummary.columns.section"),
		dataIndex: "section",
		width: 120,
		render: (section: PredictionSummarySection) => (
			<Tag color={section === "performance" ? "success" : "processing"}>
				{getSectionLabel(section, t)}
			</Tag>
		),
	};
	const currencyUnit = getCurrencyLabel(showRial, t);
	const metricColumn = (title: string, metric: PredictionSummaryMetric, width: number) => ({
		title,
		dataIndex: metric,
		width,
		render: (_: unknown, row: PredictionSummaryDisplayRow) => renderMultiline(formatSummaryMetric(row, metric, showRial)),
	});
	const currencyMetricColumn = (metric: PredictionSummaryMetric, width: number) => metricColumn(`${getMetricLabel(metric, t)} (${currencyUnit})`, metric, width);
	const financialColumns = [
		currencyMetricColumn("income", 160),
		currencyMetricColumn("expense", 160),
		currencyMetricColumn("profit", 160),
	];

	const metricColumns = [
		sectionColumn,
		{ title: t("performance.predictionsSummary.columns.type"), dataIndex: "typeLabel", width: 180 },
		metricColumn(getMetricLabel("value", t), "value", 140),
		...financialColumns,
	];

	const shahkarMetricColumns = [
		...metricColumns,
		metricColumn(getMetricLabel("new_customer_count", t), "new_customer_count", 160),
		currencyMetricColumn("new_customer_income", 190),
		currencyMetricColumn("performance_income", 190),
	];

	const trafficMetricColumns = [
		sectionColumn,
		{ title: t("performance.predictionsSummary.columns.type"), dataIndex: "typeLabel", width: 190 },
		metricColumn(t("performance.fields.traffic.sentTraffic"), "value", 230),
		metricColumn(getMetricLabel("value_receive", t), "value_receive", 230),
		...financialColumns,
	];
	const renderClassicResults = () => {
		const servicesList = mutation.data?.services ?? [];
		if (!hasServices)
			return <Empty description={t("performance.messages.noReportData")} />;

		return (
			<Space direction="vertical" size={16} className="w-full">
				{servicesList.map((service) => {
					const code = normalizeApiServiceCode(service.service_code);
					const serviceRows = rows.filter(row => row.serviceCode === code);
					const serviceKey = service.service_id != null ? String(service.service_id) : code;
					const tableColumns = code === "traffic" ? trafficMetricColumns : code === "shahkar" ? shahkarMetricColumns : metricColumns;
					return (
						<Card
							key={serviceKey}
							title={serviceNameByCode.get(code) ?? service.service_code ?? "-"}
							extra={<Typography.Text type="secondary">{`service_id: ${service.service_id ?? "-"}`}</Typography.Text>}
						>
							{(service.periods ?? []).length === 0
								? <Empty description={t("performance.predictionsSummary.noPeriods")} />
								: (
									<Space direction="vertical" size={16} className="w-full">
										{(service.periods ?? []).map((period) => {
											const effectivePeriodMode = (service.period_mode || periodMode) as PredictionSummaryPeriodMode;
											const label = getPeriodLabel(period, effectivePeriodMode, t);
											const monthsLabel = getPeriodMonthsLabel(period, effectivePeriodMode, t);
											const periodRows = serviceRows.filter(row => row.periodLabel === label);
											return (
												<Card key={getPeriodStableKey(period, effectivePeriodMode, t)} size="small" title={label} extra={<Tag>{getPeriodModeLabel(effectivePeriodMode, t)}</Tag>}>
													{monthsLabel !== "-" && (
														<Typography.Text type="secondary" className="mb-3 block">
															{`${t("performance.predictionsSummary.columns.realMonths")}: ${monthsLabel}`}
														</Typography.Text>
													)}
													<Table
														className="predictions-summary-results__table basic-table-grid"
														size="small"
														rowKey="key"
														columns={tableColumns}
														dataSource={periodRows}
														pagination={false}
														scroll={{ x: code === "traffic" ? 1250 : code === "shahkar" ? 1360 : 900 }}
														locale={{ emptyText: t("performance.predictionsSummary.noRows") }}
													/>
												</Card>
											);
										})}
									</Space>
								)}
						</Card>
					);
				})}
			</Space>
		);
	};

	return (
		<BasicContent className="h-full">
			<Space direction="vertical" size={16} className="w-full">
				<Typography.Title level={4} className="!mb-0">
					{t("common.menu.predictionsSummaryReport")}
				</Typography.Title>

				<section
					className={`basic-table-shell predictions-summary-filter ${filterCollapsed ? "basic-table-shell--collapsed" : ""}`}
					style={{
						"--basic-table-filter-margin": `${token.marginLG}px`,
						"--basic-table-filter-padding": `${token.paddingLG}px`,
						"--basic-table-filter-padding-top": `${token.paddingLG + token.controlHeightLG + token.marginSM}px`,
						"--basic-table-filter-border": `${token.lineWidth}px solid ${token.colorBorderSecondary}`,
						"--basic-table-filter-radius": `${filterRadius}px`,
						"--basic-table-filter-background": token.colorBgContainer,
						"--basic-table-filter-shadow": token.boxShadowTertiary,
						"--basic-table-filter-heading": token.colorTextHeading,
						"--basic-table-filter-secondary": token.colorTextTertiary,
						"--basic-table-filter-text": token.colorText,
						"--basic-table-filter-split": token.colorSplit,
						"--basic-table-filter-fill": token.colorFillSecondary,
						"--basic-table-filter-primary": token.colorPrimary,
						"--basic-table-filter-primary-bg": token.colorPrimaryBg,
						"--basic-table-filter-control-radius": `${token.borderRadius}px`,
						"--basic-table-filter-line-width": `${token.lineWidth}px`,
						"--basic-table-filter-dash-length": `${Math.max(token.sizeXS - token.lineWidthBold, 1)}px`,
						"--basic-table-filter-dash-gap": `${token.paddingXXS}px`,
						"--basic-table-filter-label-weight": token.fontWeightStrong,
						"--basic-table-heading-icon-size": `${token.controlHeightLG + token.paddingSM}px`,
						"--basic-table-heading-icon-radius": `${token.borderRadiusLG}px`,
					} as CSSProperties}
				>
					<div
						className="basic-table-filter-heading"
						role="button"
						tabIndex={0}
						aria-expanded={!filterCollapsed}
						onClick={() => setFilterCollapsed(current => !current)}
						onKeyDown={(event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								setFilterCollapsed(current => !current);
							}
						}}
					>
						<span className="basic-table-filter-heading__icon"><ContractFilterSearchIcon /></span>
						<div className="basic-table-filter-heading__copy">
							<div className="basic-table-filter-heading__title">{t("performance.predictionsSummary.filters.title")}</div>
							<div className="basic-table-filter-heading__subtitle">{t("performance.predictionsSummary.filters.subtitle")}</div>
						</div>
						<button
							type="button"
							className="basic-table-filter-toggle"
							aria-label={t(filterCollapsed ? "performance.predictionsSummary.filters.open" : "performance.predictionsSummary.filters.close")}
							aria-expanded={!filterCollapsed}
							onClick={(event) => {
								event.stopPropagation();
								setFilterCollapsed(current => !current);
							}}
						>
							{filterCollapsed ? <DownOutlined /> : <UpOutlined />}
						</button>
					</div>
					<div className="ant-pro-table-search" style={{ marginBlockEnd: 0 }}>
						<div className="ant-pro-query-filter">
							<Space direction="vertical" size={20} className="predictions-summary-filter__content w-full">
								<div className="predictions-summary-filter__fields grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
									<Form.Item label={t("performance.predictionsSummary.services")} className="!mb-0">
										<Select
											mode="multiple"
											allowClear
											maxTagCount="responsive"
											loading={services.isLoading}
											value={serviceCodes}
											options={serviceOptions}
											placeholder={t("performance.predictionsSummary.servicesPlaceholder")}
											className="w-full"
											onChange={values => setServiceCodes(values)}
											popupRender={(menu) => {
												const allValues = serviceOptions.map(option => option.value);
												const allSelected = allValues.length > 0 && allValues.every(value => serviceCodes.includes(value));
												return (
													<>
														<div className="px-3 py-1">
															<Checkbox
																checked={allSelected}
																indeterminate={!allSelected && serviceCodes.length > 0}
																onChange={event => setServiceCodes(event.target.checked ? allValues : [])}
															>
																{t("performance.labels.selectAll")}
															</Checkbox>
														</div>
														{menu}
													</>
												);
											}}
										/>
									</Form.Item>

									<Form.Item label={t("performance.predictionsSummary.reportMode")} className="!mb-0">
										<Select
											value={reportMode}
											className="w-full"
											onChange={setReportMode}
											options={[
												{ label: t("performance.predictionsSummary.reportModes.separated"), value: "separated" },
												{ label: t("performance.predictionsSummary.reportModes.total"), value: "total" },
											]}
										/>
									</Form.Item>

									<Form.Item label={t("performance.predictionsSummary.outputMode")} className="!mb-0">
										<Select
											value={outputMode}
											className="w-full"
											onChange={setOutputMode}
											options={[
												{ label: t("performance.predictionsSummary.outputModes.classic"), value: "classic" },
												{ label: t("performance.predictionsSummary.outputModes.singleTable"), value: "single-table" },
											]}
										/>
									</Form.Item>
								</div>

								<ReportPeriodPicker
									key={periodMode}
									yearOptions={YEAR_OPTIONS}
									periodOptions={summaryPeriodOptions}
									periodTypeOptions={periodModeOptions}
									selectedPeriodType={periodMode}
									selectedPeriods={selectedPeriodValues}
									valueOptions={periodValueOptions}
									defaultDraftYear={DEFAULT_YEAR}
									embedded
									copy={{
										sectionLabel: t(`performance.predictionsSummary.picker.${pickerKind}.section`),
										valueLabel: t(`performance.predictionsSummary.picker.${pickerKind}.value`),
										selectedLabel: t(`performance.predictionsSummary.picker.${pickerKind}.selected`),
										selectedUnit: t(`performance.predictionsSummary.picker.${pickerKind}.unit`),
										emptyText: t(`performance.predictionsSummary.picker.${pickerKind}.empty`),
									}}
									onPeriodTypeChange={handlePeriodModeChange}
									onPeriodsChange={handleSelectedPeriodValuesChange}
								/>

								{hasTrafficService && (
									<div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
										<div className="predictions-summary-filter__conversion">
											<Typography.Text strong>{t("performance.predictionsSummary.conversionRatio.label")}</Typography.Text>
											<InputNumber
												min={0}
												step={0.01}
												precision={4}
												value={defaultConversionRatio ?? undefined}
												placeholder={t("performance.predictionsSummary.conversionRatio.placeholder")}
												className="w-full"
												onChange={(value) => {
													const numeric = value == null ? null : Number(value);
													setDefaultConversionRatio(Number.isFinite(numeric as number) ? Number(numeric) : null);
												}}
											/>
											<Typography.Text type="secondary">
												{t("performance.predictionsSummary.conversionRatio.hint")}
											</Typography.Text>
										</div>
									</div>
								)}

								<div className="predictions-summary-filter__actions flex flex-wrap items-center justify-between gap-3">
									<Space>
										<Switch checked={showRial} onChange={setShowRial} />
										<Typography.Text>{t("performance.predictionsSummary.showRial")}</Typography.Text>
									</Space>

									<Button type="primary" icon={<SearchOutlined />} loading={mutation.isPending} onClick={handleApplyReport}>
										{t("performance.predictionsSummary.apply")}
									</Button>
								</div>

								{validationError && <Alert type="warning" showIcon message={validationError} />}
							</Space>
						</div>
					</div>
				</section>

				{mutation.isError && (
					<Alert
						type="error"
						showIcon
						message={t("performance.predictionsSummary.error.title")}
						description={t("performance.predictionsSummary.error.description")}
					/>
				)}

				<Card
					className="predictions-summary-results basic-table-shell"
					style={{
						"--basic-table-border": `${token.lineWidth}px solid ${token.colorBorderSecondary}`,
						"--basic-table-background": token.colorBgContainer,
						"--basic-table-table-radius": `${filterRadius}px`,
						"--basic-table-row-background": token.colorBgContainer,
						"--basic-table-header-background": `color-mix(in srgb, ${token.colorBgContainer} 88%, ${token.colorPrimary} 12%)`,
						"--basic-table-header-color": token.colorTextHeading,
						"--basic-table-row-hover": token.colorFillTertiary,
						"--basic-table-heading-color": token.colorTextHeading,
						"--basic-table-subtitle-color": token.colorTextTertiary,
						"--basic-table-cell-padding-inline": `${token.paddingMD}px`,
						"--basic-table-cell-padding-block": `${token.paddingSM}px`,
					} as CSSProperties}
					title={(
						<div className="basic-table-toolbar-heading">
							<span className="basic-table-toolbar-heading__icon" aria-hidden="true"><ReportResultsIcon /></span>
							<span className="basic-table-toolbar-heading__copy">
								<span className="basic-table-toolbar-heading__title">{`${t("performance.titles.performanceReportResults")} (${getCurrencyLabel(showRial, t)})`}</span>
								<span className="basic-table-toolbar-heading__subtitle">{t("performance.predictionsSummary.resultsSubtitle")}</span>
							</span>
						</div>
					)}
					loading={mutation.isPending}
					extra={(
						<Space wrap>
							<Button icon={<FileExcelOutlined />} disabled={!canExport} onClick={handleDownloadExcel}>
								{t("performance.predictionsSummary.exportExcel")}
							</Button>
							{outputMode === "classic" && (
								<Button icon={<FilePdfOutlined />} disabled={!canExport} onClick={handleDownloadPdf}>
									{t("performance.predictionsSummary.exportPdf")}
								</Button>
							)}
						</Space>
					)}
				>
					{mutation.data
						? renderClassicResults()
						: <Empty description={t("performance.predictionsSummary.emptyPrompt")} />}
				</Card>
			</Space>
		</BasicContent>
	);
}
