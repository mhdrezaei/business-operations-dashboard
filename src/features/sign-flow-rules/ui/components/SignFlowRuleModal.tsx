import type { AdminRoleDto } from "#src/features/audit/admin-roles/model/admin-roles.types";
import type { AdminUserDto } from "#src/features/audit/admin-users/model/admin-users.types";
import type { RecipientTargetType, SignFlowRule, SignFlowRulePayload } from "../../model/sign-flow-rules.types";
import { DeleteOutlined, DownOutlined, PlusOutlined, UpOutlined } from "@ant-design/icons";
import { Button, Form, Input, Modal, Select, Space, Switch, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { createSignFlowRule, updateSignFlowRule } from "../../api/sign-flow-rules.api";

interface RecipientValue { target_type: RecipientTargetType, target_id?: number }
interface StepValue { name: string, recipients: RecipientValue[] }
interface FormValues { name: string, description: string, is_enabled: boolean, steps: StepValue[] }

interface Props {
	open: boolean
	initial: SignFlowRule | null
	users: AdminUserDto[]
	roles: AdminRoleDto[]
	loadingOptions: boolean
	onClose: () => void
	onSaved: () => Promise<void> | void
}

function initialValues(rule: SignFlowRule | null): FormValues {
	return {
		name: rule?.name ?? "",
		description: rule?.description ?? "",
		is_enabled: rule?.is_enabled ?? true,
		steps: rule?.steps.map(step => ({ name: step.name, recipients: step.recipients.map(recipient => ({ target_type: recipient.target_type, target_id: recipient.target_type === "USER" ? recipient.user_id ?? undefined : recipient.role_id ?? undefined })) })) ?? [{ name: "", recipients: [{ target_type: "USER" }] }],
	};
}

export function SignFlowRuleModal({ open, initial, users, roles, loadingOptions, onClose, onSaved }: Props) {
	const [form] = Form.useForm<FormValues>();
	const [saving, setSaving] = useState(false);
	const defaults = useMemo(() => initialValues(initial), [initial]);
	const userOptions = useMemo(() => users.map(user => ({ value: user.id, label: `${user.first_name} ${user.last_name}`.trim() || user.username || `کاربر #${user.id}` })), [users]);
	const roleOptions = useMemo(() => roles.map(role => ({ value: role.id, label: role.name || `نقش #${role.id}` })), [roles]);

	useEffect(() => {
		if (open)
			form.setFieldsValue(defaults);
	}, [defaults, form, open]);

	async function submit(values: FormValues) {
		const payload: SignFlowRulePayload = {
			name: values.name.trim(),
			description: values.description?.trim() ?? "",
			is_enabled: values.is_enabled,
			steps: values.steps.map((step, index) => ({ order: index + 1, name: step.name.trim(), recipients: step.recipients.map(recipient => ({ target_type: recipient.target_type, user_id: recipient.target_type === "USER" ? recipient.target_id ?? null : null, role_id: recipient.target_type === "ROLE" ? recipient.target_id ?? null : null })) })),
		};
		setSaving(true);
		try {
			if (initial)
				await updateSignFlowRule(initial.id, payload);
			else
				await createSignFlowRule(payload);
			window.$message?.success(initial ? "قانون ویرایش شد." : "قانون ایجاد شد.");
			await onSaved();
		}
		finally { setSaving(false); }
	}

	return (
		<Modal open={open} onCancel={onClose} footer={null} destroyOnHidden width={900} title={initial ? "ویرایش قانون گردش امضا" : "قانون گردش امضای جدید"}>
			<div dir="rtl">
				<Form form={form} layout="vertical" initialValues={defaults} onFinish={submit}>
					<div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
						<Form.Item name="name" label="نام قانون" rules={[{ required: true, whitespace: true, message: "نام قانون را وارد کنید." }]}><Input placeholder="مثلاً گردش امضای قرارداد ترافیک" /></Form.Item>
						<Form.Item name="is_enabled" label="وضعیت" valuePropName="checked"><Switch checkedChildren="فعال" unCheckedChildren="غیرفعال" /></Form.Item>
						<Form.Item name="description" label="توضیح" className="md:col-span-2"><Input.TextArea rows={2} placeholder="توضیح اختیاری برای این قانون" /></Form.Item>
					</div>
					<div className="mb-3 flex items-center justify-between">
						<Typography.Title level={5} className="!mb-0">مراحل تأیید</Typography.Title>
						<Form.List name="steps">{(_, { add }) => <Button icon={<PlusOutlined />} onClick={() => add({ name: "", recipients: [{ target_type: "USER" }] })}>افزودن مرحله</Button>}</Form.List>
					</div>
					<Form.List name="steps">
						{(stepFields, { remove, move }) => (
							<div className="flex flex-col gap-3">
								{stepFields.map((step, stepIndex) => (
									<div className="rounded-lg border border-[var(--ant-color-border-secondary)] p-4" key={step.key}>
										<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
											<Typography.Text strong>
												مرحله
												{stepIndex + 1}
											</Typography.Text>
											<Space>
												<Button size="small" icon={<UpOutlined />} disabled={stepIndex === 0} onClick={() => move(stepIndex, stepIndex - 1)} />
												<Button size="small" icon={<DownOutlined />} disabled={stepIndex === stepFields.length - 1} onClick={() => move(stepIndex, stepIndex + 1)} />
												<Button size="small" danger icon={<DeleteOutlined />} disabled={stepFields.length === 1} onClick={() => remove(step.name)}>حذف مرحله</Button>
											</Space>
										</div>
										<Form.Item name={[step.name, "name"]} label="نام مرحله" rules={[{ required: true, whitespace: true, message: "نام مرحله را وارد کنید." }]}><Input placeholder="مثلاً تأیید مدیر قراردادها" /></Form.Item>
										<div className="mb-2 flex items-center justify-between">
											<Typography.Text type="secondary">تأییدکننده‌های این مرحله</Typography.Text>
											<Form.List name={[step.name, "recipients"]}>{(_, { add }) => <Button size="small" onClick={() => add({ target_type: "USER" })}>افزودن گیرنده</Button>}</Form.List>
										</div>
										<Form.List name={[step.name, "recipients"]}>
											{(recipientFields, { remove: removeRecipient }) => (
												<div className="flex flex-col gap-2">
													{recipientFields.map(recipient => (
														<div className="grid grid-cols-1 gap-2 md:grid-cols-[160px_1fr_90px]" key={recipient.key}>
															<Form.Item name={[recipient.name, "target_type"]} rules={[{ required: true }]}><Select options={[{ label: "کاربر", value: "USER" }, { label: "نقش", value: "ROLE" }]} onChange={() => form.setFieldValue(["steps", step.name, "recipients", recipient.name, "target_id"], undefined)} /></Form.Item>
															<Form.Item shouldUpdate noStyle>
																{({ getFieldValue }) => {
																	const target = getFieldValue(["steps", step.name, "recipients", recipient.name, "target_type"]) as RecipientTargetType;
																	return <Form.Item name={[recipient.name, "target_id"]} rules={[{ required: true, message: "گیرنده را انتخاب کنید." }]}><Select showSearch optionFilterProp="label" loading={loadingOptions} options={target === "ROLE" ? roleOptions : userOptions} placeholder={target === "ROLE" ? "انتخاب نقش" : "انتخاب کاربر"} /></Form.Item>;
																}}
															</Form.Item>
															<Button danger disabled={recipientFields.length === 1} onClick={() => removeRecipient(recipient.name)}>حذف</Button>
														</div>
													))}
												</div>
											)}
										</Form.List>
									</div>
								))}
							</div>
						)}
					</Form.List>
					<div className="mt-5 flex justify-end gap-2">
						<Button onClick={onClose} disabled={saving}>انصراف</Button>
						<Button htmlType="submit" type="primary" loading={saving}>ذخیره</Button>
					</div>
				</Form>
			</div>
		</Modal>
	);
}
