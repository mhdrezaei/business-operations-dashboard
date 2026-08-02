import type { ServiceDto } from "#src/api/common/common.types";
import type {
	PredictionSummaryPeriodMode,
	PredictionSummaryResponse,
	PredictionSummarySelectedPeriod,
} from "#src/features/performance/api/performances.api";
import type { PredictionSummaryDisplayRow, PredictionSummarySection } from "./predictions-summary-export";
import { BasicContent } from "#src/components";
import { fetchPredictionPerformanceSummary } from "#src/features/performance/api/performances.api";
import { normalizeServiceCode } from "#src/features/performance/shared/model/performance.helpers";
import { servicesQuery } from "#src/features/performance/shared/queries/performance.queries";
import { useAccess } from "#src/hooks";
import { DeleteOutlined, FileExcelOutlined, FilePdfOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Checkbox, Empty, InputNumber, Select, Space, Switch, Table, Tag, Typography } from "antd";
import { useMemo, useState } from "react";
import { getReportDisplayMonth } from "./constants";
import {
	downloadPredictionSummaryExcel,
	openPredictionSummaryPdfPrint,
} from "./predictions-summary-export";

type ReportMode = "separated" | "total";
type OutputMode = "classic" | "single-table";

interface PeriodSelection {
	id: string
	year: number
	values: number[]
}

const PERIOD_MODE_OPTIONS: Array<{ label: string, value: PredictionSummaryPeriodMode }> = [
	{ label: "سال و ماه شمسی", value: "shamsi_months" },
	{ label: "سال و ماه مالی", value: "fiscal_months" },
	{ label: "سال و کوارتر شمسی", value: "shamsi_quarters" },
	{ label: "سال و کوارتر مالی", value: "fiscal_quarters" },
];

const YEAR_OPTIONS = Array.from({ length: 10 }, (_, index) => 1401 + index).map(year => ({
	label: String(year),
	value: year,
}));

const MONTH_NAMES_BY_VALUE: Record<number, string> = {
	1: "فروردین",
	2: "اردیبهشت",
	3: "خرداد",
	4: "تیر",
	5: "مرداد",
	6: "شهریور",
	7: "مهر",
	8: "آبان",
	9: "آذر",
	10: "دی",
	11: "بهمن",
	12: "اسفند",
};

const FINANCIAL_KEYS = new Set(["income", "income_financial", "expense", "expense_financial", "profit", "profit_financial"]);
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

function getPeriodValueOptions(periodMode: PredictionSummaryPeriodMode) {
	if (isQuarterMode(periodMode)) {
		return [1, 2, 3, 4].map(value => ({
			label: `کوارتر ${value}`,
			value,
		}));
	}

	const periodType = periodMode === "fiscal_months" ? "fiscal" : "sh";
	return Array.from({ length: 12 }, (_, index) => {
		const value = index + 1;
		const displayMonth = getReportDisplayMonth(value, periodType);
		return {
			label: MONTH_NAMES_BY_VALUE[displayMonth] ?? String(value),
			value,
		};
	});
}

function getPeriodModeCalendarLabel(periodMode: PredictionSummaryPeriodMode) {
	if (periodMode.startsWith("fiscal"))
		return periodMode.includes("quarter") ? "سال و کوارتر مالی" : "سال و ماه مالی";
	return periodMode.includes("quarter") ? "سال و کوارتر شمسی" : "سال و ماه شمسی";
}

function getPeriodMonthLabel(month: number, periodMode: PredictionSummaryPeriodMode) {
	const periodType = periodMode.startsWith("fiscal") ? "fiscal" : "sh";
	const displayMonth = getReportDisplayMonth(month, periodType);
	return MONTH_NAMES_BY_VALUE[displayMonth] ?? String(month);
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
) {
	const realMonths = months.map(item => ({
		label: getPeriodMonthLabel(item.month, item.isActualShamsiMonth ? "shamsi_months" : periodMode),
		year: item.year ?? getRealMonthYear(year, item.month, periodMode),
	}));

	if (realMonths.length === 0)
		return "-";

	const firstMonth = realMonths[0];
	const lastMonth = realMonths[realMonths.length - 1];

	if (realMonths.length === 1) {
		const yearLabel = firstMonth.year == null ? "" : `سال ${formatPersianInteger(firstMonth.year)}: `;
		return `ماه‌های واقعی: ${yearLabel}${firstMonth.label}`;
	}

	if (firstMonth.year != null && lastMonth.year != null && firstMonth.year !== lastMonth.year)
		return `ماه‌های واقعی: از ${firstMonth.label} ${formatPersianInteger(firstMonth.year)} تا ${lastMonth.label} ${formatPersianInteger(lastMonth.year)}`;

	const yearLabel = firstMonth.year == null ? "" : `سال ${formatPersianInteger(firstMonth.year)}: `;
	return `ماه‌های واقعی: ${yearLabel}از ${firstMonth.label} تا ${lastMonth.label}`;
}

function getPeriodMonthsLabel(period: Record<string, unknown>, periodMode: PredictionSummaryPeriodMode) {
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

	return formatRealMonthsLabel(year, months, periodMode);
}

function getPeriodLabel(period: Record<string, unknown>, periodMode: PredictionSummaryPeriodMode) {
	const year = Number(period.year);
	const month = Number(period.month);
	const quarter = Number(period.quarter);
	if (Number.isFinite(month) && month > 0)
		return `${formatPersianInteger(year)} / ماه ${formatPersianInteger(month)}`;
	if (Number.isFinite(quarter) && quarter > 0)
		return `${formatPersianInteger(year)} / کوارتر ${formatPersianInteger(quarter)}`;

	const monthsExpanded = Array.isArray(period.months_expanded)
		? period.months_expanded.map(item => Number(isPlainRecord(item) ? item.sh_month : item)).filter(Number.isFinite)
		: [];
	if (monthsExpanded.length > 0)
		return `${formatPersianInteger(year)} / ماه‌های ${monthsExpanded.map(formatPersianInteger).join("، ")}`;

	return Number.isFinite(year) ? formatPersianInteger(year) : getPeriodModeCalendarLabel(periodMode);
}

function getPeriodStableKey(period: Record<string, unknown>, periodMode: PredictionSummaryPeriodMode) {
	return [
		period.calendar_type,
		period.bucket_type,
		period.year,
		period.month,
		period.quarter,
		getPeriodLabel(period, periodMode),
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

function formatTrafficResources(record: Record<string, unknown>) {
	const fields = [
		{ label: "IP", value: record.ip_count },
		{ label: "پورت", value: record.port_count },
		{ label: "BW", value: record.bandwidth_used },
		{ label: "آمپر", value: record.ampere_used },
	];
	const parts = fields
		.filter(field => field.value !== undefined && field.value !== null && field.value !== "")
		.map(field => `${field.label}: ${formatNumber(field.value)}`);
	return parts.length > 0 ? parts.join(" | ") : "-";
}

function hasMetricLeaf(record: Record<string, unknown>) {
	return METRIC_KEYS.some(key => key in record && !isPlainRecord(record[key]) && !Array.isArray(record[key]));
}

function flattenMetricRecords(value: unknown, path: string[] = []): Array<{ typeLabel: string, record: Record<string, unknown> }> {
	if (!isPlainRecord(value))
		return [];

	if (hasMetricLeaf(value)) {
		return [{
			typeLabel: path.length > 0 ? path.join(" / ") : "مجموع",
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

function getOpenApiTypeLabel(token: string) {
	const labels: Record<string, string> = {
		RECEIPT_REGISTER: "ثبت وصولی",
		BILL_INQUIRY: "استعلام قبض",
		BILL_INQUIRY_MIDTERM: "استعلام قبض میان‌دوره",
		BILL_INQUIRY_ENDTERM: "استعلام قبض پایان‌دوره",
		RECEIPT_REGISTER_CONNECTED: "ثبت وصولی متصل",
		RECEIPT_REGISTER_DISCONNECTED: "ثبت وصولی غیرمتصل",
		SMS: "پیامک",
		TRAFFIC: "ترافیک",
	};
	return labels[token] ?? null;
}

function getSmsTypeLabel(token: string) {
	const labels: Record<string, string> = {
		CP: "CP",
		KARASHAB: "کاراشابی",
		NON_TELECOM: "غیر مخابراتی",
		TELECOM: "مخابراتی",
	};
	return labels[token] ?? null;
}

function getTrafficTypeLabel(parts: string[]) {
	const first = normalizeTypeToken(parts[0] ?? "");
	const second = normalizeTypeToken(parts[1] ?? "");

	if (first === "COLLOCATION")
		return "COLLOCATION";
	if (first === "CP" && second === "TEHRAN")
		return "CP (تهران)";
	if (first === "CP" && second === "COUNTY")
		return "CP (مناطق استان)";
	if (first === "IXP" && second === "TEHRAN")
		return "IXP (تهران)";
	if (first === "TCI" && second === "TEHRAN")
		return "TCI (تهران)";
	if (first === "PREMIUM" && second === "TEHRAN")
		return "Premium (تهران)";
	return null;
}

function formatTypeLabel(serviceCode: string, typeLabel: string) {
	const normalizedServiceCode = normalizeApiServiceCode(serviceCode);
	const parts = typeLabel.split("/").map(part => part.trim()).filter(Boolean);
	const token = normalizeTypeToken(typeLabel);
	const firstToken = normalizeTypeToken(parts[0] ?? typeLabel);

	if (token === "مجموع" || token === "TOTAL")
		return "مجموع";

	if (normalizedServiceCode === "openapi")
		return getOpenApiTypeLabel(token) ?? typeLabel;

	if (normalizedServiceCode === "sms" || normalizedServiceCode === "sms_commission")
		return getSmsTypeLabel(firstToken) ?? getOpenApiTypeLabel(token) ?? typeLabel;

	if (normalizedServiceCode === "traffic")
		return getTrafficTypeLabel(parts) ?? getSmsTypeLabel(firstToken) ?? typeLabel;

	if (normalizedServiceCode === "shahkar")
		return getSmsTypeLabel(firstToken) ?? typeLabel;

	if (normalizedServiceCode === "psp")
		return getOpenApiTypeLabel(token) ?? typeLabel;

	return typeLabel;
}

function formatNumber(value: unknown, showRial = true) {
	if (value === null || value === undefined || value === "")
		return "-";
	const numeric = Number(value);
	if (!Number.isFinite(numeric))
		return "-";
	const displayValue = showRial ? numeric : numeric / 10;
	return displayValue.toLocaleString("fa-IR", {
		maximumFractionDigits: 4,
	});
}

function formatMetricValue(row: PredictionSummaryDisplayRow, field: "value" | "income" | "expense" | "profit", showRial: boolean) {
	return formatNumber(row[field], !FINANCIAL_KEYS.has(field) || showRial);
}

function formatTrafficValue(value: unknown, unit: string | null) {
	const formatted = formatNumber(value);
	if (formatted === "-")
		return "-";
	return unit ? `${unit}: ${formatted}` : formatted;
}

function formatTrafficValues(row: PredictionSummaryDisplayRow, direction: "sent" | "received") {
	const gbMonth = direction === "sent" ? row.sentTrafficGbMonth : row.receivedTrafficGbMonth;
	const mbps = direction === "sent" ? row.sentTrafficMbps : row.receivedTrafficMbps;
	const fallbackValue = direction === "sent" ? row.sentTraffic : row.receivedTraffic;
	const fallbackUnit = direction === "sent" ? row.sentTrafficUnit : row.receivedTrafficUnit;
	const parts = [
		formatTrafficValue(gbMonth, "GB/month"),
		formatTrafficValue(mbps, "Mbps"),
	].filter(part => part !== "-");

	if (parts.length > 0) {
		return (
			<Space direction="vertical" size={0}>
				{parts.map(part => (
					<Typography.Text key={part}>{part}</Typography.Text>
				))}
			</Space>
		);
	}

	return formatTrafficValue(fallbackValue, fallbackUnit);
}

function normalizeSummaryRows(response: PredictionSummaryResponse | null | undefined, serviceNameByCode: Map<string, string>) {
	const services = response?.services ?? [];
	return services.flatMap((service, serviceIndex) => {
		const serviceCode = normalizeApiServiceCode(service.service_code);
		const serviceName = serviceNameByCode.get(serviceCode) ?? String(service.service_code ?? "-");
		const periodMode = (service.period_mode || "shamsi_months") as PredictionSummaryPeriodMode;

		return (service.periods ?? []).flatMap((period, periodIndex) => {
			const periodLabel = getPeriodLabel(period, periodMode);
			const periodMonthsLabel = getPeriodMonthsLabel(period, periodMode);
			const calendarLabel = getPeriodModeCalendarLabel(periodMode);

			return (["performance", "predictions"] as PredictionSummarySection[]).flatMap((section) => {
				const sectionRows = flattenMetricRecords(period[section]);
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
						periodKey: getPeriodStableKey(period, periodMode),
						periodLabel,
						periodMonthsLabel,
						calendarLabel,
						yearLabel: Number.isFinite(Number(period.year))
							? Number(period.year).toLocaleString("fa-IR", { useGrouping: false })
							: "-",
						section,
						typeLabel: formatTypeLabel(serviceCode, item.typeLabel),
						value: pickFirstMetricValue(item.record, ["value", "count", "ip_count", "port_count", "bandwidth_used", "ampere_used"]),
						sentTraffic: sentTraffic.value,
						sentTrafficUnit: sentTraffic.unit,
						sentTrafficMbps: pickFirstMetricValue(item.record, ["value_mbps"]),
						sentTrafficGbMonth: pickFirstMetricValue(item.record, ["value_gb_month"]),
						receivedTraffic: receivedTraffic.value,
						receivedTrafficUnit: receivedTraffic.unit,
						receivedTrafficMbps: pickFirstMetricValue(item.record, ["value_receive_mbps"]),
						receivedTrafficGbMonth: pickFirstMetricValue(item.record, ["value_receive_gb_month"]),
						trafficResourcesLabel: formatTrafficResources(item.record),
						isTrafficCollocation,
						income: pickFirstMetricValue(item.record, ["income", "income_financial"]),
						expense: pickFirstMetricValue(item.record, ["expense", "expense_financial"]),
						profit: pickFirstMetricValue(item.record, ["profit", "profit_financial"]),
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

function getQueryPeriodCount(periodsJson: string | undefined) {
	if (!periodsJson)
		return 0;
	try {
		const periods = JSON.parse(periodsJson) as unknown;
		if (!Array.isArray(periods))
			return 0;
		return periods.reduce((total, period) => {
			if (!isPlainRecord(period))
				return total;
			const values = Array.isArray(period.quarters) ? period.quarters : Array.isArray(period.months) ? period.months : [];
			return total + values.length;
		}, 0);
	}
	catch {
		return 0;
	}
}

function getQueryServiceCount(serviceCodes: string | undefined) {
	return serviceCodes?.split(",").map(value => value.trim()).filter(Boolean).length ?? 0;
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
		default_conversion_ratio: hasTrafficService && defaultConversionRatio != null ? defaultConversionRatio : undefined,
	};
}

function validateFilters(serviceCodes: string[], periodSelections: PeriodSelection[]) {
	if (serviceCodes.length === 0)
		return "حداقل یک سرویس را انتخاب کنید.";
	if (periodSelections.length === 0)
		return "حداقل یک سال را اضافه کنید.";
	if (periodSelections.some(selection => selection.values.length === 0))
		return "برای هر سال حداقل یک ماه یا کوارتر انتخاب کنید.";
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
	const { getPermittedServiceIds } = useAccess();
	const [serviceCodes, setServiceCodes] = useState<string[]>([]);
	const [periodMode, setPeriodMode] = useState<PredictionSummaryPeriodMode>("shamsi_months");
	const [reportMode, setReportMode] = useState<ReportMode>("separated");
	const [outputMode, setOutputMode] = useState<OutputMode>("classic");
	const [showRial, setShowRial] = useState(true);
	const [defaultConversionRatio, setDefaultConversionRatio] = useState<number | null>(null);
	const [periodSelections, setPeriodSelections] = useState<PeriodSelection[]>(() => [createPeriodSelection(1405)]);
	const [validationError, setValidationError] = useState<string | null>(null);

	const services = useQuery(servicesQuery());
	const permittedIds = getPermittedServiceIds("performances", "view");
	const permittedIdSet = useMemo(() => new Set(permittedIds), [permittedIds.join(",")]);

	const serviceOptions = useMemo(() => {
		return (services.data?.results ?? [])
			.filter(service => permittedIdSet.has(Number(service.id)))
			.map((service: ServiceDto) => ({
				label: service.name,
				value: normalizeApiServiceCode(service.code),
			}));
	}, [services.data, permittedIds.join(",")]);

	const serviceNameByCode = useMemo(() => {
		return new Map(serviceOptions.map(option => [option.value, option.label]));
	}, [serviceOptions]);
	const hasTrafficService = serviceCodes.includes("traffic");

	const periodValueOptions = useMemo(() => getPeriodValueOptions(periodMode), [periodMode]);
	const selectedYears = useMemo(() => new Set(periodSelections.map(selection => selection.year)), [periodSelections]);
	const availableYearOptions = useMemo(() => {
		return YEAR_OPTIONS.map(option => ({
			...option,
			disabled: selectedYears.has(option.value),
		}));
	}, [selectedYears]);

	const mutation = useMutation({
		mutationFn: fetchPredictionPerformanceSummary,
	});

	const rows = useMemo(() => normalizeSummaryRows(mutation.data, serviceNameByCode), [mutation.data, serviceNameByCode]);
	const hasServices = (mutation.data?.services ?? []).length > 0;
	const exportMeta = useMemo(() => ({
		serviceCount: Math.max(getQueryServiceCount(mutation.variables?.service_codes), new Set(rows.map(row => row.serviceCode)).size),
		periodCount: getQueryPeriodCount(mutation.variables?.periods) || new Set(rows.map(row => row.periodKey)).size,
		periodMode: mutation.variables?.period_mode ?? periodMode,
		showRial,
	}), [rows, mutation.variables?.period_mode, mutation.variables?.periods, mutation.variables?.service_codes, periodMode, showRial]);
	const canExport = rows.length > 0 && !mutation.isPending;

	const handleDownloadExcel = () => {
		if (!canExport || outputMode !== "classic")
			return;
		downloadPredictionSummaryExcel({
			filename: `predictions-performance-summary-${new Date().toISOString().slice(0, 10)}.xls`,
			rows,
			meta: exportMeta,
			mode: outputMode,
		});
	};

	const handleDownloadPdf = () => {
		if (!canExport)
			return;
		try {
			openPredictionSummaryPdfPrint(rows, exportMeta);
		}
		catch {
			window.$message?.warning("پاپ‌آپ مرورگر مسدود است. لطفاً آن را فعال کنید.");
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
		const error = validateFilters(serviceCodes, periodSelections);
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

	const addPeriodYear = () => {
		const nextYear = YEAR_OPTIONS.find(option => !selectedYears.has(option.value))?.value;
		if (!nextYear)
			return;
		setPeriodSelections(prev => [...prev, createPeriodSelection(nextYear)]);
	};

	const updatePeriodSelection = (id: string, patch: Partial<PeriodSelection>) => {
		setPeriodSelections(prev => prev.map(selection => selection.id === id ? { ...selection, ...patch } : selection));
	};

	const removePeriodSelection = (id: string) => {
		setPeriodSelections(prev => prev.filter(selection => selection.id !== id));
	};

	const metricColumns = [
		{
			title: "بخش",
			dataIndex: "section",
			width: 120,
			render: (section: PredictionSummarySection) => (
				<Tag color={section === "performance" ? "success" : "processing"}>
					{section === "performance" ? "عملکرد" : "پیش‌بینی"}
				</Tag>
			),
		},
		{ title: "نوع", dataIndex: "typeLabel", width: 180 },
		{ title: "تعداد", dataIndex: "value", width: 140, render: (_: unknown, row: PredictionSummaryDisplayRow) => formatMetricValue(row, "value", showRial) },
		{ title: `درآمد (${showRial ? "ریال" : "تومان"})`, dataIndex: "income", width: 160, render: (_: unknown, row: PredictionSummaryDisplayRow) => formatMetricValue(row, "income", showRial) },
		{ title: `هزینه (${showRial ? "ریال" : "تومان"})`, dataIndex: "expense", width: 160, render: (_: unknown, row: PredictionSummaryDisplayRow) => formatMetricValue(row, "expense", showRial) },
		{ title: `سود (${showRial ? "ریال" : "تومان"})`, dataIndex: "profit", width: 160, render: (_: unknown, row: PredictionSummaryDisplayRow) => formatMetricValue(row, "profit", showRial) },
	];

	const trafficMetricColumns = [
		{
			title: "بخش",
			dataIndex: "section",
			width: 120,
			render: (section: PredictionSummarySection) => (
				<Tag color={section === "performance" ? "success" : "processing"}>
					{section === "performance" ? "عملکرد" : "پیش‌بینی"}
				</Tag>
			),
		},
		{ title: "نوع", dataIndex: "typeLabel", width: 190 },
		{
			title: "ترافیک ارسالی",
			dataIndex: "sentTraffic",
			width: 230,
			render: (_: unknown, row: PredictionSummaryDisplayRow) => {
				if (row.isTrafficCollocation)
					return row.trafficResourcesLabel;
				return formatTrafficValues(row, "sent");
			},
		},
		{
			title: "ترافیک دریافتی",
			dataIndex: "receivedTraffic",
			width: 230,
			render: (_: unknown, row: PredictionSummaryDisplayRow) => formatTrafficValues(row, "received"),
		},
		{ title: `درآمد (${showRial ? "ریال" : "تومان"})`, dataIndex: "income", width: 160, render: (_: unknown, row: PredictionSummaryDisplayRow) => formatMetricValue(row, "income", showRial) },
		{ title: `هزینه (${showRial ? "ریال" : "تومان"})`, dataIndex: "expense", width: 160, render: (_: unknown, row: PredictionSummaryDisplayRow) => formatMetricValue(row, "expense", showRial) },
		{ title: `سود (${showRial ? "ریال" : "تومان"})`, dataIndex: "profit", width: 160, render: (_: unknown, row: PredictionSummaryDisplayRow) => formatMetricValue(row, "profit", showRial) },
	];
	const renderClassicResults = () => {
		const servicesList = mutation.data?.services ?? [];
		if (!hasServices)
			return <Empty description="داده‌ای برای گزارش وجود ندارد." />;

		return (
			<Space direction="vertical" size={16} className="w-full">
				{servicesList.map((service) => {
					const code = normalizeApiServiceCode(service.service_code);
					const serviceRows = rows.filter(row => row.serviceCode === code);
					const serviceKey = service.service_id != null ? String(service.service_id) : code;
					const tableColumns = code === "traffic" ? trafficMetricColumns : metricColumns;
					return (
						<Card
							key={serviceKey}
							title={serviceNameByCode.get(code) ?? service.service_code ?? "-"}
							extra={<Typography.Text type="secondary">{`service_id: ${service.service_id ?? "-"}`}</Typography.Text>}
						>
							{(service.periods ?? []).length === 0
								? <Empty description="برای این سرویس دوره‌ای وجود ندارد." />
								: (
									<Space direction="vertical" size={16} className="w-full">
										{(service.periods ?? []).map((period) => {
											const effectivePeriodMode = (service.period_mode || periodMode) as PredictionSummaryPeriodMode;
											const label = getPeriodLabel(period, effectivePeriodMode);
											const monthsLabel = getPeriodMonthsLabel(period, effectivePeriodMode);
											const periodRows = serviceRows.filter(row => row.periodLabel === label);
											return (
												<Card key={getPeriodStableKey(period, effectivePeriodMode)} size="small" title={label} extra={<Tag>{getPeriodModeCalendarLabel(effectivePeriodMode)}</Tag>}>
													{monthsLabel !== "-" && (
														<Typography.Text type="secondary" className="mb-3 block">
															{monthsLabel}
														</Typography.Text>
													)}
													<Table
														size="small"
														rowKey="key"
														columns={tableColumns}
														dataSource={periodRows}
														pagination={false}
														scroll={{ x: code === "traffic" ? 1250 : 900 }}
														locale={{ emptyText: "داده‌ای وجود ندارد." }}
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
					گزارش تجمیعی عملکرد و پیش‌بینی
				</Typography.Title>

				<Card title="فیلترهای گزارش">
					<Space direction="vertical" size={16} className="w-full">
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
							<div>
								<Typography.Text className="mb-2 block">سرویس‌ها</Typography.Text>
								<Select
									mode="multiple"
									allowClear
									maxTagCount="responsive"
									loading={services.isLoading}
									value={serviceCodes}
									options={serviceOptions}
									placeholder="سرویس‌ها را انتخاب کنید"
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
														انتخاب همه
													</Checkbox>
												</div>
												{menu}
											</>
										);
									}}
								/>
							</div>

							<div>
								<Typography.Text className="mb-2 block">نوع دوره</Typography.Text>
								<Select value={periodMode} options={PERIOD_MODE_OPTIONS} className="w-full" onChange={handlePeriodModeChange} />
							</div>

							<div>
								<Typography.Text className="mb-2 block">حالت گزارش</Typography.Text>
								<Select
									value={reportMode}
									className="w-full"
									onChange={setReportMode}
									options={[
										{ label: "تفکیکی", value: "separated" },
										{ label: "تجمیعی", value: "total" },
									]}
								/>
							</div>

							<div>
								<Typography.Text className="mb-2 block">نوع خروجی فایل</Typography.Text>
								<Select
									value={outputMode}
									className="w-full"
									onChange={setOutputMode}
									options={[
										{ label: "کلاسیک", value: "classic" },
										{ label: "تجمیعی - یک جدول", value: "single-table" },
									]}
								/>
							</div>
						</div>

						<Card size="small" title={isQuarterMode(periodMode) ? "سال و کوارترها" : "سال و ماه‌ها"}>
							<Space direction="vertical" size={12} className="w-full">
								{periodSelections.map((selection) => {
									const allValues = periodValueOptions.map(option => option.value);
									const allSelected = allValues.every(value => selection.values.includes(value));
									return (
										<div key={selection.id} className="grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr_auto_auto]">
											<Select
												value={selection.year}
												options={availableYearOptions.map(option => ({
													...option,
													disabled: option.disabled && option.value !== selection.year,
												}))}
												onChange={year => updatePeriodSelection(selection.id, { year })}
											/>
											<Select
												mode="multiple"
												allowClear
												maxTagCount="responsive"
												value={selection.values}
												options={periodValueOptions}
												optionLabelProp="label"
												placeholder={isQuarterMode(periodMode) ? "کوارترها را انتخاب کنید" : "ماه‌ها را انتخاب کنید"}
												onChange={values => updatePeriodSelection(selection.id, { values })}
											/>
											<Button onClick={() => updatePeriodSelection(selection.id, { values: allSelected ? [] : allValues })}>
												{allSelected ? "حذف همه" : "انتخاب همه"}
											</Button>
											<Button danger icon={<DeleteOutlined />} disabled={periodSelections.length === 1} onClick={() => removePeriodSelection(selection.id)} />
										</div>
									);
								})}

								<Button icon={<PlusOutlined />} onClick={addPeriodYear} disabled={periodSelections.length >= YEAR_OPTIONS.length}>
									افزودن سال
								</Button>
							</Space>
						</Card>

						{hasTrafficService && (
							<Card size="small" title="ضریب تبدیل پیش‌فرض">
								<Space direction="vertical" size={8} className="w-full">
									<InputNumber
										min={0}
										step={0.01}
										precision={4}
										value={defaultConversionRatio ?? undefined}
										placeholder="مثال: 1.25"
										className="w-full"
										onChange={(value) => {
											const numeric = value == null ? null : Number(value);
											setDefaultConversionRatio(Number.isFinite(numeric as number) ? Number(numeric) : null);
										}}
									/>
									<Typography.Text type="secondary">
										اگر رکوردهای CP ضریب تبدیل نداشته باشند، از این مقدار به عنوان fallback استفاده می‌شود.
									</Typography.Text>
								</Space>
							</Card>
						)}

						<div className="flex flex-wrap items-center justify-between gap-3">
							<Space>
								<Switch checked={showRial} onChange={setShowRial} />
								<Typography.Text>نمایش مبالغ به ریال</Typography.Text>
							</Space>

							<Button type="primary" icon={<SearchOutlined />} loading={mutation.isPending} onClick={handleApplyReport}>
								اعمال گزارش
							</Button>
						</div>

						{validationError && <Alert type="warning" showIcon message={validationError} />}
					</Space>
				</Card>

				{mutation.isError && (
					<Alert
						type="error"
						showIcon
						message="خطا در دریافت گزارش"
						description="دریافت اطلاعات گزارش با خطا مواجه شد. لطفاً دوباره تلاش کنید."
					/>
				)}

				<Card
					title={`نتایج گزارش (${showRial ? "ریال" : "تومان"})`}
					loading={mutation.isPending}
					extra={(
						<Space wrap>
							<Button icon={<FileExcelOutlined />} disabled={!canExport} onClick={handleDownloadExcel}>
								خروجی اکسل
							</Button>
							{outputMode === "classic" && (
								<Button icon={<FilePdfOutlined />} disabled={!canExport} onClick={handleDownloadPdf}>
									خروجی PDF
								</Button>
							)}
						</Space>
					)}
				>
					{mutation.data
						? renderClassicResults()
						: <Empty description="برای مشاهده گزارش، فیلترها را انتخاب و اعمال کنید." />}
				</Card>
			</Space>
		</BasicContent>
	);
}
