import type { AdminUserDto, AdminUserUpsertPayload } from "../../model/admin-users.types";

import { BasicButton } from "#src/components";
import { RHFProText } from "#src/shared/ui/rhf-pro"; // اگر کامپوننت‌های RHF شما متفاوت است جایگزین کن

import { ProCard } from "@ant-design/pro-components";
import { Modal } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import "./admin-user-upsert-modal.css";

interface Props {
	open: boolean
	mode: "create" | "edit"
	loading?: boolean
	initial?: AdminUserDto | null
	onClose: () => void
	onSubmit: (values: AdminUserUpsertPayload) => Promise<void> | void
}

export function AdminUserUpsertModal({ open, mode, loading, initial, onClose, onSubmit }: Props) {
	const [saving, setSaving] = useState(false);

	const defaultValues = useMemo<AdminUserUpsertPayload>(() => {
		if (!initial) {
			return {
				username: "",
				first_name: "",
				last_name: "",
				email: "",
				mobile: "",
				national_code: "",
				is_active: true,
				is_staff: false,
				is_superuser: false,
				password: "",
			};
		}

		return {
			username: initial.username ?? "",
			first_name: initial.first_name ?? "",
			last_name: initial.last_name ?? "",
			email: initial.email ?? "",
			mobile: initial.mobile ?? "",
			national_code: initial.national_code ?? "",
			is_active: !!initial.is_active,
			is_staff: !!initial.is_staff,
			is_superuser: !!initial.is_superuser,
			password: "",
		};
	}, [initial]);

	const form = useForm<AdminUserUpsertPayload>({ defaultValues });

	useEffect(() => {
		if (!open)
			return;
		form.reset(defaultValues);
	}, [open, defaultValues]);

	const title = mode === "create" ? "ایجاد کاربر" : "ویرایش کاربر";
	const fieldClassName = "admin-user-upsert-field";

	return (
		<Modal
			open={open}
			onCancel={onClose}
			title={title}
			footer={null}
			width={720}
			destroyOnClose
		>
			{
				loading
					? null
					: (
						<FormProvider {...form}>
							<form
								onSubmit={form.handleSubmit(async (values) => {
									setSaving(true);
									try {
										// در حالت edit اگر پسورد خالی بود، ارسالش نکن
										const payload: AdminUserUpsertPayload = { ...values };
										if (mode === "edit" && !payload.password) {
											delete payload.password;
										}
										await onSubmit(payload);
										onClose();
									}
									finally {
										setSaving(false);
									}
								})}

							>
								<ProCard>
									<div className="grid grid-cols-2 gap-3">
										<RHFProText name="username" label="نام کاربری" formItemProps={{ className: fieldClassName }} />
										<RHFProText name="email" label="ایمیل" formItemProps={{ className: fieldClassName }} />

										<RHFProText name="first_name" label="نام" formItemProps={{ className: fieldClassName }} />
										<RHFProText name="last_name" label="نام خانوادگی" formItemProps={{ className: fieldClassName }} />

										<RHFProText name="mobile" label="موبایل" formItemProps={{ className: fieldClassName }} />
										<RHFProText name="national_code" label="کد ملی" formItemProps={{ className: fieldClassName }} />

										<RHFProText
											name="password"
											label={mode === "create" ? "رمز عبور" : "رمز عبور جدید (اختیاری)"}
											formItemProps={{ className: fieldClassName }}
										/>

										{/* اگر RHFCheckbox/RHFSwitch دارید بهتره؛ اینجا فقط نمونه */}
										<div className="col-span-2 flex gap-3 items-center mt-2">
											<label className="flex items-center gap-2">
												<input type="checkbox" {...form.register("is_active")} />
												فعال
											</label>
											<label className="flex items-center gap-2">
												<input type="checkbox" {...form.register("is_staff")} />
												Staff
											</label>
											<label className="flex items-center gap-2">
												<input type="checkbox" {...form.register("is_superuser")} />
												Superuser
											</label>
										</div>
									</div>
								</ProCard>
								<div className="col-span-2 flex justify-end gap-2 mt-3">
									<BasicButton onClick={onClose}>انصراف</BasicButton>
									<BasicButton htmlType="submit" type="primary" loading={saving}>
										ذخیره
									</BasicButton>
								</div>
							</form>
						</FormProvider>
					)
			}
		</Modal>
	);
}
