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
import React, { useEffect, useMemo } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import {
	adminRoleUpsertSchema,
	getComparableAdminRoleString,
	mergeAdminRoleValues,
} from "../../model/admin-roles.schema";
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
	const [policiesDirty, setPoliciesDirty] = React.useState(false);
	const handlePoliciesChange = React.useCallback((payload: AdminRolePoliciesBulkUpsertPayload, dirty: boolean) => {
		setPoliciesPayload(payload);
		setPoliciesDirty(dirty);
	}, []);

	const mergedDefaultValues = useMemo(() => defaultValues, [defaultValues]);

	const form = useForm<AdminRoleFormValues>({
		defaultValues: mergedDefaultValues,
		resolver: zodResolver(adminRoleUpsertSchema) as any,
	});

	const watchedValues = useWatch({ control: form.control });

	const isDirty = useMemo(() => {
		const currentMerged = mergeAdminRoleValues(mergedDefaultValues, watchedValues as Partial<AdminRoleFormValues>);
		return getComparableAdminRoleString(currentMerged) !== getComparableAdminRoleString(mergedDefaultValues);
	}, [mergedDefaultValues, watchedValues]);

	useEffect(() => {
		form.reset(mergedDefaultValues);
	}, [mergedDefaultValues, form]);

	async function handleSubmit(values: AdminRoleFormValues) {
		const role = adminRoleUpsertSchema.parse(values);
		await onSubmit({ role, policies: policiesPayload });
	}

	return (
		<FormProvider {...form}>
			<form className="flex h-full min-h-0 flex-col gap-4" onSubmit={form.handleSubmit(handleSubmit)}>
				<section className="shrink-0 rounded-3xl border border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] p-4">
					<header className="mb-3 flex items-center justify-between gap-3">
						<h2 className="m-0 text-base font-bold">مشخصات نقش</h2>
						<Tooltip
							placement="bottomRight"
							title={<div className="max-w-[420px] text-right leading-8">{permissionHelpText}</div>}
						>
							<Button
								type="default"
								shape="circle"
								size="small"
								aria-label="راهنمای تعریف سطح دسترسی سرویس‌ها"
							>
								?
							</Button>
						</Tooltip>
					</header>

					<div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
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
								rows: 2,
								placeholder: "در صورت نیاز توضیح نقش را وارد کنید",
								disabled: submitting,
							}}
						/>
					</div>
				</section>

				<AdminRolePermissionsEditor
					initialAllowedServiceIds={initialRole?.allowed_service_ids ?? []}
					initialPolicies={initialPolicies}
					initialPoliciesLoading={initialPoliciesLoading}
					onChange={handlePoliciesChange}
				/>

				<div className="flex shrink-0 justify-end gap-2 border-t border-[var(--ant-color-border-secondary)] pt-4">
					<BasicButton onClick={onClose} disabled={submitting}>
						انصراف
					</BasicButton>
					<BasicButton
						htmlType="submit"
						type="primary"
						loading={submitting}
						disabled={!(isDirty || policiesDirty) || submitting}
					>
						{submitText}
					</BasicButton>
				</div>
			</form>
		</FormProvider>
	);
}
