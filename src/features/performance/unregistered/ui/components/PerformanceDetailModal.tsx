import type { CompanyDto } from "#src/api/common/common.types.js";
import type { PerformanceServicePath } from "#src/features/performance/api/performances.api";
import type { PerformanceListRow } from "../../model/performance.list.types";
import { MONTH_OPTIONS } from "#src/features/contract/constant/jalali-date-options.js";
import {
	fetchPerformanceDetail,
	updatePerformanceById,
	updateSmsCommissionPerformanceByComposite,
	upsertPerformance,
} from "#src/features/performance/api/performances.api";
import {
	normalizePerformanceRecord,
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

const SERVICE_EDIT_CONFIG: Record<PerformanceServicePath, ServiceEditConfig> = {
	"openapi": {
		title: "ایجاد عملکرد OpenAPI",
		readonlyKeys: [],
		editableFields: [
			{ key: "value", label: "مقدار عملکرد", type: "number", required: true },
			{ key: "profit", label: "سود/درآمد این ماه", type: "number" },
		],
		payloadKeys: ["value", "profit"],
	},
	"psp": {
		title: "ایجاد عملکرد PSP",
		readonlyKeys: [],
		editableFields: [
			{ key: "value", label: "مقدار عملکرد", type: "number", required: true },
			{ key: "income", label: "درآمد این ماه", type: "number" },
		],
		payloadKeys: ["value", "income"],
	},
	"shahkar": {
		title: "ایجاد عملکرد شاهکار",
		readonlyKeys: [],
		editableFields: [
			{ key: "value", label: "مقدار عملکرد", type: "number", required: true },
		],
		payloadKeys: ["value"],
	},
	"sms": {
		title: "ایجاد عملکرد پیامک",
		readonlyKeys: [],
		editableFields: [
			{ key: "value", label: "مقدار عملکرد", type: "number", required: true },
		],
		payloadKeys: ["value"],
	},
	"sms-commission": {
		title: "ایجاد عملکرد پیامک عاملیت",
		readonlyKeys: ["sales_agent", "operator", "language"],
		editableFields: [
			{ key: "value", label: "مقدار عملکرد", type: "number", required: true },
		],
		payloadKeys: ["sales_agent", "operator", "language", "value"],
	},
	"traffic": {
		title: "ایجاد عملکرد ترافیک",
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
		title: "ایجاد عملکرد تجاری",
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

interface Props {
	open: boolean
	service: PerformanceServicePath | null
	companies: CompanyDto[] | undefined
	record: PerformanceListRow | null
	onClose: () => void
	onUpdated?: () => void
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
	if (service === "sms-commission" && values.sales_agent == null) {
		values.sales_agent = recordFallback.sales_agent ?? recordFallback.sales_agent_id ?? null;
	}

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
}: Props) {
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
	const [selectedCompany, setSelectedCompany] = useState("");
	const normalizedRecord = useMemo(
		() => normalizePerformanceRecord(record ?? {}),
		[record],
	);
	const config = useMemo(() => (service ? SERVICE_EDIT_CONFIG[service] : null), [service]);

	const form = useForm<EditFormValues>({
		defaultValues: {},
		mode: "all",
		shouldUnregister: true,
	});
	useEffect(() => {
		const findCompany = companies?.find(r => r.id === record?.company_id)?.name;
		if (findCompany) {
			// eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
			setSelectedCompany(findCompany);
		}
	}, [companies, record]);
	useEffect(() => {
		if (!open || !service || !record)
			return;

		let cancelled = false;
		// eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
		setLoading(true);

		(async () => {
			try {
				if (normalizedRecord.id != null && service !== "sms-commission") {
					const response = await fetchPerformanceDetail(service, normalizedRecord.id);
					if (!cancelled) {
						setDetail(response);
					}
					return;
				}

				if (!cancelled) {
					setDetail(record as Record<string, unknown>);
				}
			}
			catch {
				if (!cancelled) {
					setDetail(record as Record<string, unknown>);
				}
			}
			finally {
				if (!cancelled)
					setLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [open, service, record, normalizedRecord.id]);
	useEffect(() => {
		if (!service || !record || !detail)
			return;

		const initialValues = buildInitialValues(
			service,
			detail,
			record as Record<string, unknown>,
		);
		form.reset(initialValues);
	}, [service, record, detail, form]);

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

		setSaving(true);
		try {
			if (service === "sms-commission") {
				if (salesAgentId == null) {
					window.$message?.error("شناسه نماینده فروش نامعتبر است");
					return;
				}

				await updateSmsCommissionPerformanceByComposite(
					companyId,
					salesAgentId,
					year,
					month,
					payload,
				);
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

			window.$message?.success("عملکرد با موفقیت ایجاد شد");
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
			title={config?.title ?? "ایجاد عملکرد"}
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
										{/* <ReadOnlyBlock label="سرویس:" value={(record as any).service_name ?? "-"} /> */}
										<ReadOnlyBlock label="سرویس:" value={service ?? "-"} />
										<ReadOnlyBlock label="شرکت:" value={selectedCompany} />
										<ReadOnlyBlock label="سال:" value={(record as any).sh_year ?? "-"} />
										<ReadOnlyBlock label="ماه:" value={MONTH_OPTIONS[(record as any).sh_month - 1].label} />
									</div>

									{config.readonlyKeys.length > 0
										? (
											<div
												style={{
													display: "grid",
													gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
													gap: 8,
												}}
											>
												{config.readonlyKeys.map(key => (
													<ReadOnlyBlock
														key={key}
														label={`${key}:`}
														value={form.getValues(key)}
													/>
												))}
											</div>
										)
										: null}

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
								<Button type="primary" loading={saving} onClick={() => void handleSubmit()}>
									ثبت
								</Button>
							</div>
						</FormProvider>
					</Spin>
				)}
		</Modal>
	);
}
