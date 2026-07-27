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

	const companyTypeOptions = useMemo(() => {
		if (!selectedServiceId)
			return [];

		const selectedService = rawServices.find((s: any) => s.id === selectedServiceId);
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
	}, [selectedServiceId, rawServices]);

	useEffect(() => {
		setValue("company_type", undefined);
	}, [selectedServiceId, setValue]);

	const documentKindOptions = [
		{ label: "اصل قرارداد", value: "contract" },
		{ label: "الحاقیه", value: "addendum" },
	];

	// این تابع ساده باعث می‌شود دراپ‌داون‌ها داخل مودال رندر شوند، نه پشت آن
	const getPopupContainer = (triggerNode: any) => triggerNode.parentNode;

	return (
		<div
			className="p-4 rounded-xl border"
			style={{ backgroundColor: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
		>
			<div className="grid grid-cols-4 gap-4">
				<RHFProText
					name="name"
					label={<span style={{ color: token.colorTextSecondary }}>نام قالب *</span>}
					inputProps={{ placeholder: "مثلاً: قرارداد ترافیک پرمیوم" }}
					formItemProps={{ className: "m-0" }}
				/>

				<RHFSelect
					name="service_id"
					label={<span style={{ color: token.colorTextSecondary }}>سرویس *</span>}
					options={serviceOptions}
					loading={isLoadingServices}
					selectProps={{
						placeholder: "انتخاب سرویس...",
						showSearch: true,
						optionFilterProp: "label",
						virtual: false,
						// ✅ اضافه شدن این خط مشکل لیست خالی را حل می‌کند
						getPopupContainer,
					}}
					formItemProps={{ className: "m-0" }}
				/>

				<RHFSelect
					name="document_kind"
					label={<span style={{ color: token.colorTextSecondary }}>نوع سند *</span>}
					options={documentKindOptions}
					selectProps={{
						placeholder: "انتخاب نوع سند...",
						getPopupContainer, // ✅
					}}
					formItemProps={{ className: "m-0" }}
				/>

				<RHFSelect
					name="company_type"
					label={<span style={{ color: token.colorTextSecondary }}>نوع شرکت (اختیاری)</span>}
					options={companyTypeOptions}
					selectProps={{
						placeholder: selectedServiceId ? "انتخاب کنید..." : "ابتدا سرویس را انتخاب کنید",
						allowClear: true,
						disabled: !selectedServiceId || companyTypeOptions.length === 0,
						getPopupContainer, // ✅
					}}
					formItemProps={{ className: "m-0" }}
				/>
			</div>
		</div>
	);
}
