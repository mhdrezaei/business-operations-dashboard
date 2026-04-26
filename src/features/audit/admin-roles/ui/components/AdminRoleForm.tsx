import type { AdminRoleFormValues } from "../../model/admin-roles.schema";
import type {
	AdminRoleDto,
	AdminRolePoliciesBulkUpsertPayload,
	AdminRolePolicyDto,
	AdminRoleUpsertPayload,
} from "../../model/admin-roles.types";

import { BasicButton } from "#src/components";
import { RHFProText, RHFProTextArea } from "#src/shared/ui/rhf-pro";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Tooltip } from "antd";
import React, { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { adminRoleUpsertSchema } from "../../model/admin-roles.schema";
import { AdminRolePermissionsEditor } from "./AdminRolePermissionsEditor";

interface Props {
	defaultValues: AdminRoleFormValues
	initialRole?: AdminRoleDto | null
	initialPolicies?: AdminRolePolicyDto[]
	initialPoliciesLoading?: boolean
	submitText: string
	submitting?: boolean
	onClose: () => void
	onSubmit: (values: { role: AdminRoleUpsertPayload, policies: AdminRolePoliciesBulkUpsertPayload }) => Promise<void> | void
}

export function AdminRoleForm({
	defaultValues,
	initialRole,
	initialPolicies,
	initialPoliciesLoading = false,
	submitText,
	submitting = false,
	onClose,
	onSubmit,
}: Props) {
	const permissionHelpText = "در این بخش می‌توانید سطح دسترسی این نقش را برای هر دامنه و هر سرویس مشخص کنید. ابتدا دامنه موردنظر را انتخاب کنید. سپس برای هر سرویس، مجوزهای مشاهده، ایجاد، ویرایش و حذف را به‌صورت جداگانه فعال یا غیرفعال کنید. اگر سرویسی نیاز به تنظیمات تکمیلی داشته باشد، گزینه‌های مربوط به همان سرویس در ادامه نمایش داده می‌شود. این بخش برای نگهداری و توسعه ساده‌تر، به‌صورت دامنه‌ای و ماژولار طراحی شده است.";
	const [policiesPayload, setPoliciesPayload] = React.useState<AdminRolePoliciesBulkUpsertPayload>({ items: [] });

	const form = useForm<AdminRoleFormValues>({
		defaultValues,
		resolver: zodResolver(adminRoleUpsertSchema) as any,
	});

	useEffect(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	async function handleSubmit(values: AdminRoleFormValues) {
		const role = adminRoleUpsertSchema.parse(values);
		await onSubmit({ role, policies: policiesPayload });
	}

	return (
		<FormProvider {...form}>
			<form onSubmit={form.handleSubmit(handleSubmit)}>
				<div className="space-y-5">
					<section className="grid grid-cols-1 gap-5">
						<article className="relative rounded-[28px] border border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] p-6">
							<div className="absolute left-4 top-4">
								<Tooltip
									placement="bottomLeft"
									title={<div className="max-w-[420px] text-right leading-8">{permissionHelpText}</div>}
								>
									<Button
										type="default"
										shape="circle"
										aria-label="راهنمای تعریف سطح دسترسی سرویس‌ها"
									>
										?
									</Button>
								</Tooltip>
							</div>

							<header className="mb-4 text-right">
								<h2 className="text-lg font-bold">مشخصات نقش</h2>
							</header>

							<div className="space-y-4">
								<RHFProText<AdminRoleFormValues, "name">
									name="name"
									label="نام نقش"
									inputProps={{
										placeholder: "نام نقش را وارد کنید",
										disabled: submitting,
									}}
								/>

								<RHFProTextArea<AdminRoleFormValues, "description">
									name="description"
									label="توضیحات"
									textAreaProps={{
										rows: 5,
										placeholder: "در صورت نیاز توضیح نقش را وارد کنید",
										disabled: submitting,
									}}
								/>
							</div>
						</article>
					</section>

					<AdminRolePermissionsEditor
						initialAllowedServiceIds={initialRole?.allowed_service_ids ?? []}
						initialPolicies={initialPolicies}
						initialPoliciesLoading={initialPoliciesLoading}
						onChange={setPoliciesPayload}
					/>
				</div>

				<div className="mt-6 flex justify-end gap-2">
					<BasicButton onClick={onClose} disabled={submitting}>
						انصراف
					</BasicButton>
					<BasicButton htmlType="submit" type="primary" loading={submitting}>
						{submitText}
					</BasicButton>
				</div>
			</form>
		</FormProvider>
	);
}
