import type { ServiceDto } from "#src/api/common/common.types";
import type { AdminRoleDto } from "#src/features/audit/admin-roles/model/admin-roles.types";
import type { AdminUserDto } from "#src/features/audit/admin-users/model/admin-users.types";
import type {
	NotificationRecipientTargetType,
	NotificationRuleCode,
	NotificationRuleDto,
	NotificationRulePayloadTemplate,
	NotificationRuleUpsertPayload,
} from "../../model/notification-rules.types";
import { BasicButton } from "#src/components";
import { Button, Checkbox, Form, Input, Modal, Segmented, Select, Space, Switch, Typography } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	defaultInAppPayloadTemplate,
	defaultNotificationRuleDays,
	formatAdminRoleName,
	formatAdminUserName,
	normalizeRulePayloadTemplate,
	notificationRuleCodeOptions,
	notificationRuleTargetTypeLabels,
	parseDaysBeforeEnd,
	parsePayloadJson,
	resolveRuleChannel,
	safeJsonStringify,
	stringifyDaysBeforeEnd,
} from "../../model/notification-rules.utils";

interface RecipientFormValue {
	target_type: NotificationRecipientTargetType
	target_id?: number
}

interface PayloadFormValue {
	ui_category?: string
	ui_icon?: string
	ui_severity?: string
	message_title_fa?: string
	message_body_fa?: string
	action_type?: string
	action_label?: string
	action_url?: string
	json?: string
}

interface NotificationRuleFormValues {
	name: string
	code: NotificationRuleCode
	is_active: boolean
	service_names: string[]
	days_before_end: string
	payload_template: PayloadFormValue
	recipients: RecipientFormValue[]
}

type PayloadMode = "simple" | "json";

interface Props {
	open: boolean
	mode: "create" | "edit"
	initial?: NotificationRuleDto | null
	services: ServiceDto[]
	users: AdminUserDto[]
	roles: AdminRoleDto[]
	loadingOptions?: boolean
	onClose: () => void
	onSubmit: (values: NotificationRuleUpsertPayload) => Promise<void> | void
}

function getNestedString(source: NotificationRulePayloadTemplate, path: string[], fallback = ""): string {
	let current: unknown = source;
	for (const key of path) {
		if (!current || typeof current !== "object" || Array.isArray(current)) {
			return fallback;
		}
		current = (current as Record<string, unknown>)[key];
	}

	return typeof current === "string" ? current : fallback;
}

function getFirstActionString(source: NotificationRulePayloadTemplate, key: string, fallback = ""): string {
	const actions = source.actions;
	if (!Array.isArray(actions) || !actions[0] || typeof actions[0] !== "object") {
		return fallback;
	}

	const value = (actions[0] as Record<string, unknown>)[key];
	return typeof value === "string" ? value : fallback;
}

function buildPayloadFormValue(code: NotificationRuleCode, payload?: NotificationRulePayloadTemplate): PayloadFormValue {
	const normalized = normalizeRulePayloadTemplate(code, payload);

	if (code === "CONTRACT_EXPIRY_SMS") {
		return {
			json: safeJsonStringify(normalized),
		};
	}

	return {
		ui_category: getNestedString(normalized, ["ui", "category"], "contracts"),
		ui_icon: getNestedString(normalized, ["ui", "icon"], "contract-expiry"),
		ui_severity: getNestedString(normalized, ["ui", "severity"], "warning"),
		message_title_fa: getNestedString(normalized, ["message", "title_fa"], "هشدار پایان قرارداد"),
		message_body_fa: getNestedString(normalized, ["message", "body_fa"], "قرارداد برخی شرکت‌ها رو به اتمام است."),
		action_type: getFirstActionString(normalized, "type", "link"),
		action_label: getFirstActionString(normalized, "label", "مشاهده قراردادها"),
		action_url: getFirstActionString(normalized, "url", "/contracts/list"),
		json: safeJsonStringify(normalized),
	};
}

function buildDefaultValues(initial?: NotificationRuleDto | null): NotificationRuleFormValues {
	const code = (initial?.code === "CONTRACT_EXPIRY_SMS" ? "CONTRACT_EXPIRY_SMS" : "CONTRACT_EXPIRY") satisfies NotificationRuleCode;

	return {
		name: initial?.name ?? "",
		code,
		is_active: initial?.is_active ?? true,
		service_names: initial?.service_names ?? [],
		days_before_end: stringifyDaysBeforeEnd(initial?.days_before_end?.length ? initial.days_before_end : defaultNotificationRuleDays),
		payload_template: buildPayloadFormValue(code, initial?.payload_template),
		recipients: initial?.recipients?.map(recipient => ({
			target_type: recipient.target_type,
			target_id: recipient.target_type === "USER" ? recipient.user_id ?? undefined : recipient.role_id ?? undefined,
		})) ?? [{ target_type: "USER" }],
	};
}

function buildInAppPayload(payload: PayloadFormValue): NotificationRulePayloadTemplate {
	return {
		ui: {
			category: payload.ui_category || "contracts",
			icon: payload.ui_icon || "contract-expiry",
			severity: payload.ui_severity || "warning",
		},
		message: {
			title_fa: payload.message_title_fa || "",
			body_fa: payload.message_body_fa || "",
		},
		actions: [
			{
				type: payload.action_type || "link",
				label: payload.action_label || "",
				url: payload.action_url || "",
			},
		],
	};
}

function toRulePayload(values: NotificationRuleFormValues, payloadMode: PayloadMode): NotificationRuleUpsertPayload {
	const channel = resolveRuleChannel(values.code);
	const days = parseDaysBeforeEnd(values.days_before_end);
	if (!days.length) {
		throw new Error("حداقل یک مقدار معتبر برای days_before_end وارد کنید.");
	}

	const recipients = values.recipients
		.filter(recipient => recipient.target_id)
		.map(recipient => ({
			target_type: recipient.target_type,
			user_id: recipient.target_type === "USER" ? recipient.target_id ?? null : null,
			role_id: recipient.target_type === "ROLE" ? recipient.target_id ?? null : null,
		}));

	if (!recipients.length) {
		throw new Error("حداقل یک گیرنده انتخاب کنید.");
	}

	return {
		code: values.code,
		name: values.name.trim(),
		is_active: values.is_active,
		service_names: values.service_names ?? [],
		days_before_end: days,
		channels: [channel],
		payload_template: values.code === "CONTRACT_EXPIRY_SMS" || payloadMode === "json"
			? parsePayloadJson(values.payload_template?.json ?? "{}")
			: buildInAppPayload(values.payload_template ?? {}),
		recipients,
	};
}

export function NotificationRuleUpsertModal({
	open,
	mode,
	initial,
	services,
	users,
	roles,
	loadingOptions,
	onClose,
	onSubmit,
}: Props) {
	const [form] = Form.useForm<NotificationRuleFormValues>();
	const [saving, setSaving] = useState(false);
	const [payloadMode, setPayloadMode] = useState<PayloadMode>("simple");
	const [isDirty, setIsDirty] = useState(false);
	const initialValuesRef = useRef<NotificationRuleFormValues | null>(null);

	const defaultValues = useMemo(() => buildDefaultValues(initial), [initial]);
	const selectedCode = Form.useWatch("code", form) ?? defaultValues.code;
	const selectedChannel = resolveRuleChannel(selectedCode);
	const isSmsRule = selectedCode === "CONTRACT_EXPIRY_SMS";

	const serviceOptions = useMemo(
		() => services.map(service => ({ label: service.name, value: service.name })),
		[services],
	);
	const userOptions = useMemo(
		() => users.map(user => ({ label: `${formatAdminUserName(user)} (${user.username})`, value: user.id })),
		[users],
	);
	const roleOptions = useMemo(
		() => roles.map(role => ({ label: formatAdminRoleName(role), value: role.id })),
		[roles],
	);

	useEffect(() => {
		if (!open) {
			return;
		}

		form.setFieldsValue(defaultValues);
		initialValuesRef.current = defaultValues;
		setIsDirty(false);
		setPayloadMode(defaultValues.code === "CONTRACT_EXPIRY_SMS" ? "json" : "simple");
	}, [defaultValues, form, open]);

	const handleValuesChange = () => {
		const currentValues = form.getFieldsValue();
		const initialValues = initialValuesRef.current;
		if (!initialValues)
			return;
		const changed = JSON.stringify(currentValues) !== JSON.stringify(initialValues);
		setIsDirty(changed);
	};

	function handleCodeChange(code: NotificationRuleCode) {
		form.setFieldValue("payload_template", buildPayloadFormValue(code, code === "CONTRACT_EXPIRY" ? defaultInAppPayloadTemplate : {}));
		setPayloadMode(code === "CONTRACT_EXPIRY_SMS" ? "json" : "simple");
		handleValuesChange();
	}

	function handlePayloadModeChange(nextMode: PayloadMode) {
		const currentPayload = form.getFieldValue("payload_template") ?? {};

		if (nextMode === "json") {
			form.setFieldValue(["payload_template", "json"], safeJsonStringify(buildInAppPayload(currentPayload)));
			setPayloadMode("json");
			handleValuesChange();
			return;
		}

		try {
			const parsedPayload = parsePayloadJson(currentPayload.json ?? "{}");
			form.setFieldValue("payload_template", buildPayloadFormValue("CONTRACT_EXPIRY", parsedPayload));
			setPayloadMode("simple");
			handleValuesChange();
		}
		catch {
			window.$message?.error("JSON وارد شده معتبر نیست.");
		}
	}

	async function handleFinish(values: NotificationRuleFormValues) {
		setSaving(true);
		try {
			await onSubmit(toRulePayload(values, payloadMode));
			onClose();
		}
		catch (error) {
			const message = error instanceof Error ? error.message : "ثبت Rule با خطا مواجه شد.";
			window.$message?.error(message);
		}
		finally {
			setSaving(false);
		}
	}

	const title = mode === "create" ? "ایجاد Rule نوتیفیکیشن" : "ویرایش Rule نوتیفیکیشن";
	const disabled = saving || !isDirty;

	return (
		<Modal
			open={open}
			onCancel={onClose}
			title={title}
			footer={null}
			width={980}
			destroyOnClose
		>
			<Form<NotificationRuleFormValues>
				form={form}
				layout="vertical"
				onFinish={handleFinish}
				initialValues={defaultValues}
				onValuesChange={handleValuesChange}
			>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Form.Item
						name="name"
						label="نام"
						rules={[{ required: true, message: "نام Rule را وارد کنید." }]}
					>
						<Input placeholder="مثلاً هشدار پایان قرارداد ترافیک" />
					</Form.Item>

					<Form.Item
						name="code"
						label="کد"
						rules={[{ required: true }]}
					>
						<Select
							options={notificationRuleCodeOptions}
							onChange={handleCodeChange}
						/>
					</Form.Item>

					<Form.Item label="کانال">
						<Input value={selectedChannel} disabled />
					</Form.Item>

					<Form.Item
						name="days_before_end"
						label="روزهای قبل از پایان"
						tooltip="مقادیر را با کاما جدا کنید. مثال: 30,15,7,3,2,1"
						rules={[{ required: true, message: "روزهای هشدار را وارد کنید." }]}
					>
						<Input dir="ltr" placeholder="30,15,7,3,2,1" />
					</Form.Item>

					<Form.Item
						name="is_active"
						label="وضعیت"
						valuePropName="checked"
					>
						<Switch checkedChildren="فعال" unCheckedChildren="غیرفعال" />
					</Form.Item>

					<Form.Item
						name="service_names"
						label="سرویس‌ها"
						tooltip="اگر خالی بماند، Rule برای همه سرویس‌ها اعمال می‌شود."
					>
						<Select
							mode="multiple"
							allowClear
							loading={loadingOptions}
							options={serviceOptions}
							placeholder="انتخاب سرویس‌ها"
						/>
					</Form.Item>
				</div>

				<section className="mt-2 rounded-lg border border-[var(--ant-color-border-secondary)] p-4">
					<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
						<Typography.Title level={5} className="!mb-0">
							payload_template
						</Typography.Title>
						<Segmented<PayloadMode>
							value={payloadMode}
							disabled={isSmsRule}
							options={[
								{ label: "ساده", value: "simple" },
								{ label: "JSON پیشرفته", value: "json" },
							]}
							onChange={handlePayloadModeChange}
						/>
					</div>

					{selectedCode === "CONTRACT_EXPIRY" && payloadMode === "simple"
						? (
							<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
								<Form.Item name={["payload_template", "ui_category"]} label="ui.category">
									<Input dir="ltr" />
								</Form.Item>
								<Form.Item name={["payload_template", "ui_icon"]} label="ui.icon">
									<Input dir="ltr" />
								</Form.Item>
								<Form.Item name={["payload_template", "ui_severity"]} label="ui.severity">
									<Select
										options={[
											{ label: "warning", value: "warning" },
											{ label: "info", value: "info" },
											{ label: "success", value: "success" },
											{ label: "error", value: "error" },
										]}
									/>
								</Form.Item>
								<Form.Item name={["payload_template", "message_title_fa"]} label="message.title_fa">
									<Input />
								</Form.Item>
								<Form.Item name={["payload_template", "message_body_fa"]} label="message.body_fa" className="md:col-span-2">
									<Input />
								</Form.Item>
								<Form.Item name={["payload_template", "action_type"]} label="actions[0].type">
									<Input dir="ltr" />
								</Form.Item>
								<Form.Item name={["payload_template", "action_label"]} label="actions[0].label">
									<Input />
								</Form.Item>
								<Form.Item name={["payload_template", "action_url"]} label="actions[0].url">
									<Input dir="ltr" />
								</Form.Item>
							</div>
						)
						: (
							<Form.Item name={["payload_template", "json"]} label="JSON">
								<Input.TextArea rows={6} dir="ltr" />
							</Form.Item>
						)}
				</section>

				<section className="mt-4 rounded-lg border border-[var(--ant-color-border-secondary)] p-4">
					<div className="mb-3 flex items-center justify-between gap-3">
						<Typography.Title level={5} className="!mb-0">
							Recipients
						</Typography.Title>
						<Form.List name="recipients">
							{(_, { add }) => (
								<Button onClick={() => add({ target_type: "USER" })}>
									افزودن گیرنده
								</Button>
							)}
						</Form.List>
					</div>

					<Form.List name="recipients">
						{(fields, { remove }) => (
							<div className="flex flex-col gap-3">
								{fields.map(field => (
									<div key={field.key} className="grid grid-cols-1 gap-3 rounded-lg border border-[var(--ant-color-border-secondary)] p-3 md:grid-cols-[180px_1fr_110px]">
										<Form.Item
											{...field}
											name={[field.name, "target_type"]}
											label="نوع"
											rules={[{ required: true }]}
										>
											<Select
												options={[
													{ label: notificationRuleTargetTypeLabels.USER, value: "USER" },
													{ label: notificationRuleTargetTypeLabels.ROLE, value: "ROLE" },
												]}
												onChange={() => {
													form.setFieldValue(["recipients", field.name, "target_id"], undefined);
													handleValuesChange();
												}}
											/>
										</Form.Item>
										<Form.Item shouldUpdate noStyle>
											{({ getFieldValue }) => {
												const targetType = getFieldValue(["recipients", field.name, "target_type"]) as NotificationRecipientTargetType | undefined;
												const options = targetType === "ROLE" ? roleOptions : userOptions;
												return (
													<Form.Item
														{...field}
														name={[field.name, "target_id"]}
														label={targetType === "ROLE" ? "انتخاب نقش" : "انتخاب کاربر"}
														rules={[{ required: true, message: "گیرنده را انتخاب کنید." }]}
													>
														<Select
															showSearch
															loading={loadingOptions}
															options={options}
															optionFilterProp="label"
															placeholder={targetType === "ROLE" ? "نقش" : "کاربر"}
															onChange={() => handleValuesChange()}
														/>
													</Form.Item>
												);
											}}
										</Form.Item>
										<div className="flex items-end pb-6">
											<Button danger block onClick={() => remove(field.name)}>
												حذف
											</Button>
										</div>
									</div>
								))}
							</div>
						)}
					</Form.List>
				</section>

				<div className="mt-5 flex flex-wrap items-center justify-between gap-3">
					<Checkbox
						checked={selectedChannel === "IN_APP"}
						disabled
					>
						برای Ruleهای داخل سامانه، ساختار payload ثابت ارسال می‌شود.
					</Checkbox>
					<Space>
						<BasicButton onClick={onClose} disabled={saving}>
							انصراف
						</BasicButton>
						<BasicButton htmlType="submit" type="primary" loading={saving} disabled={disabled}>
							ذخیره Rule
						</BasicButton>
					</Space>
				</div>
			</Form>
		</Modal>
	);
}
