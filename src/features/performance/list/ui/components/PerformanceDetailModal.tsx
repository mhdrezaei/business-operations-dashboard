import type { CompanyDto } from "#src/api/common/common.types.js";
import type { PerformanceListItem, PerformanceServicePath } from "#src/features/performance/api/performances.api";
import type { PerformanceListRow } from "../../model/performance.list.types";
import { MONTH_OPTIONS } from "#src/features/contract/constant/jalali-date-options.js";
import {
	fetchPerformanceContracts,
	fetchPerformanceDetail,
	fetchPerformanceList,
	updatePerformanceById,
	updateSmsCommissionPerformanceByComposite,
	upsertPerformance,
} from "#src/features/performance/api/performances.api";
import {
	normalizePerformanceRecord,
	pickActiveContract,
	toNullableNumber,
} from "#src/features/performance/shared/model/performance.helpers";
import { RHFProNumber, RHFProText } from "#src/shared/ui/rhf-pro";
import { ProCard } from "@ant-design/pro-components";
import { Button, Modal, Spin } from "antd";
import i18next from "i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

type EditFormValues = Record<string, unknown>;

interface EditableFieldConfig {
	key: string
	label: string
	type: "number" | "text"
	required?: boolean
}

interface ServiceEditConfig {
	title: string
	readonlyKeys: string[]
	editableFields: EditableFieldConfig[]
	payloadKeys: string[]
}

interface DetailField {
	key: string
	label: string
	value: unknown
}

interface SmsBreakdownCard {
	key: string
	title: string
	value: unknown
	incomeOperator: unknown
	incomeGovernment: unknown
	price: unknown
	profit: unknown
	expenseOperator: unknown
	expenseGovernment: unknown
}

const SERVICE_DETAIL_KEYS: Record<PerformanceServicePath, string[]> = {
	"openapi": ["value", "income", "expense", "profit", "traffic_income", "traffic_package_count"],
	"psp": [],
	"shahkar": ["value", "income", "expense", "profit"],
	"sms": [],
	"sms-commission": [],
	"traffic": ["location", "company_type", "is_official", "value", "value_receive", "income", "expense", "profit"],
	"commercial": ["customer_name", "customer_nic", "province_code", "service_type", "value", "income", "expense", "profit"],
};

const HIDDEN_DETAIL_KEYS = new Set([
	"id",
	"company",
	"company_id",
	"service",
	"service_id",
	"service_code",
	"created_at",
	"updated_at",
	"gr_month_start",
	"gr_month_end_inclusive",
	"expense_display",
	"profit_display",
	"value_display",
	"value_receive_display",
	"company_type_display",
	"is_official_display",
	"url",
]);

interface Props {
	open: boolean
	service: PerformanceServicePath | null
	companies: CompanyDto[] | undefined
	record: PerformanceListRow | null
	onClose: () => void
	onUpdated?: () => void
	mode?: "default" | "unregistered"
}

function isEmptyValue(value: unknown) {
	if (value == null)
		return true;
	if (typeof value === "string")
		return value.trim().length === 0;
	return false;
}

function getValue(detail: Record<string, unknown>, fallback: Record<string, unknown>, key: string) {
	if (detail[key] != null)
		return detail[key];
	return fallback[key];
}

function isVisibleDetailValue(value: unknown) {
	if (value == null)
		return false;
	if (typeof value === "string")
		return value.trim().length > 0;
	if (Array.isArray(value))
		return value.length > 0;
	return true;
}

function formatNumberLike(value: unknown) {
	if (value == null || value === "")
		return "-";
	const numeric = Number(value);
	if (Number.isFinite(numeric))
		return numeric.toLocaleString("en-US");
	return String(value);
}

function formatDetailValue(
	key: string,
	value: unknown,
	operationTypeLabels: Record<string, string>,
	t: (key: string) => string,
) {
	if (!isVisibleDetailValue(value))
		return "-";

	if (key === "operation_type") {
		const raw = String(value);
		return operationTypeLabels[raw] ?? raw;
	}
	if (key === "language") {
		if (value === "FA")
			return t("performance.language.fa");
		if (value === "EN")
			return t("performance.language.en");
	}
	if (key === "operator") {
		if (value === "IRANCELL")
			return t("performance.operator.irancell");
		if (value === "MCI")
			return t("performance.operator.mci");
		if (value === "OTHER")
			return t("performance.operator.other");
	}
	if (key === "is_official")
		return value ? t("common.yes") : t("common.no");
	if (key === "items" && Array.isArray(value)) {
		return value
			.map((item: any) => `${item?.operator ?? "-"}-${item?.language ?? "-"}: ${formatNumberLike(item?.value)}`)
			.join(" | ");
	}

	return formatNumberLike(value);
}

function resolveMonthLabel(value: unknown) {
	const month = Number(value);
	if (!Number.isFinite(month))
		return "-";
	const found = MONTH_OPTIONS.find(option => option.value === month);
	return found?.label ?? String(value);
}

function resolveServiceDisplayName(service: PerformanceServicePath | null, value: unknown) {
	const text = String(value ?? "").trim();
	if (service === "openapi")
		return "سرویس OpenAPI";
	if (service === "psp")
		return "سرویس PSP";
	if (service === "sms")
		return "سرویس پیامک";
	if (service === "shahkar")
		return "کلاسه شاهکار";
	return text || "-";
}

function toUpperText(value: unknown) {
	return String(value ?? "").trim().toUpperCase();
}

function getTierRate(record: any) {
	const first = Array.isArray(record?.tiers) ? record.tiers[0] : null;
	return first?.rate_per_unit ?? null;
}

function getOperatorLabel(operator: string, t: (key: string) => string) {
	if (operator === "IRANCELL")
		return t("performance.operator.irancell");
	if (operator === "MCI")
		return t("performance.operator.mci");
	if (operator === "OTHER")
		return t("performance.operator.other");
	return operator || "-";
}

function getLanguageLabel(language: string, t: (key: string) => string) {
	if (language === "FA")
		return t("performance.language.fa");
	if (language === "EN")
		return t("performance.language.en");
	return language || "-";
}

function toPayloadValue(value: unknown) {
	if (value == null)
		return null;
	if (typeof value === "number")
		return value;
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed)
			return null;
		const numeric = Number(trimmed);
		if (Number.isFinite(numeric))
			return numeric;
		return trimmed;
	}
	return value;
}

function buildInitialValues(
	config: ServiceEditConfig,
	service: PerformanceServicePath,
	detail: Record<string, unknown>,
	recordFallback: Record<string, unknown>,
): EditFormValues {
	const mergedKeys = Array.from(new Set([
		...config.payloadKeys,
		...config.readonlyKeys,
		"company",
		"service",
		"sh_year",
		"sh_month",
	]));

	const values: EditFormValues = {};
	mergedKeys.forEach((key) => {
		values[key] = getValue(detail, recordFallback, key);
	});

	if (values.company == null)
		values.company = recordFallback.company ?? recordFallback.company_id ?? null;
	if (values.service == null)
		values.service = recordFallback.service ?? recordFallback.service_id ?? null;
	if (values.sh_year == null)
		values.sh_year = recordFallback.sh_year ?? null;
	if (values.sh_month == null)
		values.sh_month = recordFallback.sh_month ?? null;
	if (service === "sms-commission" && values.sales_agent == null)
		values.sales_agent = recordFallback.sales_agent ?? recordFallback.sales_agent_id ?? null;

	return values;
}

function getFirstDefinedValue(source: Record<string, unknown>, keys: string[]) {
	for (const key of keys) {
		const value = source[key];
		if (value != null && value !== "")
			return value;
	}
	return null;
}

function applyOpenApiInitialValues(
	initialValues: EditFormValues,
	detail: Record<string, unknown>,
	recordFallback: Record<string, unknown>,
	rows: PerformanceListItem[],
) {
	const sources = [detail, recordFallback];
	const operationRows = new Map<string, Record<string, unknown>>();

	const pushRow = (row: Record<string, unknown>) => {
		const operationType = toUpperText(row.operation_type);
		if (!operationType)
			return;
		operationRows.set(operationType, row);
	};

	sources.forEach(pushRow);
	rows.forEach(row => pushRow(row as Record<string, unknown>));

	const assignValue = (targetKey: string, directKeys: string[], operationType?: string) => {
		for (const source of sources) {
			const direct = getFirstDefinedValue(source, directKeys);
			if (direct != null) {
				initialValues[targetKey] = direct;
				return;
			}
		}

		if (!operationType)
			return;

		const row = operationRows.get(operationType);
		if (!row)
			return;

		const direct = getFirstDefinedValue(row, directKeys);
		if (direct != null) {
			initialValues[targetKey] = direct;
			return;
		}

		const fallbackValue = getFirstDefinedValue(row, ["value"]);
		if (fallbackValue != null)
			initialValues[targetKey] = fallbackValue;
	};

	assignValue("bill_inquiry_value", ["bill_inquiry_value"], "BILL_INQUIRY");
	assignValue("receipt_register_value", ["receipt_register_value"], "RECEIPT_REGISTER");
	assignValue("traffic_income", ["traffic_income"], "TRAFFIC_REVENUE");
	assignValue("traffic_package_count", ["traffic_package_count"], "TRAFFIC_PACKAGE_COUNT");
	assignValue("sms_irancell_fa", ["sms_irancell_fa"], "IRANCELL_FA");
	assignValue("sms_irancell_en", ["sms_irancell_en"], "IRANCELL_EN");
	assignValue("sms_mci_fa", ["sms_mci_fa"], "MCI_FA");
	assignValue("sms_mci_en", ["sms_mci_en"], "MCI_EN");
	assignValue("sms_other_fa", ["sms_other_fa"], "OTHER_FA");
	assignValue("sms_other_en", ["sms_other_en"], "OTHER_EN");
}

function ReadOnlyBlock({ label, value }: { label: string, value: unknown }) {
	return (
		<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
			<span style={{ fontWeight: 700 }}>{label}</span>
			<span>{value == null || value === "" ? "-" : String(value)}</span>
		</div>
	);
}

export function PerformanceDetailModal({
	open,
	service,
	companies,
	record,
	onClose,
	onUpdated,
	mode = "default",
}: Props) {
	const { t } = useTranslation();
	const isUnregisteredMode = mode === "unregistered";
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
	const [smsContract, setSmsContract] = useState<Record<string, unknown> | null>(null);
	const [smsPerformances, setSmsPerformances] = useState<PerformanceListItem[]>([]);
	const [openApiPerformances, setOpenApiPerformances] = useState<PerformanceListItem[]>([]);
	const applyLoadingState = useCallback((nextLoading: boolean) => {
		setLoading(nextLoading);
	}, []);
	const applyDetailState = useCallback((nextDetail: Record<string, unknown> | null, nextLoading: boolean) => {
		setDetail(nextDetail);
		setLoading(nextLoading);
	}, []);
	const applySmsContract = useCallback((nextValue: Record<string, unknown> | null) => {
		setSmsContract(nextValue);
	}, []);
	const applySmsPerformances = useCallback((nextValue: PerformanceListItem[]) => {
		setSmsPerformances(nextValue);
	}, []);
	const applyOpenApiPerformances = useCallback((nextValue: PerformanceListItem[]) => {
		setOpenApiPerformances(nextValue);
	}, []);

	const normalizedRecord = useMemo(
		() => normalizePerformanceRecord(record ?? {}),
		[record],
	);
	const serviceEditConfig = useMemo<Record<PerformanceServicePath, ServiceEditConfig>>(() => ({
		"openapi": {
			title: "ویرایش عملکرد OpenAPI",
			readonlyKeys: [],
			editableFields: [
				{ key: "bill_inquiry_value", label: "مقدار عملکرد استعلام قبض", type: "number", required: true },
				{ key: "receipt_register_value", label: "مقدار عملکرد ثبت وصولی", type: "number", required: true },
			],
			payloadKeys: ["bill_inquiry_value", "receipt_register_value"],
		},
		"psp": {
			title: "ویرایش عملکرد PSP",
			readonlyKeys: [],
			editableFields: [
				{ key: "value", label: "مقدار عملکرد", type: "number", required: true },
				{ key: "income", label: "درآمد این ماه (تومان)", type: "number" },
			],
			payloadKeys: ["value", "income"],
		},
		"shahkar": {
			title: "ویرایش عملکرد شاهکار",
			readonlyKeys: [],
			editableFields: [
				{ key: "value", label: "مقدار عملکرد", type: "number", required: true },
			],
			payloadKeys: ["value"],
		},
		"sms": {
			title: "ویرایش عملکرد پیامک",
			readonlyKeys: [],
			editableFields: [
				{ key: "irancellFa", label: t("performance.fields.sms.irancellFa"), type: "number", required: true },
				{ key: "irancellEn", label: t("performance.fields.sms.irancellEn"), type: "number", required: true },
				{ key: "mciFa", label: t("performance.fields.sms.mciFa"), type: "number", required: true },
				{ key: "mciEn", label: t("performance.fields.sms.mciEn"), type: "number", required: true },
				{ key: "otherFa", label: t("performance.fields.sms.otherFa"), type: "number", required: true },
				{ key: "otherEn", label: t("performance.fields.sms.otherEn"), type: "number", required: true },
			],
			payloadKeys: ["irancellFa", "irancellEn", "mciFa", "mciEn", "otherFa", "otherEn"],
		},
		"sms-commission": {
			title: "ویرایش عملکرد کمیسیون پیامک",
			readonlyKeys: ["sales_agent", "operator", "language"],
			editableFields: [
				{ key: "irancellFa", label: t("performance.fields.sms.irancellFa"), type: "number", required: true },
				{ key: "irancellEn", label: t("performance.fields.sms.irancellEn"), type: "number", required: true },
				{ key: "mciFa", label: t("performance.fields.sms.mciFa"), type: "number", required: true },
				{ key: "mciEn", label: t("performance.fields.sms.mciEn"), type: "number", required: true },
				{ key: "otherFa", label: t("performance.fields.sms.otherFa"), type: "number", required: true },
				{ key: "otherEn", label: t("performance.fields.sms.otherEn"), type: "number", required: true },
			],
			payloadKeys: ["sales_agent", "operator", "language", "irancellFa", "irancellEn", "mciFa", "mciEn", "otherFa", "otherEn"],
		},
		"traffic": {
			title: "ویرایش عملکرد ترافیک",
			readonlyKeys: ["location", "company_type"],
			editableFields: [
				{ key: "value", label: "مقدار", type: "number", required: true },
				{ key: "value_receive", label: "مقدار دریافتی", type: "number" },
				{ key: "income", label: "درآمد", type: "number" },
				{ key: "expense", label: "هزینه", type: "number" },
				{ key: "profit", label: "سود", type: "number" },
			],
			payloadKeys: ["location", "company_type", "value", "value_receive", "income", "expense", "profit"],
		},
		"commercial": {
			title: "ویرایش عملکرد سرویس تجاری",
			readonlyKeys: ["customer_name", "customer_nic", "province_code", "service_type"],
			editableFields: [
				{ key: "value", label: "مقدار", type: "number", required: true },
				{ key: "income", label: "درآمد", type: "number" },
				{ key: "expense", label: "هزینه", type: "number" },
				{ key: "profit", label: "سود", type: "number" },
			],
			payloadKeys: ["customer_name", "customer_nic", "province_code", "service_type", "value", "income", "expense", "profit"],
		},
	}), [t]);
	const config = useMemo(() => (service ? serviceEditConfig[service] : null), [service, serviceEditConfig]);
	const fieldLabels = useMemo<Record<string, string>>(() => ({
		service_name: "سرویس",
		company_name: "شرکت",
		sh_year: "سال",
		sh_month: "ماه",
		value: "مقدار",
		value_receive: "مقدار دریافتی",
		income: "درآمد استعلام قبض این ماه",
		expense: "هزینه استعلام قبض این ماه",
		profit: "سود",
		bill_inquiry_value: "مقدار عملکرد استعلام قبض",
		receipt_register_value: "مقدار عملکرد ثبت وصولی",
		traffic_income: t("performance.fields.openapi.trafficRevenue"),
		traffic_package_count: t("performance.fields.openapi.trafficPackageCount"),
		sms_mci_fa: t("performance.fields.sms.mciFa"),
		sms_mci_en: t("performance.fields.sms.mciEn"),
		sms_irancell_fa: t("performance.fields.sms.irancellFa"),
		sms_irancell_en: t("performance.fields.sms.irancellEn"),
		sms_other_fa: t("performance.fields.sms.otherFa"),
		sms_other_en: t("performance.fields.sms.otherEn"),
		operation_type: t("performance.columns.operationType"),
		operator: t("performance.columns.operator"),
		language: t("performance.columns.language"),
		sales_agent: t("performance.columns.salesAgent"),
		sales_agent_name: t("performance.columns.salesAgent"),
		location: t("performance.columns.location"),
		company_type: t("performance.columns.companyType"),
		is_official: t("performance.columns.official"),
		customer_name: t("performance.columns.customerName"),
		customer_nic: t("performance.columns.customerNationalId"),
		province_code: t("performance.columns.provinceCode"),
		service_type: t("performance.columns.commercialServiceType"),
		items: t("performance.modal.labels.smsItems"),
	}), [t]);
	const operationTypeLabels = useMemo<Record<string, string>>(() => ({
		BILL_INQUIRY: t("performance.operationType.billInquiry"),
		RECEIPT_REGISTER: t("performance.operationType.receiptRegister"),
		TRAFFIC_REVENUE: t("performance.fields.openapi.trafficRevenue"),
		TRAFFIC_PACKAGE_COUNT: t("performance.fields.openapi.trafficPackageCount"),
		IRANCELL_FA: t("performance.fields.sms.irancellFa"),
		IRANCELL_EN: t("performance.fields.sms.irancellEn"),
		MCI_FA: t("performance.fields.sms.mciFa"),
		MCI_EN: t("performance.fields.sms.mciEn"),
		OTHER_FA: t("performance.fields.sms.otherFa"),
		OTHER_EN: t("performance.fields.sms.otherEn"),
	}), [t]);
	const isSmsService = service === "sms";
	const mergedDetail = useMemo(
		() => ({ ...(record as Record<string, unknown> ?? {}), ...(detail ?? {}) }),
		[record, detail],
	);
	const selectedCompany = useMemo(() => {
		const companyId = Number(mergedDetail.company ?? mergedDetail.company_id ?? record?.company ?? record?.company_id);
		if (!Number.isFinite(companyId))
			return String(mergedDetail.company_name ?? "-");
		const found = companies?.find(company => company.id === companyId);
		return found?.name ?? String(mergedDetail.company_name ?? "-");
	}, [companies, mergedDetail, record]);
	const openApiSummaryFields = useMemo(() => {
		if (service !== "openapi")
			return [];

		return [
			{ key: "income", label: "درآمد استعلام قبض این ماه", value: formatNumberLike(mergedDetail.income) },
			{ key: "expense", label: "هزینه استعلام قبض این ماه", value: formatNumberLike(mergedDetail.expense) },
			{ key: "profit", label: "درآمد ثبت وصولی این ماه", value: formatNumberLike(mergedDetail.profit) },
		];
	}, [service, mergedDetail]);
	const shahkarSummaryFields = useMemo(() => {
		if (service !== "shahkar")
			return [];

		return [
			{ key: "income", label: "درآمد این ماه", value: formatNumberLike(mergedDetail.income) },
		];
	}, [service, mergedDetail]);

	const readonlyDetailFields = useMemo<DetailField[]>(() => {
		if (!service || !config)
			return [];

		if (isUnregisteredMode) {
			const source = (record as Record<string, unknown> ?? {});
			const skipKeys = new Set([
				"service_name",
				"company_name",
				"sh_year",
				"sh_month",
				...config.editableFields.map(field => field.key),
				...config.payloadKeys,
			]);

			return Object.keys(source)
				.filter(key => !skipKeys.has(key) && !HIDDEN_DETAIL_KEYS.has(key))
				.filter(key => typeof source[key] !== "object" || key === "items")
				.filter(key => isVisibleDetailValue(source[key]))
				.map((key) => {
					const value = source[key];
					return {
						key,
						label: fieldLabels[key] ?? key,
						value: formatDetailValue(key, value, operationTypeLabels, t),
					};
				});
		}

		if (service === "sms" || service === "sms-commission" || service === "openapi" || service === "psp" || service === "shahkar")
			return [];

		const skipKeys = new Set([
			"service_name",
			"company_name",
			"sh_year",
			"sh_month",
			...config.editableFields.map(field => field.key),
			...config.payloadKeys,
		]);
		const seenKeys = new Set<string>();
		const result: DetailField[] = [];

		const pushField = (key: string) => {
			if (seenKeys.has(key) || skipKeys.has(key) || HIDDEN_DETAIL_KEYS.has(key))
				return;
			const value = mergedDetail[key];
			if (!isVisibleDetailValue(value))
				return;
			seenKeys.add(key);
			result.push({
				key,
				label: fieldLabels[key] ?? key,
				value: formatDetailValue(key, value, operationTypeLabels, t),
			});
		};

		[...config.readonlyKeys, ...(SERVICE_DETAIL_KEYS[service] ?? [])].forEach(pushField);
		Object.keys(mergedDetail).forEach((key) => {
			const value = mergedDetail[key];
			if (typeof value === "object" && key !== "items")
				return;
			pushField(key);
		});

		return result;
	}, [service, config, mergedDetail, isUnregisteredMode, record, fieldLabels, operationTypeLabels, t]);

	const smsBreakdownCards = useMemo<SmsBreakdownCard[]>(() => {
		if (!isSmsService)
			return [];

		const contractOperatorRevenue = Array.isArray((smsContract as any)?.operator_revenue) ? (smsContract as any).operator_revenue : [];
		const contractGovernmentRate = getTierRate((smsContract as any)?.government_revenue);
		const perfRowsMap = new Map<string, any>();
		smsPerformances.forEach((row) => {
			const key = `${toUpperText((row as any)?.operator)}_${toUpperText((row as any)?.language)}`;
			if (key !== "_")
				perfRowsMap.set(key, row);
		});

		const perfItemsRaw = Array.isArray(mergedDetail.items) ? mergedDetail.items as any[] : [];
		const perfItemMap = new Map<string, any>();
		perfItemsRaw.forEach((item) => {
			const key = `${toUpperText(item?.operator)}_${toUpperText(item?.language)}`;
			if (key !== "_")
				perfItemMap.set(key, item);
		});

		const cards: SmsBreakdownCard[] = contractOperatorRevenue.map((contractItem: any) => {
			const operator = toUpperText(contractItem?.operator);
			const language = toUpperText(contractItem?.language);
			const key = `${operator}_${language}`;
			const perf = perfRowsMap.get(key) ?? perfItemMap.get(key);
			const contractRate = getTierRate(contractItem);

			return {
				key,
				title: `${getOperatorLabel(operator, t)} - ${getLanguageLabel(language, t)}`,
				value: perf?.value ?? null,
				incomeOperator: perf?.income_operator ?? perf?.income ?? null,
				incomeGovernment: perf?.income_government ?? null,
				price: perf?.price ?? contractRate,
				profit: perf?.profit ?? null,
				expenseOperator: perf?.expense_operator ?? perf?.expense ?? null,
				expenseGovernment: perf?.expense_government ?? contractGovernmentRate,
			};
		});

		perfItemsRaw.forEach((item) => {
			const operator = toUpperText(item?.operator);
			const language = toUpperText(item?.language);
			const key = `${operator}_${language}`;
			if (cards.some(card => card.key === key))
				return;
			cards.push({
				key,
				title: `${getOperatorLabel(operator, t)} - ${getLanguageLabel(language, t)}`,
				value: item?.value ?? null,
				incomeOperator: item?.income_operator ?? item?.income ?? null,
				incomeGovernment: item?.income_government ?? null,
				price: item?.price ?? null,
				profit: item?.profit ?? null,
				expenseOperator: item?.expense_operator ?? item?.expense ?? null,
				expenseGovernment: item?.expense_government ?? null,
			});
		});

		smsPerformances.forEach((item: any) => {
			const operator = toUpperText(item?.operator);
			const language = toUpperText(item?.language);
			const key = `${operator}_${language}`;
			if (cards.some(card => card.key === key))
				return;
			cards.push({
				key,
				title: `${getOperatorLabel(operator, t)} - ${getLanguageLabel(language, t)}`,
				value: item?.value ?? null,
				incomeOperator: item?.income_operator ?? item?.income ?? null,
				incomeGovernment: item?.income_government ?? null,
				price: item?.price ?? null,
				profit: item?.profit ?? null,
				expenseOperator: item?.expense_operator ?? item?.expense ?? null,
				expenseGovernment: item?.expense_government ?? contractGovernmentRate,
			});
		});

		return cards;
	}, [isSmsService, mergedDetail.items, smsContract, smsPerformances, t]);

	const form = useForm<EditFormValues>({
		defaultValues: {},
		mode: "all",
		shouldUnregister: true,
	});

	useEffect(() => {
		if (!open || !service || !record)
			return;

		if (isUnregisteredMode) {
			applyDetailState(record as Record<string, unknown>, false);
			return;
		}

		let cancelled = false;
		applyLoadingState(true);

		(async () => {
			try {
				if (normalizedRecord.id != null && service !== "sms-commission") {
					const response = await fetchPerformanceDetail(service, normalizedRecord.id);
					if (!cancelled)
						applyDetailState(response, false);
					return;
				}

				if (!cancelled)
					applyDetailState(record as Record<string, unknown>, false);
			}
			catch {
				if (!cancelled)
					applyDetailState(record as Record<string, unknown>, false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [open, service, record, normalizedRecord.id, isUnregisteredMode, applyDetailState, applyLoadingState]);

	useEffect(() => {
		if (!open || service !== "sms" || isUnregisteredMode) {
			applySmsContract(null);
			return;
		}

		const serviceId = normalizedRecord.serviceId;
		const companyId = normalizedRecord.companyId;
		const year = normalizedRecord.year;
		const month = normalizedRecord.month;
		if (serviceId == null || companyId == null) {
			applySmsContract(null);
			return;
		}

		let cancelled = false;
		(async () => {
			try {
				const response = await fetchPerformanceContracts("sms/client", serviceId, companyId);
				if (cancelled)
					return;
				const contracts = response?.results ?? [];
				const active = pickActiveContract(contracts as any, year, month);
				applySmsContract((active ?? contracts[0] ?? null) as Record<string, unknown> | null);
			}
			catch {
				if (!cancelled)
					applySmsContract(null);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [open, service, normalizedRecord.companyId, normalizedRecord.serviceId, normalizedRecord.year, normalizedRecord.month, isUnregisteredMode, applySmsContract]);

	useEffect(() => {
		if (!open || service !== "sms" || isUnregisteredMode) {
			applySmsPerformances([]);
			return;
		}

		const serviceId = normalizedRecord.serviceId;
		const companyId = normalizedRecord.companyId;
		const year = normalizedRecord.year;
		const month = normalizedRecord.month;
		if (serviceId == null || companyId == null || year == null || month == null) {
			applySmsPerformances([]);
			return;
		}

		let cancelled = false;
		(async () => {
			try {
				const response = await fetchPerformanceList("sms", {
					page: 1,
					page_size: 250,
					service: serviceId,
					company: companyId,
					sh_year: year,
					sh_month: month,
				});
				if (!cancelled)
					applySmsPerformances(response?.results ?? []);
			}
			catch {
				if (!cancelled)
					applySmsPerformances([]);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [open, service, normalizedRecord.companyId, normalizedRecord.serviceId, normalizedRecord.year, normalizedRecord.month, isUnregisteredMode, applySmsPerformances]);

	useEffect(() => {
		if (!open || service !== "openapi" || isUnregisteredMode) {
			applyOpenApiPerformances([]);
			return;
		}

		const serviceId = normalizedRecord.serviceId;
		const companyId = normalizedRecord.companyId;
		const year = normalizedRecord.year;
		const month = normalizedRecord.month;
		if (serviceId == null || companyId == null || year == null || month == null) {
			applyOpenApiPerformances([]);
			return;
		}

		let cancelled = false;
		(async () => {
			try {
				const response = await fetchPerformanceList("openapi", {
					page: 1,
					page_size: 250,
					service: serviceId,
					company: companyId,
					sh_year: year,
					sh_month: month,
				});
				if (!cancelled)
					applyOpenApiPerformances(response?.results ?? []);
			}
			catch {
				if (!cancelled)
					applyOpenApiPerformances([]);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [open, service, normalizedRecord.companyId, normalizedRecord.serviceId, normalizedRecord.year, normalizedRecord.month, isUnregisteredMode, applyOpenApiPerformances]);

	useEffect(() => {
		if (!service || !record || !detail || !config)
			return;

		const initialValues = buildInitialValues(config, service, detail, record as Record<string, unknown>);
		if (service === "openapi")
			applyOpenApiInitialValues(initialValues, detail, record as Record<string, unknown>, openApiPerformances);
		if (service === "sms" || service === "sms-commission") {
			const lookup = new Map<string, unknown>();
			smsBreakdownCards.forEach((card) => {
				lookup.set(card.key, card.value);
			});
			initialValues.irancellFa = lookup.get("IRANCELL_FA") ?? null;
			initialValues.irancellEn = lookup.get("IRANCELL_EN") ?? null;
			initialValues.mciFa = lookup.get("MCI_FA") ?? null;
			initialValues.mciEn = lookup.get("MCI_EN") ?? null;
			initialValues.otherFa = lookup.get("OTHER_FA") ?? null;
			initialValues.otherEn = lookup.get("OTHER_EN") ?? null;

			if (isUnregisteredMode) {
				const operator = toUpperText((record as any)?.operator);
				const language = toUpperText((record as any)?.language);
				const value = (record as any)?.value;
				if (operator === "IRANCELL" && language === "FA")
					initialValues.irancellFa = value ?? initialValues.irancellFa;
				if (operator === "IRANCELL" && language === "EN")
					initialValues.irancellEn = value ?? initialValues.irancellEn;
				if (operator === "MCI" && language === "FA")
					initialValues.mciFa = value ?? initialValues.mciFa;
				if (operator === "MCI" && language === "EN")
					initialValues.mciEn = value ?? initialValues.mciEn;
				if (operator === "OTHER" && language === "FA")
					initialValues.otherFa = value ?? initialValues.otherFa;
				if (operator === "OTHER" && language === "EN")
					initialValues.otherEn = value ?? initialValues.otherEn;
			}
		}
		form.reset(initialValues);
	}, [service, record, detail, config, form, smsBreakdownCards, openApiPerformances, isUnregisteredMode]);

	const handleSubmit = form.handleSubmit(async (values) => {
		if (!service || !config)
			return;

		form.clearErrors();

		let hasError = false;
		config.editableFields.forEach((field) => {
			if (!field.required)
				return;
			if (!isEmptyValue(values[field.key]))
				return;
			hasError = true;
			form.setError(field.key as any, {
				type: "required",
				message: i18next.t("performance.validation.requiredField"),
			});
		});
		if (hasError)
			return;

		const companyId = toNullableNumber(values.company);
		const serviceId = toNullableNumber(values.service);
		const year = toNullableNumber(values.sh_year);
		const month = toNullableNumber(values.sh_month);
		const salesAgentId = toNullableNumber(values.sales_agent);

		if (companyId == null || serviceId == null || year == null || month == null) {
			window.$message?.error(i18next.t("performance.errors.baseFormIncomplete"));
			return;
		}

		const payload: Record<string, unknown> = {
			company: companyId,
			service: serviceId,
			sh_year: year,
			sh_month: month,
		};
		config.payloadKeys.forEach((key) => {
			payload[key] = toPayloadValue(values[key]);
		});

		if (service === "sms" || service === "sms-commission") {
			payload.items = [
				{ operator: "IRANCELL", language: "FA", value: String(values.irancellFa ?? "") },
				{ operator: "IRANCELL", language: "EN", value: String(values.irancellEn ?? "") },
				{ operator: "MCI", language: "FA", value: String(values.mciFa ?? "") },
				{ operator: "MCI", language: "EN", value: String(values.mciEn ?? "") },
				{ operator: "OTHER", language: "FA", value: String(values.otherFa ?? "") },
				{ operator: "OTHER", language: "EN", value: String(values.otherEn ?? "") },
			];
			delete payload.irancellFa;
			delete payload.irancellEn;
			delete payload.mciFa;
			delete payload.mciEn;
			delete payload.otherFa;
			delete payload.otherEn;
			delete payload.operator;
			delete payload.language;
		}

		setSaving(true);
		try {
			if (isUnregisteredMode) {
				await upsertPerformance({
					service,
					companyId,
					year,
					month,
					payload,
				});
			}
			else if (service === "sms-commission") {
				if (salesAgentId == null) {
					window.$message?.error(i18next.t("performance.errors.invalidSalesAgentId"));
					return;
				}
				await updateSmsCommissionPerformanceByComposite(companyId, salesAgentId, year, month, payload);
			}
			else if (service === "sms") {
				await upsertPerformance({
					service,
					companyId,
					year,
					month,
					payload,
				});
			}
			else if (normalizedRecord.id != null) {
				await updatePerformanceById(service, normalizedRecord.id, payload);
			}
			else {
				await upsertPerformance({
					service,
					companyId,
					year,
					month,
					payload,
				});
			}

			window.$message?.success(isUnregisteredMode ? i18next.t("performance.messages.registerSuccess") : i18next.t("performance.messages.updateSuccess"));
			onUpdated?.();
			onClose();
		}
		finally {
			setSaving(false);
		}
	});

	return (
		<Modal
			open={open}
			title={isUnregisteredMode ? "ثبت عملکرد" : (config?.title ?? "ویرایش عملکرد")}
			onCancel={onClose}
			footer={null}
			width={920}
			destroyOnClose
		>
			{!service || !record || !config
				? null
				: (
					<Spin spinning={loading}>
						<FormProvider {...form}>
							<ProCard>
								<div style={{ display: "grid", gap: 12 }}>
									<div
										style={{
											display: "grid",
											gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
											gap: 8,
										}}
									>
										<ReadOnlyBlock label="سرویس:" value={resolveServiceDisplayName(service, mergedDetail.service_name ?? service)} />
										<ReadOnlyBlock label="شرکت:" value={selectedCompany} />
										<ReadOnlyBlock label="سال:" value={mergedDetail.sh_year ?? "-"} />
										<ReadOnlyBlock label="ماه:" value={resolveMonthLabel(mergedDetail.sh_month)} />
									</div>

									{service === "openapi"
										? (
											<div
												style={{
													display: "grid",
													gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
													gap: 8,
												}}
											>
												{openApiSummaryFields.map(field => (
													<ReadOnlyBlock
														key={field.key}
														label={`${field.label}:`}
														value={field.value}
													/>
												))}
											</div>
										)
										: null}

									{service === "shahkar"
										? (
											<div
												style={{
													display: "grid",
													gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
													gap: 8,
												}}
											>
												{shahkarSummaryFields.map(field => (
													<ReadOnlyBlock
														key={field.key}
														label={`${field.label}:`}
														value={field.value}
													/>
												))}
											</div>
										)
										: null}

									{!isUnregisteredMode && isSmsService && smsBreakdownCards.length > 0
										? (
											<div
												style={{
													display: "grid",
													gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
													gap: 12,
												}}
											>
												{smsBreakdownCards.map(card => (
													<div
														key={card.key}
														style={{
															border: "1px solid rgba(255,255,255,0.12)",
															borderRadius: 12,
															padding: 12,
															display: "grid",
															gap: 6,
														}}
													>
														<div style={{ fontWeight: 700 }}>{card.title}</div>
														<ReadOnlyBlock label="مقدار:" value={formatNumberLike(card.value)} />
														<ReadOnlyBlock label="درآمد اپراتور:" value={formatNumberLike(card.incomeOperator)} />
														<ReadOnlyBlock label="درآمد دولت:" value={formatNumberLike(card.incomeGovernment)} />
														<ReadOnlyBlock label="نرخ واحد:" value={formatNumberLike(card.price)} />
														<ReadOnlyBlock label="سود:" value={formatNumberLike(card.profit)} />
														<ReadOnlyBlock label="هزینه اپراتور:" value={formatNumberLike(card.expenseOperator)} />
														<ReadOnlyBlock label="هزینه دولت:" value={formatNumberLike(card.expenseGovernment)} />
													</div>
												))}
											</div>
										)
										: null}

									{readonlyDetailFields.length > 0
										? (
											<div
												style={{
													display: "grid",
													gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
													gap: 8,
												}}
											>
												{readonlyDetailFields.map(field => (
													<ReadOnlyBlock
														key={field.key}
														label={`${field.label}:`}
														value={field.value}
													/>
												))}
											</div>
										)
										: null}

									{config.editableFields.length > 0
										? (
											<div
												style={{
													display: "grid",
													gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
													gap: 12,
												}}
											>
												{config.editableFields.map((field) => {
													if (field.type === "number") {
														return (
															<RHFProNumber<EditFormValues, any>
																key={field.key}
																name={field.key as any}
																label={field.label}
																inputProps={{ placeholder: "عدد را وارد کنید", inputMode: "numeric" } as any}
																enableGrouping
																enableWordsTooltip
															/>
														);
													}

													return (
														<RHFProText<EditFormValues, any>
															key={field.key}
															name={field.key as any}
															label={field.label}
															inputProps={{ placeholder: "مقدار را وارد کنید" }}
														/>
													);
												})}
											</div>
										)
										: null}
								</div>
							</ProCard>
							<div
								style={{
									display: "flex",
									justifyContent: "flex-end",
									marginTop: 8,
									gap: 8,
								}}
							>
								<Button onClick={onClose}>انصراف</Button>
								{config.editableFields.length > 0
									? (
										<Button type="primary" loading={saving} onClick={() => void handleSubmit()}>
											ویرایش
										</Button>
									)
									: null}
							</div>
						</FormProvider>
					</Spin>
				)}
		</Modal>
	);
}
