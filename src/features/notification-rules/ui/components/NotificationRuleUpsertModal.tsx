import type { ServiceDto } from "#src/api/common/common.types";
import type { AdminRoleDto } from "#src/features/audit/admin-roles/model/admin-roles.types";
import type { AdminUserDto } from "#src/features/audit/admin-users/model/admin-users.types";
import type {
	NotificationRecipientTargetType,
	NotificationRuleCode,
	NotificationRuleDto,
	NotificationRuleUpsertPayload,
} from "../../model/notification-rules.types";
import { BasicButton } from "#src/components";
import { Button, Checkbox, Form, Input, Modal, Select, Space, Typography } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	defaultNotificationRuleDays,
	formatAdminRoleName,
	formatAdminUserName,
	getDaysBeforeEndError,
	isMissingPerformanceRule,
	isPendingSinceCreationRule,
	notificationRuleCodeOptions,
	notificationRuleTargetTypeLabels,
	parseDaysBeforeEnd,
	resolveKeptPayloadTemplate,
	resolveRuleChannel,
	stringifyDaysBeforeEnd,
} from "../../model/notification-rules.utils";

interface RecipientFormValue {
	target_type: NotificationRecipientTargetType
	target_id?: number
}

interface NotificationRuleFormValues {
	name: string
	code: NotificationRuleCode
	is_active: boolean
	apply_to_all_users: boolean
	excluded_user_ids: number[]
	service_names: string[]
	days_before_end: string
	recipients: RecipientFormValue[]
}

type ComparableValue = string | number | boolean | null | ComparableValue[] | { [key: string]: ComparableValue };

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

function buildDefaultValues(initial?: NotificationRuleDto | null): NotificationRuleFormValues {
	const code = notificationRuleCodeOptions.some(option => option.value === initial?.code)
		? initial!.code as NotificationRuleCode
		: "CONTRACT_EXPIRY";

	return {
		name: initial?.name ?? "",
		code,
		is_active: initial?.is_active ?? true,
		apply_to_all_users: initial?.apply_to_all_users ?? false,
		excluded_user_ids: initial?.excluded_user_ids ?? [],
		service_names: initial?.service_names ?? [],
		days_before_end: stringifyDaysBeforeEnd(initial?.days_before_end?.length ? initial.days_before_end : defaultNotificationRuleDays),
		recipients: isPendingSinceCreationRule(code) ? [] : initial?.recipients?.map(recipient => ({
			target_type: recipient.target_type,
			target_id: recipient.target_type === "USER" ? recipient.user_id ?? undefined : recipient.role_id ?? undefined,
		})) ?? [{ target_type: "USER" }],
	};
}

function comparableRuleFormValues(values: NotificationRuleFormValues): ComparableValue {
	return {
		code: values.code,
		name: values.name.trim(),
		is_active: values.is_active,
		apply_to_all_users: values.apply_to_all_users,
		excluded_user_ids: [...(values.excluded_user_ids ?? [])].sort((left, right) => left - right),
		service_names: [...(values.service_names ?? [])].map(value => value.trim()).sort(),
		days_before_end: parseDaysBeforeEnd(values.days_before_end ?? "").sort((left, right) => left - right),
		recipients: (values.recipients ?? [])
			.map(recipient => ({
				target_type: recipient.target_type,
				target_id: recipient.target_id ?? null,
			}))
			.sort((left, right) => `${left.target_type}:${left.target_id ?? ""}`.localeCompare(`${right.target_type}:${right.target_id ?? ""}`)),
	};
}

function toRulePayload(values: NotificationRuleFormValues, initial?: NotificationRuleDto | null): NotificationRuleUpsertPayload {
	const channel = resolveRuleChannel(values.code);
	const days = parseDaysBeforeEnd(values.days_before_end);
	const daysError = getDaysBeforeEndError(values.code, days);
	if (daysError) {
		throw new Error(daysError);
	}

	const recipients = (values.recipients ?? [])
		.filter(recipient => recipient.target_id)
		.map(recipient => ({
			target_type: recipient.target_type,
			user_id: recipient.target_type === "USER" ? recipient.target_id ?? null : null,
			role_id: recipient.target_type === "ROLE" ? recipient.target_id ?? null : null,
		}));

	const recipientsIgnored = isPendingSinceCreationRule(values.code);
	if (!recipientsIgnored && !values.apply_to_all_users && !recipients.length) {
		throw new Error("حداقل یک گیرنده انتخاب کنید.");
	}

	return {
		code: values.code,
		name: values.name.trim(),
		is_active: values.is_active,
		apply_to_all_users: values.apply_to_all_users,
		excluded_user_ids: values.apply_to_all_users ? values.excluded_user_ids ?? [] : [],
		service_names: values.service_names ?? [],
		days_before_end: days,
		channels: [channel],
		payload_template: resolveKeptPayloadTemplate(values.code, initial),
		recipients: recipientsIgnored || values.apply_to_all_users ? [] : recipients,
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
	const [isDirty, setIsDirty] = useState(false);
	const initialValuesRef = useRef<NotificationRuleFormValues | null>(null);

	const defaultValues = useMemo(() => buildDefaultValues(initial), [initial]);
	const selectedCode = Form.useWatch("code", form) ?? defaultValues.code;
	const isGlobal = Form.useWatch("apply_to_all_users", form) ?? defaultValues.apply_to_all_users;
	const selectedChannel = resolveRuleChannel(selectedCode);
	const recipientsIgnored = isPendingSinceCreationRule(selectedCode);

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
	}, [defaultValues, form, open]);

	const handleValuesChange = () => {
		const currentValues = form.getFieldsValue(true);
		const initialValues = initialValuesRef.current;
		if (!initialValues)
			return;
		const changed = JSON.stringify(comparableRuleFormValues(currentValues)) !== JSON.stringify(comparableRuleFormValues(initialValues));
		setIsDirty(changed);
	};

	function handleCodeChange(code: NotificationRuleCode) {
		form.setFieldValue("recipients", isPendingSinceCreationRule(code) ? [] : [{ target_type: "USER" }]);
		handleValuesChange();
	}

	async function handleFinish(values: NotificationRuleFormValues) {
		setSaving(true);
		try {
			await onSubmit(toRulePayload(values, initial));
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
			width={900}
			destroyOnHidden
		>
			<Form<NotificationRuleFormValues>
				form={form}
				layout="vertical"
				onFinish={handleFinish}
				initialValues={defaultValues}
				onValuesChange={() => handleValuesChange()}
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
						tooltip={isMissingPerformanceRule(selectedCode) ? "مقادیر را با کاما جدا کنید (فقط 1 تا 30)." : recipientsIgnored ? "تعداد روزهای گذشته از تاریخ ایجاد قرارداد/متمم (اعداد مثبت)." : "مقادیر را با کاما جدا کنید. مثال: 30,15,7,3,2,1"}
						rules={[{ required: true, message: "روزهای هشدار را وارد کنید." }]}
					>
						<Input dir="ltr" placeholder="30,15,7,3,2,1" />
					</Form.Item>

					<div className="flex items-center gap-6 md:col-span-2">
						<Form.Item
							name="is_active"
							valuePropName="checked"
							className="!mb-0"
						>
							<Checkbox>Rule فعال باشد</Checkbox>
						</Form.Item>

						<Form.Item
							name="apply_to_all_users"
							valuePropName="checked"
							className="!mb-0"
						>
							<Checkbox>اعمال برای همه کاربران مجاز (Global)</Checkbox>
						</Form.Item>
					</div>

				</div>

				{isGlobal && (
					<section className="mt-4 rounded-lg border border-[var(--ant-color-border-secondary)] p-4">
						<Form.Item
							name="excluded_user_ids"
							label="کاربران مستثنا (excluded_user_ids)"
							extra="کاربرانی را انتخاب کنید که نباید این نوتیفیکیشن را دریافت کنند."
							className="!mb-0"
						>
							<Select
								mode="multiple"
								allowClear
								showSearch
								loading={loadingOptions}
								options={userOptions}
								optionFilterProp="label"
								placeholder="انتخاب کاربران مستثنا"
								maxTagCount="responsive"
								listHeight={160}
							/>
						</Form.Item>
					</section>
				)}

				<section className="mt-2 rounded-lg border border-[var(--ant-color-border-secondary)] p-4">
					<Form.Item
						name="service_names"
						label="service_names"
						extra="اگر خالی باشد، همه سرویس‌ها در نظر گرفته می‌شوند."
						className="!mb-0"
					>
						<Select
							mode="multiple"
							allowClear
							showSearch
							loading={loadingOptions}
							options={serviceOptions}
							optionFilterProp="label"
							placeholder="انتخاب سرویس‌ها"
							maxTagCount="responsive"
							listHeight={160}
						/>
					</Form.Item>
				</section>

				{recipientsIgnored && (
					<section className="mt-4 rounded-lg border border-dashed border-[var(--ant-color-border-secondary)] p-4">
						<Typography.Text type="secondary">
							برای این Rule، فیلد Recipients تأثیری در ارسال ندارد؛ گیرنده همیشه سازنده (created_by) قرارداد/متمم است.
						</Typography.Text>
					</section>
				)}

				{!isGlobal && !recipientsIgnored && (
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
				)}

				<div className="mt-5 flex flex-wrap items-center justify-between gap-3">
					<Checkbox
						checked={selectedChannel === "IN_APP"}
						disabled
					>
						برای Ruleهای داخل سامانه، متن پیام پیش‌فرض سرور استفاده می‌شود.
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
