// src/features/contract-templates/create/components/TemplateCreateForm.tsx
import { RHFProText } from "#src/shared/ui/rhf-pro/fields/RHFProText";
import { RHFSelect } from "#src/shared/ui/rhf-pro/fields/RHFSelect";
import { theme } from "antd";
import React, { useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useServicesListQuery } from "../../queries/template-create.queries";

export default function TemplateCreateForm() {
	const { token } = theme.useToken();
	const { control, setValue } = useFormContext();

	const { data: servicesData, isLoading: isLoadingServices } = useServicesListQuery();

	const rawServices = useMemo(() => {
		const payload = (servicesData as any)?.data ?? servicesData;
		return Array.isArray(payload?.results) ? payload.results : [];
	}, [servicesData]);

	const serviceOptions = useMemo(() => {
		return rawServices.map((service: any) => ({
			label: service.name,
			value: service.id,
		}));
	}, [rawServices]);

	const selectedServiceId = useWatch({ control, name: "service_id" });

	const selectedService = useMemo(() => {
		return rawServices.find((s: any) => s.id === selectedServiceId);
	}, [selectedServiceId, rawServices]);

	const serviceStringValue = selectedService?.code || selectedService?.slug || selectedService?.key || selectedServiceId;

	const companyTypeOptions = useMemo(() => {
		if (!selectedService)
			return [];
		const viewPermissions = selectedService?.company_type_permissions?.company_profile?.view;
		if (!Array.isArray(viewPermissions))
			return [];

		return viewPermissions.map((perm: Record<string, string>) => {
			const key = Object.keys(perm)[0];
			return {
				label: perm[key],
				value: key,
			};
		});
	}, [selectedService]);

	// با تغییر سرویس، فیلدهای وابسته ریست بشن
	useEffect(() => {
		setValue("company_type", undefined);
		setValue("variant", undefined);
	}, [selectedServiceId, setValue]);

	const documentKindOptions = [
		{ label: "اصل قرارداد", value: "contract" },
		{ label: "الحاقیه", value: "addendum" },
	];

	// منطق داینامیک نمایش و گزینه‌های فیلد Variant
	const isSmsService = selectedService?.name?.includes("پیامک") || serviceStringValue === "sms";
	const isOpenApiService = serviceStringValue === "openapi";
	const showVariantField = isSmsService || isOpenApiService;

	const variantOptions = useMemo(() => {
		if (isOpenApiService) {
			return [
				{ value: "openapi_legacy", label: "قدیمی" },
				// 🔴 رفع مشکل انتخاب سرویس تفکیکی برای API مالی
				{ value: "openapi_legacy_2", label: "تفکیکی" },
			];
		}
		if (isSmsService) {
			return [
				{ value: "old", label: "قدیمی" },
				{ value: "new", label: "جدید" },
			];
		}
		return [];
	}, [isOpenApiService, isSmsService]);

	const getPopupContainer = (triggerNode: any) => triggerNode.parentNode;

	return (
		<div className="px-6 pb-6 pt-4">
			<div
				className="p-5 rounded-lg border flex flex-wrap gap-x-4 gap-y-5 items-start shadow-sm transition-all duration-300"
				style={{ backgroundColor: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
			>
				<div className="flex-1 min-w-[200px]">
					<RHFProText
						name="name"
						label={(
							<span className="text-xs font-medium" style={{ color: token.colorTextDescription }}>
								نام قالب
								{" "}
								<span className="text-red-500">*</span>
							</span>
						)}
						inputProps={{ placeholder: "مثلاً: قرارداد ترافیک", size: "large" }}
						formItemProps={{ style: { marginBottom: 0 } }}
						enableNumericGuard={false}
					/>
				</div>

				<div className="flex-1 min-w-[200px]">
					<RHFSelect
						name="service_id"
						label={(
							<span className="text-xs font-medium" style={{ color: token.colorTextDescription }}>
								سرویس
								{" "}
								<span className="text-red-500">*</span>
							</span>
						)}
						options={serviceOptions}
						loading={isLoadingServices}
						selectProps={{
							placeholder: "انتخاب سرویس...",
							size: "large",
							showSearch: true,
							optionFilterProp: "label",
							getPopupContainer,
						}}
						formItemProps={{ style: { marginBottom: 0 } }}
					/>
				</div>

				<div className="flex-1 min-w-[200px]">
					<RHFSelect
						name="document_kind"
						label={(
							<span className="text-xs font-medium" style={{ color: token.colorTextDescription }}>
								نوع سند
								{" "}
								<span className="text-red-500">*</span>
							</span>
						)}
						options={documentKindOptions}
						selectProps={{ placeholder: "انتخاب نوع سند...", size: "large", getPopupContainer }}
						formItemProps={{ style: { marginBottom: 0 } }}
					/>
				</div>

				{showVariantField && (
					<div className="flex-1 min-w-[200px]">
						<RHFSelect
							name="variant"
							label={(
								<span className="text-xs font-medium" style={{ color: token.colorTextDescription }}>
									نوع سرویس (variant)
									{" "}
									<span className="text-red-500">*</span>
								</span>
							)}
							options={variantOptions}
							selectProps={{ placeholder: "انتخاب کنید...", size: "large", getPopupContainer }}
							formItemProps={{ style: { marginBottom: 0 } }}
						/>
					</div>
				)}

				<div className="flex-1 min-w-[200px]">
					<RHFSelect
						name="company_type"
						label={<span className="text-xs font-medium" style={{ color: token.colorTextDescription }}>نوع شرکت (اختیاری)</span>}
						options={companyTypeOptions}
						selectProps={{
							placeholder: selectedServiceId ? "انتخاب کنید..." : "ابتدا سرویس را انتخاب کنید",
							size: "large",
							allowClear: true,
							disabled: !selectedServiceId || companyTypeOptions.length === 0,
							getPopupContainer,
						}}
						formItemProps={{ style: { marginBottom: 0 } }}
					/>
				</div>
			</div>
		</div>
	);
}
