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
import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

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

const SERVICE_EDIT_CONFIG: Record<PerformanceServicePath, ServiceEditConfig> = {
	"openapi": {
		title: "ویرایش عملکرد OpenAPI",
		readonlyKeys: [],
		editableFields: [
			{ key: "bill_inquiry_value", label: "\u0645\u0642\u062F\u0627\u0631 \u0639\u0645\u0644\u06A9\u0631\u062F \u0627\u0633\u062A\u0639\u0644\u0627\u0645 \u0642\u0628\u0636", type: "number", required: true },
			{ key: "receipt_register_value", label: "\u0645\u0642\u062F\u0627\u0631 \u0639\u0645\u0644\u06A9\u0631\u062F \u062B\u0628\u062A \u0648\u0635\u0648\u0644\u06CC", type: "number", required: true },
		],
		payloadKeys: ["bill_inquiry_value", "receipt_register_value"],
	},
	"psp": {
		title: "ویرایش عملکرد PSP",
		readonlyKeys: [],
		editableFields: [
			{ key: "value", label: "مقدار عملکرد", type: "number", required: true },
			{ key: "income", label: "درآمد این ماه", type: "number" },
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
			{ key: "irancellFa", label: "مقدار عملکرد ایرانسل - فارسی", type: "number", required: true },
			{ key: "irancellEn", label: "مقدار عملکرد ایرانسل - انگلیسی", type: "number", required: true },
			{ key: "mciFa", label: "مقدار عملکرد همراه اول - فارسی", type: "number", required: true },
			{ key: "mciEn", label: "مقدار عملکرد همراه اول - انگلیسی", type: "number", required: true },
			{ key: "otherFa", label: "مقدار عملکرد سایر - فارسی", type: "number", required: true },
			{ key: "otherEn", label: "مقدار عملکرد سایر - انگلیسی", type: "number", required: true },
		],
		payloadKeys: ["irancellFa", "irancellEn", "mciFa", "mciEn", "otherFa", "otherEn"],
	},
	"sms-commission": {
		title: "ویرایش عملکرد پیامک عاملیت",
		readonlyKeys: ["sales_agent", "operator", "language"],
		editableFields: [
			{ key: "irancellFa", label: "مقدار عملکرد ایرانسل - فارسی", type: "number", required: true },
			{ key: "irancellEn", label: "مقدار عملکرد ایرانسل - انگلیسی", type: "number", required: true },
			{ key: "mciFa", label: "مقدار عملکرد همراه اول - فارسی", type: "number", required: true },
			{ key: "mciEn", label: "مقدار عملکرد همراه اول - انگلیسی", type: "number", required: true },
			{ key: "otherFa", label: "مقدار عملکرد سایر - فارسی", type: "number", required: true },
			{ key: "otherEn", label: "مقدار عملکرد سایر - انگلیسی", type: "number", required: true },
		],
		payloadKeys: ["sales_agent", "operator", "language", "irancellFa", "irancellEn", "mciFa", "mciEn", "otherFa", "otherEn"],
	},
	"traffic": {
		title: "ویرایش عملکرد ترافیک",
		readonlyKeys: ["location", "company_type"],
		editableFields: [
			{ key: "value", label: "مقدار عملکرد", type: "number", required: true },
			{ key: "value_receive", label: "مقدار دریافتی", type: "number" },
			{ key: "income", label: "درآمد", type: "number" },
			{ key: "expense", label: "هزینه", type: "number" },
			{ key: "profit", label: "سود", type: "number" },
		],
		payloadKeys: ["location", "company_type", "value", "value_receive", "income", "expense", "profit"],
	},
	"commercial": {
		title: "ویرایش عملکرد تجاری",
		readonlyKeys: ["customer_name", "customer_nic", "province_code", "service_type"],
		editableFields: [
			{ key: "value", label: "مقدار عملکرد", type: "number", required: true },
			{ key: "income", label: "درآمد", type: "number" },
			{ key: "expense", label: "هزینه", type: "number" },
			{ key: "profit", label: "سود", type: "number" },
		],
		payloadKeys: ["customer_name", "customer_nic", "province_code", "service_type", "value", "income", "expense", "profit"],
	},
};

const FIELD_LABELS: Record<string, string> = {
	service_name: "سرویس",
	company_name: "شرکت",
	sh_year: "سال",
	sh_month: "ماه",
	value: "مقدار عملکرد",
	value_receive: "مقدار عملکرد دریافتی",
	income: "درآمد این ماه",
	expense: "هزینه این ماه",
	profit: "سود این ماه",
	bill_inquiry_value: "مقدار عملکرد استعلام قبض",
	receipt_register_value: "مقدار عملکرد ثبت وصولی",
	traffic_income: "درآمد ترافیک",
	traffic_package_count: "تعداد بسته ترافیک",
	sms_mci_fa: "مقدار عملکرد همراه اول - فارسی",
	sms_mci_en: "مقدار عملکرد همراه اول - انگلیسی",
	sms_irancell_fa: "مقدار عملکرد ایرانسل - فارسی",
	sms_irancell_en: "مقدار عملکرد ایرانسل - انگلیسی",
	sms_other_fa: "مقدار عملکرد سایر - فارسی",
	sms_other_en: "مقدار عملکرد سایر - انگلیسی",
	operation_type: "نوع عملیات",
	operator: "اپراتور",
	language: "زبان",
	sales_agent: "نماینده فروش",
	sales_agent_name: "نام نماینده فروش",
	location: "لوکیشن",
	company_type: "نوع شرکت",
	is_official: "رسمی",
	customer_name: "نام مشتری",
	customer_nic: "کد ملی مشتری",
	province_code: "کد استان",
	service_type: "نوع سرویس تجاری",
	items: "آیتم‌های پیامک",
};

const SERVICE_DETAIL_KEYS: Record<PerformanceServicePath, string[]> = {
	"openapi": ["value", "income", "expense", "profit", "traffic_income", "traffic_package_count"],
	"psp": ["value", "income", "expense", "profit"],
	"shahkar": ["value", "income", "expense", "profit"],
	"sms": [],
	"sms-commission": [],
	"traffic": ["location", "company_type", "is_official", "value", "value_receive", "income", "expense", "profit"],
	"commercial": ["customer_name", "customer_nic", "province_code", "service_type", "value", "income", "expense", "profit"],
};

const OPERATION_TYPE_LABELS: Record<string, string> = {
	BILL_INQUIRY: "استعلام قبض",
	RECEIPT_REGISTER: "ثبت وصولی",
	TRAFFIC_REVENUE: "درآمد ترافیک",
	TRAFFIC_PACKAGE_COUNT: "تعداد بسته ترافیک",
	IRANCELL_FA: "ایرانسل - فارسی",
	IRANCELL_EN: "ایرانسل - انگلیسی",
	MCI_FA: "همراه اول - فارسی",
	MCI_EN: "همراه اول - انگلیسی",
	OTHER_FA: "سایر - فارسی",
	OTHER_EN: "سایر - انگلیسی",
};

const HIDDEN_DETAIL_KEYS = new Set([
	"id",
	"company",
	"company_id",
	"service",
	"service_id",
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

function formatDetailValue(key: string, value: unknown) {
	if (!isVisibleDetailValue(value))
		return "-";

	if (key === "operation_type") {
		const raw = String(value);
		return OPERATION_TYPE_LABELS[raw] ?? raw;
	}
	if (key === "language") {
		if (value === "FA")
			return "فارسی";
		if (value === "EN")
			return "انگلیسی";
	}
	if (key === "operator") {
		if (value === "IRANCELL")
			return "ایرانسل";
		if (value === "MCI")
			return "همراه اول";
		if (value === "OTHER")
			return "سایر";
	}
	if (key === "is_official")
		return value ? "بله" : "خیر";
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

function toUpperText(value: unknown) {
	return String(value ?? "").trim().toUpperCase();
}

function getTierRate(record: any) {
	const first = Array.isArray(record?.tiers) ? record.tiers[0] : null;
	return first?.rate_per_unit ?? null;
}

function getOperatorLabel(operator: string) {
	if (operator === "IRANCELL")
		return "ایرانسل";
	if (operator === "MCI")
		return "همراه اول";
	if (operator === "OTHER")
		return "سایر";
	return operator || "-";
}

function getLanguageLabel(language: string) {
	if (language === "FA")
		return "فارسی";
	if (language === "EN")
		return "انگلیسی";
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
	service: PerformanceServicePath,
	detail: Record<string, unknown>,
	recordFallback: Record<string, unknown>,
): EditFormValues {
	const config = SERVICE_EDIT_CONFIG[service];
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
	const isUnregisteredMode = mode === "unregistered";
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
	const [smsContract, setSmsContract] = useState<Record<string, unknown> | null>(null);
	const [smsPerformances, setSmsPerformances] = useState<PerformanceListItem[]>([]);

	const normalizedRecord = useMemo(
		() => normalizePerformanceRecord(record ?? {}),
		[record],
	);
	const config = useMemo(() => (service ? SERVICE_EDIT_CONFIG[service] : null), [service]);
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
						label: FIELD_LABELS[key] ?? key,
						value: formatDetailValue(key, value),
					};
				});
		}

		if (service === "sms" || service === "sms-commission")
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
				label: FIELD_LABELS[key] ?? key,
				value: formatDetailValue(key, value),
			});
		};

		[...config.readonlyKeys, ...(SERVICE_DETAIL_KEYS[service] ?? [])].forEach(pushField);
		if (service === "openapi")
			return result;
		Object.keys(mergedDetail).forEach((key) => {
			const value = mergedDetail[key];
			if (typeof value === "object" && key !== "items")
				return;
			pushField(key);
		});

		return result;
	}, [service, config, mergedDetail, isUnregisteredMode, record]);

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
				title: `${getOperatorLabel(operator)} - ${getLanguageLabel(language)}`,
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
				title: `${getOperatorLabel(operator)} - ${getLanguageLabel(language)}`,
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
				title: `${getOperatorLabel(operator)} - ${getLanguageLabel(language)}`,
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
	}, [isSmsService, mergedDetail.items, smsContract, smsPerformances]);

	const form = useForm<EditFormValues>({
		defaultValues: {},
		mode: "all",
		shouldUnregister: true,
	});

	useEffect(() => {
		if (!open || !service || !record)
			return;

		if (isUnregisteredMode) {
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
		if (!open || service !== "sms" || isUnregisteredMode) {
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
				const response = await fetchPerformanceList("sms", {
					page: 1,
					page_size: 250,
					service: serviceId,
					company: companyId,
					sh_year: year,
					sh_month: month,
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
	}, [open, service, normalizedRecord.companyId, normalizedRecord.serviceId, normalizedRecord.year, normalizedRecord.month, isUnregisteredMode]);

	useEffect(() => {
		if (!service || !record || !detail)
			return;

		const initialValues = buildInitialValues(service, detail, record as Record<string, unknown>);
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
	}, [service, record, detail, form, smsBreakdownCards, isUnregisteredMode]);

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
				message: "این فیلد الزامی است",
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
			window.$message?.error("اطلاعات پایه عملکرد ناقص است");
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
					window.$message?.error("شناسه نماینده فروش نامعتبر است");
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

			window.$message?.success(isUnregisteredMode ? "Performance registered successfully" : "Performance updated successfully");
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
			title={isUnregisteredMode ? "Register Performance" : (config?.title ?? "Edit Performance")}
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
										<ReadOnlyBlock label="سرویس:" value={mergedDetail.service_name ?? service ?? "-"} />
										<ReadOnlyBlock label="شرکت:" value={selectedCompany} />
										<ReadOnlyBlock label="سال:" value={mergedDetail.sh_year ?? "-"} />
										<ReadOnlyBlock label="ماه:" value={resolveMonthLabel(mergedDetail.sh_month)} />
									</div>

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
														<ReadOnlyBlock label="مقدار عملکرد:" value={formatNumberLike(card.value)} />
														<ReadOnlyBlock label="درآمد اپراتور:" value={formatNumberLike(card.incomeOperator)} />
														<ReadOnlyBlock label="درآمد دولت:" value={formatNumberLike(card.incomeGovernment)} />
														<ReadOnlyBlock label="قیمت واحد:" value={formatNumberLike(card.price)} />
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
																inputProps={{ placeholder: "عدد وارد کنید", inputMode: "numeric" } as any}
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
											ذخیره تغییرات
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
