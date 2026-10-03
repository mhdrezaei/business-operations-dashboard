import type { CompanyDto } from "#src/api/common/common.types.js";
import type { PerformanceListItem, PerformanceServicePath } from "#src/features/performance/api/performances.api";
import type { OpenApiContractModel } from "#src/features/performance/shared/model/performance.form.types";
import type { SectionTone } from "#src/shared/ui/section-card";
import type { CSSProperties, ReactNode } from "react";
import type { PerformanceListRow } from "../../model/performance.list.types";
import { MONTH_OPTIONS } from "#src/features/contract/constant/jalali-date-options.js";
import {
	fetchPerformanceContracts,
	fetchPerformanceDetail,
	fetchPerformanceList,
	updatePerformanceByComposite,
	updatePerformanceById,
	updateSmsCommissionPerformanceByComposite,
	upsertPerformance,
} from "#src/features/performance/api/performances.api";
import {
	normalizePerformanceRecord,
	pickActiveContract,
	pickCompanyTypeToken,
	toNullableNumber,
} from "#src/features/performance/shared/model/performance.helpers";
import { SalesAgencyPerformanceFields } from "#src/features/performance/shared/services/sales-agency/sales-agency.fields";
import { salesAgencyFieldsSchema } from "#src/features/performance/shared/services/sales-agency/sales-agency.schema";
import {
	AlignedFormField,
	useAlignedLabelWidth,
} from "#src/shared/ui/aligned-form-field";
import { DashedBorder } from "#src/shared/ui/dashed-border";
import { DashedCard } from "#src/shared/ui/dashed-card";
import { RHFProNumber, RHFProText } from "#src/shared/ui/rhf-pro";
import { SectionCard } from "#src/shared/ui/section-card";

import { DeleteOutlined, EditOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Card, Modal, Popconfirm, Spin, Tag, theme } from "antd";
import i18next from "i18next";
import { useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import "#src/shared/ui/form-layout/styles.css";

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
	incomeTci: unknown
	incomeFirstSide: unknown
	incomeArea: unknown
	incomeSalesAgent: unknown
}

const SERVICE_DETAIL_KEYS: Record<PerformanceServicePath, string[]> = {
	"openapi": ["value", "income", "expense", "profit", "traffic_income", "traffic_package_count"],
	"psp": [],
	"shahkar": ["value", "income", "expense", "profit"],
	"sms": [],
	"sms-commission": [],
	"traffic": ["company_type", "is_official"],
	"commercial": ["customer_name", "customer_nic", "province_code", "service_type", "value", "income", "expense", "profit"],
	"sales-agency/outbound": ["company_type", "total_sales"],
	"sales-agency/rep-management": ["company_type", "credit_total", "income", "cost_items"],
};

const HIDDEN_DETAIL_KEYS = new Set([
	"id",
	"company",
	"company_id",
	"service",
	"service_id",
	"service_code",
	"sales_agent_id",
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
	"conversion_ratio",
	"contract_unit",
	"traffic_has_county_contract",
]);

const OPENAPI_PACKAGE_PERFORMANCE_LABEL = "مقدار عملکرد پیامک";

function getSmsPerformanceFieldAddon(fieldKey: string) {
	switch (fieldKey) {
		case "sms_irancell_fa":
		case "irancellFa":
			return "ایرانسل - فارسی";
		case "sms_irancell_en":
		case "irancellEn":
			return "ایرانسل - انگلیسی";
		case "sms_mci_fa":
		case "mciFa":
			return "همراه اول - فارسی";
		case "sms_mci_en":
		case "mciEn":
			return "همراه اول - انگلیسی";
		case "sms_other_fa":
		case "otherFa":
			return "سایر - فارسی";
		case "sms_other_en":
		case "otherEn":
			return "سایر - انگلیسی";
		default:
			return undefined;
	}
}

interface Props {
	open: boolean
	service: PerformanceServicePath | null
	companies: CompanyDto[] | undefined
	record: PerformanceListRow | null
	onClose: () => void
	onUpdated?: () => void
	onDelete?: (target?: PerformanceListRow) => void
	deleting?: boolean
	mode?: "default" | "unregistered"
	embedded?: boolean
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
	if (service === "sales-agency/outbound")
		return "سرویس عاملیت فروش کشور";
	if (service === "sales-agency/rep-management")
		return "مدیریت نمایندگان فروش";
	if (service === "openapi")
		return "سرویس OpenAPI";
	if (service === "psp")
		return "سرویس PSP";
	if (service === "sms")
		return "سرویس پیامک";
	if (service === "sms-commission")
		return "سرویس پیامک عاملیت";
	if (service === "shahkar")
		return "کلاسه شاهکار";
	return text || "-";
}

function serviceRequiresCompanyType(service: PerformanceServicePath | null | undefined) {
	return service === "sms" || service === "psp" || service === "traffic" || service === "sales-agency/outbound" || service === "sales-agency/rep-management";
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

	const assignValue = (
		targetKey: string,
		directKeys: string[],
		operationType?: string,
		rowFallbackKeys: string[] = ["value"],
	) => {
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

		const direct = getFirstDefinedValue(row, [...directKeys, ...rowFallbackKeys]);
		if (direct != null) {
			initialValues[targetKey] = direct;
			return;
		}

		const fallbackValue = getFirstDefinedValue(row, rowFallbackKeys);
		if (fallbackValue != null)
			initialValues[targetKey] = fallbackValue;
	};

	assignValue("bill_inquiry_value", ["bill_inquiry_value"], "BILL_INQUIRY");
	assignValue("receipt_register_value", ["receipt_register_value"], "RECEIPT_REGISTER");
	assignValue("traffic_income", ["traffic_income"], "TRAFFIC", ["income"]);
	assignValue("traffic_package_count", ["traffic_package_count"], "TRAFFIC", ["value"]);
	assignValue("sms_irancell_fa", ["sms_irancell_fa"], "SMS_IRANCELL_FA", ["value"]);
	assignValue("sms_irancell_en", ["sms_irancell_en"], "SMS_IRANCELL_EN", ["value"]);
	assignValue("sms_mci_fa", ["sms_mci_fa"], "SMS_MCI_FA", ["value"]);
	assignValue("sms_mci_en", ["sms_mci_en"], "SMS_MCI_EN", ["value"]);
	assignValue("sms_other_fa", ["sms_other_fa"], "SMS_OTHER_FA", ["value"]);
	assignValue("sms_other_en", ["sms_other_en"], "SMS_OTHER_EN", ["value"]);
}

function getOpenApiOperationRowValue(
	rows: PerformanceListItem[],
	operationType: string,
	keys: string[],
) {
	const matchedRow = rows.find(row => toUpperText((row as Record<string, unknown>).operation_type) === operationType);
	if (!matchedRow)
		return null;

	return getFirstDefinedValue(matchedRow as Record<string, unknown>, keys);
}

function normalizeOpenApiContractModel(value: unknown): OpenApiContractModel | null {
	if (typeof value !== "string")
		return null;

	const normalized = value.trim().toLowerCase();
	if (normalized === "legacy" || normalized === "package")
		return normalized;

	return null;
}

function resolveOpenApiContractModel(
	detail: Record<string, unknown> | null,
	record: PerformanceListRow | null,
	rows: PerformanceListItem[],
): OpenApiContractModel | null {
	const direct = normalizeOpenApiContractModel(detail?.contract_model ?? detail?.contractModel ?? record?.contract_model ?? record?.contractModel);
	if (direct)
		return direct;

	const nested = normalizeOpenApiContractModel(
		(detail?.contract_openapi_details as Record<string, unknown> | null | undefined)?.contract_model
		?? (record?.contract_openapi_details as Record<string, unknown> | null | undefined)?.contract_model,
	);
	if (nested)
		return nested;

	const operationTypes = new Set(
		rows
			.map(row => toUpperText((row as Record<string, unknown>).operation_type))
			.filter(Boolean),
	);

	if (
		operationTypes.has("TRAFFIC")
		|| operationTypes.has("TRAFFIC_REVENUE")
		|| operationTypes.has("TRAFFIC_PACKAGE_COUNT")
		|| operationTypes.has("SMS_IRANCELL_FA")
		|| operationTypes.has("SMS_IRANCELL_EN")
		|| operationTypes.has("SMS_MCI_FA")
		|| operationTypes.has("SMS_MCI_EN")
		|| operationTypes.has("SMS_OTHER_FA")
		|| operationTypes.has("SMS_OTHER_EN")
		|| operationTypes.has("IRANCELL_FA")
		|| operationTypes.has("IRANCELL_EN")
		|| operationTypes.has("MCI_FA")
		|| operationTypes.has("MCI_EN")
		|| operationTypes.has("OTHER_FA")
		|| operationTypes.has("OTHER_EN")
	) {
		return "package";
	}

	if (operationTypes.has("BILL_INQUIRY") || operationTypes.has("RECEIPT_REGISTER"))
		return "legacy";

	return null;
}

function buildOpenApiUpdatePayload(
	row: PerformanceListItem,
	basePayload: Record<string, unknown>,
	fieldKey: string,
	value: unknown,
) {
	return {
		...basePayload,
		operation_type: row.operation_type ?? null,
		value: toPayloadValue(value),
		[fieldKey]: toPayloadValue(value),
	};
}

function buildOpenApiTrafficUpdatePayload(
	row: PerformanceListItem,
	basePayload: Record<string, unknown>,
	trafficIncome: unknown,
	trafficPackageCount: unknown,
) {
	return {
		...basePayload,
		operation_type: row.operation_type ?? null,
		value: toPayloadValue(trafficPackageCount),
		income: toPayloadValue(trafficIncome),
		traffic_income: toPayloadValue(trafficIncome),
		traffic_package_count: toPayloadValue(trafficPackageCount),
	};
}

function getTrafficLocationKey(value: unknown) {
	return String(value ?? "").trim().toUpperCase();
}

function getTrafficLocationRow(rows: PerformanceListItem[], location: "TEHRAN" | "COUNTY") {
	return rows.find(row => getTrafficLocationKey((row as Record<string, unknown>).location) === location) ?? null;
}

function getTrafficRowsFromSources(
	detail: Record<string, unknown>,
	recordFallback: Record<string, unknown>,
	rows: PerformanceListItem[],
) {
	const fromDetail = Array.isArray(detail.traffic_locations) ? detail.traffic_locations as PerformanceListItem[] : [];
	const fromRecord = Array.isArray(recordFallback.traffic_locations) ? recordFallback.traffic_locations as PerformanceListItem[] : [];
	const directRows = [detail, recordFallback]
		.filter(source => getTrafficLocationKey(source.location) === "TEHRAN" || getTrafficLocationKey(source.location) === "COUNTY") as PerformanceListItem[];
	return [...rows, ...fromDetail, ...fromRecord, ...directRows];
}

function applyTrafficInitialValues(
	initialValues: EditFormValues,
	detail: Record<string, unknown>,
	recordFallback: Record<string, unknown>,
	rows: PerformanceListItem[],
) {
	const trafficRows = getTrafficRowsFromSources(detail, recordFallback, rows);
	const tehran = getTrafficLocationRow(trafficRows, "TEHRAN");
	const county = getTrafficLocationRow(trafficRows, "COUNTY");

	initialValues.tehranValue = tehran?.value ?? null;
	initialValues.tehranValueReceive = tehran?.value_receive ?? null;
	initialValues.tehranConversionRatio = toNullableNumber((tehran as Record<string, unknown>)?.conversion_ratio) ?? null;
	initialValues.countyValue = county?.value ?? null;
	initialValues.countyValueReceive = county?.value_receive ?? null;
	initialValues.countyConversionRatio = toNullableNumber((county as Record<string, unknown>)?.conversion_ratio) ?? null;
}

function buildTrafficPayloadFields(values: EditFormValues, locations: Set<"TEHRAN" | "COUNTY">, isCp: boolean) {
	const payload: Record<string, unknown> = {};

	if (locations.has("TEHRAN")) {
		payload.tehran_value = toPayloadValue(values.tehranValue);
		payload.tehran_value_receive = toPayloadValue(values.tehranValueReceive);
		payload.tehran_conversion_ratio = isCp ? toPayloadValue(values.tehranConversionRatio) : null;
	}

	if (locations.has("COUNTY")) {
		const countyValue = toPayloadValue(values.countyValue);
		const countyValueReceive = toPayloadValue(values.countyValueReceive);
		if (countyValue != null || countyValueReceive != null) {
			payload.county_value = countyValue;
			payload.county_value_receive = countyValueReceive;
			payload.county_conversion_ratio = isCp ? toPayloadValue(values.countyConversionRatio) : null;
		}
	}

	return payload;
}

function getTrafficFieldLocation(fieldKey: string): "TEHRAN" | "COUNTY" | null {
	if (fieldKey === "tehranValue" || fieldKey === "tehranValueReceive" || fieldKey === "tehranConversionRatio")
		return "TEHRAN";
	if (fieldKey === "countyValue" || fieldKey === "countyValueReceive" || fieldKey === "countyConversionRatio")
		return "COUNTY";
	return null;
}

function getTrafficHasCountyContract(
	detail: Record<string, unknown>,
	recordFallback: Record<string, unknown>,
) {
	const sources = [detail, recordFallback];
	for (const source of sources) {
		const direct = source.traffic_has_county_contract;
		if (typeof direct === "boolean")
			return direct;

		const traffic = source.traffic as Record<string, unknown> | null | undefined;
		if (typeof traffic?.has_county_contract === "boolean")
			return traffic.has_county_contract;
	}

	return null;
}

function ReadOnlyBlock({ label, value }: { label: string, value: unknown }) {
	return (
		<div className="performance-detail-value">
			<span className="performance-detail-value__label">{label}</span>
			<span className="performance-detail-value__content" dir="ltr">{value == null || value === "" ? "-" : String(value)}</span>
		</div>
	);
}

function DetailValueRows({ fields }: { fields: DetailField[] }) {
	const { token } = theme.useToken();
	const rows = Array.from(
		{ length: Math.ceil(fields.length / 2) },
		(_, index) => fields.slice(index * 2, index * 2 + 2),
	);
	const style = {
		"--performance-detail-divider-color": token.colorSplit,
		"--performance-detail-divider-width": `${token.lineWidth}px`,
	} as CSSProperties;

	return (
		<div className="performance-detail-value-rows" style={style}>
			{rows.map(row => (
				<div key={row.map(field => field.key).join("-")} className="performance-detail-value-row">
					{row.map(field => (
						<ReadOnlyBlock key={field.key} label={field.label} value={field.value} />
					))}
				</div>
			))}
		</div>
	);
}

function DetailSection({ title, children, tone, extra, collapsible = true }: { title: string, children: ReactNode, tone?: "success", extra?: ReactNode, collapsible?: boolean }) {
	return (
		<SectionCard
			title={title}
			tone={tone === "success" ? "addenda" : "primary"}
			className="performance-detail-section"
			extra={extra}
			collapsible={collapsible}
		>
			<div className="performance-detail-section__body">{children}</div>
		</SectionCard>
	);
}

function resolveMetricCardTone(key: string, title: string): SectionTone {
	const value = `${key} ${title}`.toUpperCase();
	if (value.includes("IRANCELL") || value.includes("ایرانسل"))
		return "gold";
	if (value.includes("MCI") || value.includes("HAMRAH") || value.includes("همراه اول"))
		return "blue";
	if (value.includes("RIGHTEL") || value.includes("رایتل"))
		return "purple";
	return "geekblue";
}

function DetailMetricCard({ cardKey, title, children }: { cardKey: string, title: string, children: ReactNode }) {
	return (
		<DashedCard title={title} tone={resolveMetricCardTone(cardKey, title)} className="performance-detail-metric-card">
			<div className="performance-detail-metric-card__rows">{children}</div>
		</DashedCard>
	);
}

export function PerformanceDetailModal({
	open,
	service,
	companies,
	record,
	onClose,
	onUpdated,
	onDelete,
	deleting = false,
	mode = "default",
	embedded = false,
}: Props) {
	const { t } = useTranslation();
	const isUnregisteredMode = mode === "unregistered";
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
	const [smsContract, setSmsContract] = useState<Record<string, unknown> | null>(null);
	const [smsPerformances, setSmsPerformances] = useState<PerformanceListItem[]>([]);
	const [trafficPerformances, setTrafficPerformances] = useState<PerformanceListItem[]>([]);
	const [openApiPerformances, setOpenApiPerformances] = useState<PerformanceListItem[]>([]);

	const normalizedRecord = useMemo(
		() => normalizePerformanceRecord(record ?? {}),
		[record],
	);
	const openApiContractModel = useMemo(
		() => resolveOpenApiContractModel(detail, record, openApiPerformances),
		[detail, record, openApiPerformances],
	);
	const openApiPackageAlignedLabelStyle = useAlignedLabelWidth([
		t("performance.fields.openapi.billInquiryValue"),
		t("performance.fields.openapi.trafficRevenue"),
		t("performance.fields.openapi.trafficPackageCount"),
		OPENAPI_PACKAGE_PERFORMANCE_LABEL,
	]);
	const pspAlignedLabelStyle = useAlignedLabelWidth([
		t("performance.fields.psp.performanceValue"),
		t("performance.fields.psp.monthlyRevenue"),
	]);
	const config = useMemo<ServiceEditConfig | null>(() => {
		if (!service)
			return null;

		if (service === "openapi") {
			if (openApiContractModel === "package") {
				return {
					title: t("performance.modal.titles.openapi"),
					readonlyKeys: [],
					editableFields: [
						{ key: "bill_inquiry_value", label: t("performance.fields.openapi.billInquiryValue"), type: "number", required: true },
						{ key: "traffic_income", label: t("performance.fields.openapi.trafficRevenue"), type: "number", required: true },
						{ key: "traffic_package_count", label: t("performance.fields.openapi.trafficPackageCount"), type: "number", required: true },
						{ key: "sms_irancell_fa", label: t("performance.fields.sms.irancellFa"), type: "number", required: true },
						{ key: "sms_irancell_en", label: t("performance.fields.sms.irancellEn"), type: "number", required: true },
						{ key: "sms_mci_fa", label: t("performance.fields.sms.mciFa"), type: "number", required: true },
						{ key: "sms_mci_en", label: t("performance.fields.sms.mciEn"), type: "number", required: true },
						{ key: "sms_other_fa", label: t("performance.fields.sms.otherFa"), type: "number", required: true },
						{ key: "sms_other_en", label: t("performance.fields.sms.otherEn"), type: "number", required: true },
					],
					payloadKeys: [
						"bill_inquiry_value",
						"traffic_income",
						"traffic_package_count",
						"sms_irancell_fa",
						"sms_irancell_en",
						"sms_mci_fa",
						"sms_mci_en",
						"sms_other_fa",
						"sms_other_en",
					],
				};
			}

			return {
				title: t("performance.modal.titles.openapi"),
				readonlyKeys: [],
				editableFields: [
					{ key: "bill_inquiry_value", label: t("performance.fields.openapi.billInquiryValue"), type: "number", required: true },
					{ key: "receipt_register_value", label: t("performance.fields.openapi.receiptRegisterValue"), type: "number", required: true },
				],
				payloadKeys: ["bill_inquiry_value", "receipt_register_value"],
			};
		}

		if (service === "psp") {
			return {
				title: t("performance.modal.titles.psp"),
				readonlyKeys: [],
				editableFields: [
					{ key: "value", label: t("performance.fields.psp.performanceValue"), type: "number", required: true },
					{ key: "income", label: t("performance.fields.psp.monthlyRevenue"), type: "number", required: true },
				],
				payloadKeys: ["value", "income"],
			};
		}

		if (service === "shahkar") {
			return {
				title: t("performance.modal.titles.shahkar"),
				readonlyKeys: [],
				editableFields: [
					{ key: "value", label: t("performance.fields.shahkar.performanceValue"), type: "number", required: true },
				],
				payloadKeys: ["value"],
			};
		}

		if (service === "sales-agency/outbound") {
			return {
				title: "ویرایش عملکرد عاملیت فروش کشور",
				readonlyKeys: ["company_type"],
				editableFields: [{ key: "total_sales", label: "فروش کل ماه (ریال)", type: "number", required: true }],
				payloadKeys: ["company_type", "total_sales"],
			};
		}

		if (service === "sales-agency/rep-management") {
			return {
				title: "ویرایش عملکرد عاملیت فروش کشور",
				readonlyKeys: ["company_type"],
				editableFields: [
					{ key: "credit_total", label: "اعتبار کل ماهیانه (ریال)", type: "number", required: true },
					{ key: "income", label: "درآمد کل (ریال)", type: "number", required: true },
					{ key: "cost_items", label: "هزینه‌ها", type: "text", required: true },
				],
				payloadKeys: ["company_type", "credit_total", "income", "cost_items"],
			};
		}

		if (service === "sms") {
			return {
				title: t("performance.modal.titles.sms"),
				readonlyKeys: [],
				editableFields: [
					{ key: "irancellFa", label: t("performance.fields.sms.irancellFa"), type: "number", required: true },
					{ key: "irancellEn", label: t("performance.fields.sms.irancellEn"), type: "number", required: true },
					{ key: "mciFa", label: t("performance.fields.sms.mciFa"), type: "number", required: true },
					{ key: "mciEn", label: t("performance.fields.sms.mciEn"), type: "number", required: true },
					{ key: "otherFa", label: t("performance.fields.sms.otherFa"), type: "number", required: true },
					{ key: "otherEn", label: t("performance.fields.sms.otherEn"), type: "number", required: true },
				],
				payloadKeys: ["company_type", "irancellFa", "irancellEn", "mciFa", "mciEn", "otherFa", "otherEn"],
			};
		}

		if (service === "sms-commission") {
			return {
				title: "ویرایش عملکرد پیامک عاملیت",
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
			};
		}

		if (service === "traffic") {
			const countyRequired = !isUnregisteredMode;
			const isCpType = normalizedRecord.companyType?.toUpperCase() === "CP";
			return {
				title: t("performance.modal.titles.traffic"),
				readonlyKeys: ["company_type"],
				editableFields: [
					{ key: "tehranValue", label: t("performance.fields.traffic.tehranValue"), type: "number", required: true },
					{ key: "tehranValueReceive", label: t("performance.fields.traffic.tehranValueReceive"), type: "number", required: true },
					...(isCpType ? [{ key: "tehranConversionRatio", label: t("performance.fields.traffic.tehranConversionRatio"), type: "number" as const, required: false }] : []),
					{ key: "countyValue", label: t("performance.fields.traffic.countyValue"), type: "number", required: countyRequired },
					{ key: "countyValueReceive", label: t("performance.fields.traffic.countyValueReceive"), type: "number", required: countyRequired },
					...(isCpType ? [{ key: "countyConversionRatio", label: t("performance.fields.traffic.countyConversionRatio"), type: "number" as const, required: false }] : []),
				],
				payloadKeys: ["company_type", "tehranValue", "tehranValueReceive", "tehranConversionRatio", "countyValue", "countyValueReceive", "countyConversionRatio"],
			};
		}

		return {
			title: t("performance.modal.titles.commercial"),
			readonlyKeys: ["customer_name", "customer_nic", "province_code", "service_type"],
			editableFields: [
				{ key: "value", label: t("performance.columns.value"), type: "number", required: true },
			],
			payloadKeys: ["customer_name", "customer_nic", "province_code", "service_type", "value"],
		};
	}, [service, openApiContractModel, isUnregisteredMode, normalizedRecord.companyType, t]);
	const isOpenApiPackageEditLayout = service === "openapi" && openApiContractModel === "package";
	const isSmsEditAlignedLayout = service === "sms" || service === "sms-commission";
	const isPspEditLayout = service === "psp";
	const isTrafficEditLayout = service === "traffic";
	const fieldLabels = useMemo<Record<string, string>>(() => ({
		service_name: t("performance.columns.service"),
		company_name: t("performance.columns.company"),
		sh_year: t("performance.columns.year"),
		sh_month: t("performance.columns.month"),
		value: t("performance.columns.value"),
		value_receive: t("performance.columns.valueReceive"),
		income: service === "traffic" ? t("performance.fields.traffic.sentTraffic") : "درآمد استعلام قبض این ماه",
		expense: service === "traffic" ? t("performance.fields.traffic.receivedTraffic") : "هزینه استعلام قبض این ماه",
		profit: t("performance.columns.profit"),
		bill_inquiry_value: t("performance.fields.openapi.billInquiryValue"),
		receipt_register_value: t("performance.fields.openapi.receiptRegisterValue"),
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
	}), [t, service]);
	const operationTypeLabels = useMemo<Record<string, string>>(() => ({
		BILL_INQUIRY: t("performance.operationType.billInquiry"),
		RECEIPT_REGISTER: t("performance.operationType.receiptRegister"),
		TRAFFIC: t("performance.fields.openapi.trafficPackageCount"),
		TRAFFIC_REVENUE: t("performance.fields.openapi.trafficRevenue"),
		TRAFFIC_PACKAGE_COUNT: t("performance.fields.openapi.trafficPackageCount"),
		SMS_IRANCELL_FA: t("performance.fields.sms.irancellFa"),
		SMS_IRANCELL_EN: t("performance.fields.sms.irancellEn"),
		SMS_MCI_FA: t("performance.fields.sms.mciFa"),
		SMS_MCI_EN: t("performance.fields.sms.mciEn"),
		SMS_OTHER_FA: t("performance.fields.sms.otherFa"),
		SMS_OTHER_EN: t("performance.fields.sms.otherEn"),
		IRANCELL_FA: t("performance.fields.sms.irancellFa"),
		IRANCELL_EN: t("performance.fields.sms.irancellEn"),
		MCI_FA: t("performance.fields.sms.mciFa"),
		MCI_EN: t("performance.fields.sms.mciEn"),
		OTHER_FA: t("performance.fields.sms.otherFa"),
		OTHER_EN: t("performance.fields.sms.otherEn"),
	}), [t]);
	// const isSmsService = service === "sms";
	const isSmsLikeService = service === "sms" || service === "sms-commission";
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
	const selectedCompanyType = useMemo(() => {
		const salesAgencyType = service === "sales-agency/outbound"
			? "OUTBOUND"
			: service === "sales-agency/rep-management"
				? "SALES_REP_MANAGEMENT"
				: null;
		const direct = pickCompanyTypeToken(
			mergedDetail.company_type
			?? mergedDetail.companyType
			?? normalizedRecord.companyType,
		) ?? salesAgencyType;
		if (direct)
			return direct;

		const companyId = Number(mergedDetail.company ?? mergedDetail.company_id ?? record?.company ?? record?.company_id);
		if (!Number.isFinite(companyId))
			return null;
		const found = companies?.find(company => company.id === companyId) as Record<string, unknown> | undefined;
		return pickCompanyTypeToken(found?.company_type);
	}, [companies, mergedDetail, normalizedRecord.companyType, record, service]);
	const isTrafficUnitVisible = typeof selectedCompanyType === "string" && ["CP", "PREMIUM", "IXP", "TCI"].includes(selectedCompanyType.toUpperCase());
	const visibleTrafficLocations = useMemo(() => {
		if (service !== "traffic")
			return new Set<"TEHRAN" | "COUNTY">();
		if (isUnregisteredMode) {
			const hasCountyContract = getTrafficHasCountyContract(
				mergedDetail,
				record as Record<string, unknown> ?? {},
			);
			if (hasCountyContract === false)
				return new Set<"TEHRAN" | "COUNTY">(["TEHRAN"]);
			return new Set<"TEHRAN" | "COUNTY">(["TEHRAN", "COUNTY"]);
		}

		const trafficRows = getTrafficRowsFromSources(
			mergedDetail,
			record as Record<string, unknown> ?? {},
			trafficPerformances,
		);
		const locations = new Set<"TEHRAN" | "COUNTY">();
		trafficRows.forEach((row) => {
			const location = getTrafficLocationKey((row as Record<string, unknown>).location);
			if (location === "TEHRAN" || location === "COUNTY")
				locations.add(location);
		});

		return locations.size > 0 ? locations : new Set<"TEHRAN" | "COUNTY">(["TEHRAN", "COUNTY"]);
	}, [service, isUnregisteredMode, mergedDetail, record, trafficPerformances]);
	const visibleEditableFields = useMemo(() => {
		if (!config)
			return [];
		if (service !== "traffic")
			return config.editableFields;

		return config.editableFields.filter((field) => {
			const location = getTrafficFieldLocation(field.key);
			return !location || visibleTrafficLocations.has(location);
		});
	}, [config, service, visibleTrafficLocations]);
	const openApiSummaryFields = useMemo(() => {
		if (service !== "openapi")
			return [];

		const billInquiryIncome = getOpenApiOperationRowValue(openApiPerformances, "BILL_INQUIRY", ["income"]) ?? mergedDetail.income;
		const billInquiryExpense = getOpenApiOperationRowValue(openApiPerformances, "BILL_INQUIRY", ["expense"]) ?? mergedDetail.expense;
		const packageTrafficIncome = getOpenApiOperationRowValue(openApiPerformances, "TRAFFIC", ["traffic_income", "income"]);
		const receiptRegisterIncome = getOpenApiOperationRowValue(openApiPerformances, "RECEIPT_REGISTER", ["profit", "income"]) ?? getOpenApiOperationRowValue(
			openApiPerformances,
			openApiContractModel === "package" ? "TRAFFIC" : "RECEIPT_REGISTER",
			openApiContractModel === "package" ? ["traffic_income", "income", "profit"] : ["profit", "income"],
		)
		?? mergedDetail.profit;

		return [
			{ key: "income", label: "درآمد استعلام قبض این ماه", value: formatNumberLike(billInquiryIncome) },
			{ key: "expense", label: "هزینه استعلام قبض این ماه", value: formatNumberLike(billInquiryExpense) },
			{
				key: openApiContractModel === "package" ? "traffic_income" : "profit",
				label: openApiContractModel === "package" ? t("performance.fields.openapi.trafficRevenue") : "درآمد ثبت وصولی این ماه",
				value: formatNumberLike(openApiContractModel === "package" ? packageTrafficIncome : receiptRegisterIncome),
			},
		];
	}, [service, mergedDetail, openApiPerformances, openApiContractModel, t]);
	const shahkarSummaryFields = useMemo(() => {
		if (service !== "shahkar")
			return [];

		return [
			{ key: "income", label: "درآمد این ماه", value: formatNumberLike(mergedDetail.income) },
		];
	}, [service, mergedDetail]);
	const pspSummaryFields = useMemo(() => {
		if (service !== "psp")
			return [];

		return [
			{ key: "income", label: t("performance.fields.psp.monthlyRevenue"), value: formatNumberLike(mergedDetail.income) },
		];
	}, [service, mergedDetail, t]);
	const trafficContractUnits = useMemo(() => {
		if (service !== "traffic")
			return { tehran: null as string | null, county: null as string | null };

		const allRows = getTrafficRowsFromSources(
			mergedDetail,
			record as Record<string, unknown> ?? {},
			trafficPerformances,
		);
		const tehranRow = getTrafficLocationRow(allRows, "TEHRAN");
		const countyRow = getTrafficLocationRow(allRows, "COUNTY");

		const locationUnits = (mergedDetail.traffic_location_units ?? (record as Record<string, unknown>)?.traffic_location_units) as Record<string, string> | null | undefined;

		return {
			tehran: typeof (tehranRow as Record<string, unknown>)?.contract_unit === "string"
				? (tehranRow as Record<string, unknown>).contract_unit as string
				: (typeof locationUnits?.TEHRAN === "string" ? locationUnits.TEHRAN : null),
			county: typeof (countyRow as Record<string, unknown>)?.contract_unit === "string"
				? (countyRow as Record<string, unknown>).contract_unit as string
				: (typeof locationUnits?.COUNTY === "string" ? locationUnits.COUNTY : null),
		};
	}, [service, mergedDetail, record, trafficPerformances]);

	const trafficSummaryCards = useMemo(() => {
		if (service !== "traffic")
			return [];

		const allRows = getTrafficRowsFromSources(
			mergedDetail,
			record as Record<string, unknown> ?? {},
			trafficPerformances,
		);

		return (["TEHRAN", "COUNTY"] as const)
			.filter(location => visibleTrafficLocations.has(location))
			.map((location) => {
				const row = getTrafficLocationRow(allRows, location) as Record<string, unknown> | null;
				return {
					key: location,
					title: location === "TEHRAN" ? t("performance.traffic.tehranPerformance") : t("performance.traffic.countyPerformance"),
					value: formatNumberLike(row?.value),
					valueReceive: formatNumberLike(row?.value_receive),
					income: formatNumberLike(row?.income),
					expense: formatNumberLike(row?.expense),
					profit: formatNumberLike(row?.profit),
				};
			});
	}, [service, mergedDetail, record, trafficPerformances, visibleTrafficLocations, t]);
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
			...(service === "traffic" ? ["value", "value_receive", "income", "expense", "profit", "location", "traffic_locations"] : []),
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
		if (!isSmsLikeService)
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
				incomeTci: perf?.income_tci ?? null,
				incomeFirstSide: perf?.income_first_side ?? null,
				incomeArea: perf?.income_area ?? null,
				incomeSalesAgent: perf?.income_sales_agent ?? null,
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
				incomeTci: item?.income_tci ?? null,
				incomeFirstSide: item?.income_first_side ?? null,
				incomeArea: item?.income_area ?? null,
				incomeSalesAgent: item?.income_sales_agent ?? null,
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
				incomeTci: item?.income_tci ?? null,
				incomeFirstSide: item?.income_first_side ?? null,
				incomeArea: item?.income_area ?? null,
				incomeSalesAgent: item?.income_sales_agent ?? null,
			});
		});

		return cards;
	}, [isSmsLikeService, mergedDetail.items, smsContract, smsPerformances, t]);

	const smsCommissionSummaryLabels = useMemo(() => ({
		value: "مقدار عملکرد",
		price: "قیمت واحد",
		income: "درآمد کاراشاب",
		profit: "سود کاراشاب",
		expense: "هزینه کاراشاب",
		incomeTci: "درآمد مخابرات",
		incomeFirstSide: "درآمد طرف اول",
		incomeArea: "درآمد منطقه",
		incomeSalesAgent: "درآمد نماینده فروش",
	}), []);

	const form = useForm<EditFormValues>({
		defaultValues: {},
		mode: "all",
		shouldUnregister: true,
	});
	const initialFormValuesRef = useRef<EditFormValues>({});
	const watchedEditValues = useWatch({ control: form.control }) as EditFormValues;
	const hasMeaningfulChanges = useMemo(() => {
		return visibleEditableFields.some((field) => {
			const currentValue = toPayloadValue(watchedEditValues?.[field.key]);
			const initialValue = toPayloadValue(initialFormValuesRef.current[field.key]);
			return !Object.is(currentValue, initialValue);
		});
	}, [visibleEditableFields, watchedEditValues]);

	useEffect(() => {
		if (!open || !service || !record)
			return;

		if (isUnregisteredMode) {
			// eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
			setLoading(false);
			setDetail(record as Record<string, unknown>);
			return;
		}

		if (service === "traffic") {
			// eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
			setLoading(false);
			setDetail(record as Record<string, unknown>);
			return;
		}

		let cancelled = false;
		setLoading(true);

		(async () => {
			try {
				if (normalizedRecord.id != null && service !== "sms-commission") {
					const response = await fetchPerformanceDetail(service, normalizedRecord.id);
					if (!cancelled)
						setDetail(response);
					return;
				}

				if (!cancelled)
					setDetail(record as Record<string, unknown>);
			}
			catch {
				if (!cancelled)
					setDetail(record as Record<string, unknown>);
			}
			finally {
				if (!cancelled)
					setLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [open, service, record, normalizedRecord.id, isUnregisteredMode]);

	useEffect(() => {
		if (!open || service !== "sms" || isUnregisteredMode) {
			setSmsContract(null);
			return;
		}

		const serviceId = normalizedRecord.serviceId;
		const companyId = normalizedRecord.companyId;
		const year = normalizedRecord.year;
		const month = normalizedRecord.month;
		if (serviceId == null || companyId == null) {
			setSmsContract(null);
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
				setSmsContract((active ?? contracts[0] ?? null) as Record<string, unknown> | null);
			}
			catch {
				if (!cancelled)
					setSmsContract(null);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [open, service, normalizedRecord.companyId, normalizedRecord.serviceId, normalizedRecord.year, normalizedRecord.month, isUnregisteredMode]);

	useEffect(() => {
		if (!open || !isSmsLikeService || isUnregisteredMode) {
			setSmsPerformances([]);
			return;
		}

		const serviceId = normalizedRecord.serviceId;
		const companyId = normalizedRecord.companyId;
		const year = normalizedRecord.year;
		const month = normalizedRecord.month;
		if (serviceId == null || companyId == null || year == null || month == null) {
			setSmsPerformances([]);
			return;
		}

		let cancelled = false;
		(async () => {
			try {
				const response = await fetchPerformanceList(service, {
					page: 1,
					page_size: 250,
					service: serviceId,
					company: companyId,
					sh_year: year,
					sh_month: month,
					sales_agent: normalizedRecord.salesAgentId ?? undefined,
				});
				if (!cancelled)
					setSmsPerformances(response?.results ?? []);
			}
			catch {
				if (!cancelled)
					setSmsPerformances([]);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [
		open,
		service,
		isSmsLikeService,
		normalizedRecord.companyId,
		normalizedRecord.serviceId,
		normalizedRecord.year,
		normalizedRecord.month,
		normalizedRecord.salesAgentId,
		isUnregisteredMode,
	]);

	useEffect(() => {
		if (!open || service !== "traffic") {
			setTrafficPerformances([]);
			return;
		}

		const serviceId = normalizedRecord.serviceId;
		const companyId = normalizedRecord.companyId;
		const year = normalizedRecord.year;
		const month = normalizedRecord.month;
		if (serviceId == null || companyId == null || year == null || month == null) {
			setTrafficPerformances([]);
			return;
		}

		let cancelled = false;
		(async () => {
			try {
				const response = await fetchPerformanceList("traffic", {
					page: 1,
					page_size: 250,
					service: serviceId,
					company: companyId,
					sh_year: year,
					sh_month: month,
					company_type: selectedCompanyType ?? undefined,
				});
				if (!cancelled)
					setTrafficPerformances(response?.results ?? []);
			}
			catch {
				if (!cancelled)
					setTrafficPerformances([]);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [open, service, normalizedRecord.companyId, normalizedRecord.serviceId, normalizedRecord.year, normalizedRecord.month, selectedCompanyType]);

	useEffect(() => {
		if (!open || service !== "openapi" || isUnregisteredMode) {
			setOpenApiPerformances([]);
			return;
		}

		const serviceId = normalizedRecord.serviceId;
		const companyId = normalizedRecord.companyId;
		const year = normalizedRecord.year;
		const month = normalizedRecord.month;
		if (serviceId == null || companyId == null || year == null || month == null) {
			setOpenApiPerformances([]);
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
					setOpenApiPerformances(response?.results ?? []);
			}
			catch {
				if (!cancelled)
					setOpenApiPerformances([]);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [open, service, normalizedRecord.companyId, normalizedRecord.serviceId, normalizedRecord.year, normalizedRecord.month, isUnregisteredMode]);

	useEffect(() => {
		if (!service || !record || !detail || !config)
			return;

		const initialValues = buildInitialValues(config, service, detail, record as Record<string, unknown>);
		if (service === "openapi")
			applyOpenApiInitialValues(initialValues, detail, record as Record<string, unknown>, openApiPerformances);
		if (service === "traffic")
			applyTrafficInitialValues(initialValues, detail, record as Record<string, unknown>, trafficPerformances);
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
		initialFormValuesRef.current = initialValues;
		form.reset(initialValues);
	}, [service, record, detail, config, form, smsBreakdownCards, openApiPerformances, trafficPerformances, isUnregisteredMode]);

	const handleSubmit = form.handleSubmit(async (values) => {
		if (!service || !config)
			return;

		form.clearErrors();
		if (service === "sales-agency/outbound" || service === "sales-agency/rep-management") {
			const result = salesAgencyFieldsSchema(selectedCompanyType).safeParse(values);
			if (!result.success) {
				result.error.issues.forEach((issue) => {
					const fieldName = issue.path.join(".");
					if (fieldName)
						form.setError(fieldName as any, { type: "validation", message: issue.message });
				});
				return;
			}
		}

		let hasError = false;
		visibleEditableFields.forEach((field) => {
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

		const companyId = toNullableNumber(values.company ?? mergedDetail.company ?? mergedDetail.company_id);
		const serviceId = toNullableNumber(values.service ?? mergedDetail.service ?? mergedDetail.service_id);
		const year = toNullableNumber(values.sh_year ?? mergedDetail.sh_year);
		const month = toNullableNumber(values.sh_month ?? mergedDetail.sh_month);
		const salesAgentId = toNullableNumber(values.sales_agent ?? mergedDetail.sales_agent ?? mergedDetail.sales_agent_id);

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

		if (serviceRequiresCompanyType(service)) {
			payload.company_type = pickCompanyTypeToken(payload.company_type) ?? selectedCompanyType;
		}

		if (service === "traffic") {
			const isCpEdit = typeof selectedCompanyType === "string" && selectedCompanyType.toUpperCase() === "CP";
			Object.assign(payload, buildTrafficPayloadFields(values, visibleTrafficLocations, isCpEdit));
			delete payload.tehranValue;
			delete payload.tehranValueReceive;
			delete payload.tehranConversionRatio;
			delete payload.countyValue;
			delete payload.countyValueReceive;
			delete payload.countyConversionRatio;
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
				await updatePerformanceByComposite(service, companyId, year, month, payload);
			}
			else if (service === "traffic") {
				await updatePerformanceByComposite(service, companyId, year, month, payload);
			}
			else if (service === "openapi" && openApiPerformances.length > 0) {
				const operationFields = openApiContractModel === "package"
					? [
						["BILL_INQUIRY", "bill_inquiry_value"],
						["SMS_IRANCELL_FA", "sms_irancell_fa"],
						["SMS_IRANCELL_EN", "sms_irancell_en"],
						["SMS_MCI_FA", "sms_mci_fa"],
						["SMS_MCI_EN", "sms_mci_en"],
						["SMS_OTHER_FA", "sms_other_fa"],
						["SMS_OTHER_EN", "sms_other_en"],
					] as const
					: [
						["BILL_INQUIRY", "bill_inquiry_value"],
						["RECEIPT_REGISTER", "receipt_register_value"],
					] as const;

				const rowMap = new Map(
					openApiPerformances.map(row => [toUpperText((row as Record<string, unknown>).operation_type), row] as const),
				);

				if (openApiContractModel === "package") {
					const trafficRow = rowMap.get("TRAFFIC");
					if (trafficRow?.id != null) {
						await updatePerformanceById(
							service,
							trafficRow.id,
							buildOpenApiTrafficUpdatePayload(
								trafficRow,
								payload,
								values.traffic_income,
								values.traffic_package_count,
							),
						);
					}
				}

				for (const [operationType, fieldKey] of operationFields) {
					const row = rowMap.get(operationType);
					if (row?.id == null)
						continue;

					await updatePerformanceById(
						service,
						row.id,
						buildOpenApiUpdatePayload(row, payload, fieldKey, values[fieldKey]),
					);
				}
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
			if (!embedded)
				onClose();
		}
		finally {
			setSaving(false);
		}
	});
	const resetChanges = () => form.reset(initialFormValuesRef.current);
	const sectionActions = (
		<div className="performance-detail-section__edit-actions">
			{onDelete
				? (
					<Popconfirm
						title={t("common.confirmDelete")}
						okText={t("common.confirm")}
						cancelText={t("common.cancel")}
						onConfirm={() => onDelete()}
					>
						<Button size="small" danger loading={deleting} icon={<DeleteOutlined />}>
							حذف
						</Button>
					</Popconfirm>
				)
				: null}
			{hasMeaningfulChanges
				? (
					<Button size="small" icon={<ReloadOutlined />} onClick={resetChanges}>
						بازنشانی
					</Button>
				)
				: null}
			{visibleEditableFields.length > 0
				? (
					<Button
						size="small"
						type="primary"
						icon={<EditOutlined />}
						loading={saving}
						disabled={!hasMeaningfulChanges || saving}
						onClick={() => void handleSubmit()}
					>
						ویرایش
					</Button>
				)
				: null}
		</div>
	);
	const plainBreakdownFields = service === "traffic" || isSmsLikeService
		? []
		: [
			...(service === "openapi" ? openApiSummaryFields : []),
			...(service === "shahkar" ? shahkarSummaryFields : []),
			...(service === "psp" ? pspSummaryFields : []),
			...readonlyDetailFields,
		].map(field => ({ ...field, label: `${field.label}:` }));

	const content = !service || !record || !config
		? null
		: (
			<Spin spinning={loading} className={embedded ? "performance-detail-inline__spinner" : undefined}>
				<FormProvider {...form}>
					<Card bordered={!embedded} className={embedded ? "performance-detail-inline__card" : undefined}>
						<div className="performance-detail-sections">
							<DetailSection title="اطلاعات پایه">
								<DetailValueRows
									fields={[
										{ key: "service", label: `${t("performance.columns.service")}:`, value: resolveServiceDisplayName(service, mergedDetail.service_name ?? service) },
										{ key: "company", label: `${t("performance.columns.company")}:`, value: selectedCompany },
										...(service === "sms"
											? [{ key: "companyType", label: `${t("performance.columns.companyType")}:`, value: selectedCompanyType ?? "-" }]
											: []),
										{ key: "year", label: `${t("performance.columns.year")}:`, value: mergedDetail.sh_year ?? "-" },
										{ key: "month", label: `${t("performance.columns.month")}:`, value: resolveMonthLabel(mergedDetail.sh_month) },
									]}
								/>
							</DetailSection>

							<DetailSection title="ریز هزینه‌ها و درآمدها">

								{plainBreakdownFields.length > 0
									? <DetailValueRows fields={plainBreakdownFields} />
									: null}

								{service === "traffic" && trafficSummaryCards.length > 0
									? (
										<div
											className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3"
										>
											{trafficSummaryCards.map(card => (
												<DetailMetricCard key={card.key} cardKey={card.key} title={card.title}>
													<ReadOnlyBlock label={`${t("performance.fields.traffic.sentTraffic")}:`} value={card.value} />
													<ReadOnlyBlock label={`${t("performance.fields.traffic.receivedTraffic")}:`} value={card.valueReceive} />
													<ReadOnlyBlock label={`${t("performance.columns.income")}:`} value={card.income} />
													<ReadOnlyBlock label={`${t("performance.columns.expense")}:`} value={card.expense} />
													<ReadOnlyBlock label={`${t("performance.columns.profit")}:`} value={card.profit} />
												</DetailMetricCard>
											))}
										</div>
									)
									: null}

								{!isUnregisteredMode && isSmsLikeService && smsBreakdownCards.length > 0
									? (
										<div
											className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3"
										>
											{smsBreakdownCards.map(card => (
												<DetailMetricCard key={card.key} cardKey={card.key} title={card.title}>
													{service === "sms-commission"
														? (
															<>
																<ReadOnlyBlock label={`${smsCommissionSummaryLabels.value}:`} value={formatNumberLike(card.value)} />
																<ReadOnlyBlock label={`${smsCommissionSummaryLabels.price}:`} value={formatNumberLike(card.price)} />
																<ReadOnlyBlock label={`${smsCommissionSummaryLabels.income}:`} value={formatNumberLike(card.incomeOperator)} />
																<ReadOnlyBlock label={`${smsCommissionSummaryLabels.profit}:`} value={formatNumberLike(card.profit)} />
																<ReadOnlyBlock label={`${smsCommissionSummaryLabels.expense}:`} value={formatNumberLike(card.expenseOperator)} />
																<ReadOnlyBlock label={`${smsCommissionSummaryLabels.incomeTci}:`} value={formatNumberLike(card.incomeTci)} />
																<ReadOnlyBlock label={`${smsCommissionSummaryLabels.incomeFirstSide}:`} value={formatNumberLike(card.incomeFirstSide)} />
																<ReadOnlyBlock label={`${smsCommissionSummaryLabels.incomeArea}:`} value={formatNumberLike(card.incomeArea)} />
																<ReadOnlyBlock label={`${smsCommissionSummaryLabels.incomeSalesAgent}:`} value={formatNumberLike(card.incomeSalesAgent)} />
															</>
														)
														: (
															<>
																<ReadOnlyBlock label={`${t("performance.columns.value")}:`} value={formatNumberLike(card.value)} />
																<ReadOnlyBlock label={`${t("performance.modal.labels.operatorIncome")}:`} value={formatNumberLike(card.incomeOperator)} />
																<ReadOnlyBlock label={`${t("performance.modal.labels.governmentIncome")}:`} value={formatNumberLike(card.incomeGovernment)} />
																<ReadOnlyBlock label={`${t("performance.modal.labels.unitPrice")}:`} value={formatNumberLike(card.price)} />
																<ReadOnlyBlock label={`${t("performance.columns.profit")}:`} value={formatNumberLike(card.profit)} />
																<ReadOnlyBlock label={`${t("performance.modal.labels.operatorExpense")}:`} value={formatNumberLike(card.expenseOperator)} />
																<ReadOnlyBlock label={`${t("performance.modal.labels.governmentExpense")}:`} value={formatNumberLike(card.expenseGovernment)} />
															</>
														)}
												</DetailMetricCard>
											))}
										</div>
									)
									: null}

							</DetailSection>

							<DetailSection title="مقدار عملکرد" tone="success" extra={sectionActions} collapsible={false}>
								{service === "sales-agency/outbound" || service === "sales-agency/rep-management"
									? <SalesAgencyPerformanceFields prefix="" companyType={selectedCompanyType} companyId={normalizedRecord.companyId} serviceId={normalizedRecord.serviceId} year={normalizedRecord.year} month={normalizedRecord.month} editLayout />
									: null}
								{visibleEditableFields.length > 0 && service !== "sales-agency/outbound" && service !== "sales-agency/rep-management"
									? (
										isTrafficEditLayout
											? (
												<div className="grid gap-3">
													{visibleTrafficLocations.has("TEHRAN") && (
														<div className="performance-traffic-edit-location">
															<DashedBorder />
															<div className="performance-traffic-edit-location__header">
																<Tag bordered={false}>عملکرد تهران</Tag>
															</div>
															{isTrafficUnitVisible && trafficContractUnits.tehran && (
																<div className="performance-traffic-edit-location__unit mb-3 px-4 py-2 text-right text-sm">
																	{t("performance.traffic.tehranContractUnit")}
																	{": "}
																	<strong>{trafficContractUnits.tehran}</strong>
																</div>
															)}
															<div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
																{visibleEditableFields
																	.filter(f => getTrafficFieldLocation(f.key) === "TEHRAN")
																	.map(field => (
																		<RHFProNumber<EditFormValues, any>
																			key={field.key}
																			name={field.key as any}
																			label={field.label}
																			inputProps={field.key.includes("ConversionRatio")
																				? { placeholder: "مثلاً 1.5" } as any
																				: { placeholder: t("performance.modal.placeholders.enterNumber") } as any}
																			decimal={field.key.includes("ConversionRatio")}
																			enableGrouping={!field.key.includes("ConversionRatio")}
																			enableWordsTooltip={!field.key.includes("ConversionRatio")}
																		/>
																	))}
															</div>
														</div>
													)}
													{visibleTrafficLocations.has("COUNTY") && (
														<div className="performance-traffic-edit-location">
															<DashedBorder />
															<div className="performance-traffic-edit-location__header">
																<Tag bordered={false}>عملکرد مراکز استان</Tag>
															</div>
															{isTrafficUnitVisible && trafficContractUnits.county && (
																<div className="performance-traffic-edit-location__unit mb-3 px-4 py-2 text-right text-sm">
																	{t("performance.traffic.countyContractUnit")}
																	{": "}
																	<strong>{trafficContractUnits.county}</strong>
																</div>
															)}
															<div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
																{visibleEditableFields
																	.filter(f => getTrafficFieldLocation(f.key) === "COUNTY")
																	.map(field => (
																		<RHFProNumber<EditFormValues, any>
																			key={field.key}
																			name={field.key as any}
																			label={field.label}
																			inputProps={field.key.includes("ConversionRatio")
																				? { placeholder: "مثلاً 1.5" } as any
																				: { placeholder: t("performance.modal.placeholders.enterNumber") } as any}
																			decimal={field.key.includes("ConversionRatio")}
																			enableGrouping={!field.key.includes("ConversionRatio")}
																			enableWordsTooltip={!field.key.includes("ConversionRatio")}
																		/>
																	))}
															</div>
														</div>
													)}
												</div>
											)
											: isPspEditLayout
												? (
													<div style={pspAlignedLabelStyle}>
														<div className="aligned-form-grid aligned-form-grid--two gap-3">
															<AlignedFormField label={t("performance.fields.psp.performanceValue")}>
																<RHFProNumber<EditFormValues, any>
																	name={"value" as any}
																	label=""
																	formItemProps={{ className: "mb-0" }}
																	inputProps={{ placeholder: t("performance.modal.placeholders.enterNumber"), inputMode: "numeric" } as any}
																	enableGrouping
																	enableWordsTooltip
																/>
															</AlignedFormField>

															<AlignedFormField label={t("performance.fields.psp.monthlyRevenue")}>
																<RHFProNumber<EditFormValues, any>
																	name={"income" as any}
																	label=""
																	formItemProps={{ className: "contract-type-currency-field mb-0" }}
																	inputProps={{ placeholder: t("performance.modal.placeholders.enterNumber"), inputMode: "numeric", addonAfter: t("performance.columns.rial") } as any}
																	enableGrouping
																	enableWordsTooltip
																/>
															</AlignedFormField>
														</div>
													</div>
												)
												: isOpenApiPackageEditLayout || isSmsEditAlignedLayout
													? (
														<div style={isOpenApiPackageEditLayout ? openApiPackageAlignedLabelStyle : undefined}>
															<div
																className={`aligned-form-grid aligned-form-grid--two gap-3${isSmsEditAlignedLayout ? " performance-detail-sms-grid" : ""}`}
															>
																{visibleEditableFields.map((field) => {
																	const smsAddon = getSmsPerformanceFieldAddon(field.key);
																	const isCurrencyField = field.key === "traffic_income" || field.key === "trafficRevenue";
																	const addonAfter = isSmsEditAlignedLayout
																		? undefined
																		: (isCurrencyField ? t("performance.columns.rial") : undefined);
																	const alignedLabel = smsAddon
																		? `${t("performance.labels.performanceValue")} ${smsAddon}`
																		: field.label;

																	if (isSmsEditAlignedLayout) {
																		return (
																			<RHFProNumber<EditFormValues, any>
																				key={field.key}
																				name={field.key as any}
																				label={alignedLabel}
																				formItemProps={{ className: "mb-0" }}
																				inputProps={{
																					placeholder: t("performance.modal.placeholders.enterNumber"),
																					inputMode: "numeric",
																				} as any}
																				enableGrouping
																				enableWordsTooltip
																			/>
																		);
																	}

																	return (
																		<AlignedFormField key={field.key} label={alignedLabel}>
																			<RHFProNumber<EditFormValues, any>
																				name={field.key as any}
																				label=""
																				formItemProps={{ className: isCurrencyField ? "contract-type-currency-field mb-0" : "mb-0" }}
																				inputProps={{
																					placeholder: t("performance.modal.placeholders.enterNumber"),
																					inputMode: "numeric",
																					...(addonAfter ? { addonAfter } : {}),
																				} as any}
																				enableGrouping
																				enableWordsTooltip
																			/>
																		</AlignedFormField>
																	);
																})}
															</div>
														</div>
													)
													: (
														<div
															className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3"
														>
															{visibleEditableFields.map((field) => {
																if (field.type === "number") {
																	return (
																		<RHFProNumber<EditFormValues, any>
																			key={field.key}
																			name={field.key as any}
																			label={field.label}
																			inputProps={{ placeholder: t("performance.modal.placeholders.enterNumber"), inputMode: "numeric" } as any}
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
																		inputProps={{ placeholder: t("performance.modal.placeholders.enterValue") }}
																	/>
																);
															})}
														</div>
													))
									: null}
							</DetailSection>
						</div>
					</Card>
					<div
						className="flex justify-end mt-2 gap-2"
					>
						{!embedded ? <Button onClick={onClose}>{t("common.cancel")}</Button> : null}
						{visibleEditableFields.length > 0 && hasMeaningfulChanges && !embedded
							? <Button type="primary" onClick={() => void handleSubmit()}>{t("performance.actions.editPerformance")}</Button>
							: null}
					</div>
				</FormProvider>
			</Spin>
		);

	if (embedded) {
		return (
			<section className="performance-detail-inline" aria-label={config?.title ?? t("performance.modal.editPerformance")}>
				{content}
			</section>
		);
	}

	return (
		<Modal
			open={open}
			title={isUnregisteredMode ? t("performance.modal.registerPerformance") : (config?.title ?? t("performance.modal.editPerformance"))}
			onCancel={onClose}
			footer={null}
			width={920}
			destroyOnHidden
		>
			{content}
		</Modal>
	);
}
