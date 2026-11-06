import { useAccess } from "#src/hooks";
import { RHFProText } from "#src/shared/ui/rhf-pro/fields/RHFProText";
import { RHFSelect } from "#src/shared/ui/rhf-pro/fields/RHFSelect";
import { theme } from "antd";
import React, { useEffect, useMemo, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { COMPANY_TYPE_REQUIRED_SERVICES, isUnsupportedTemplateCompanyType, OPENAPI_VARIANT_OPTIONS, SMS_TEMPLATE_VARIANT, TEMPLATE_DOCUMENT_KIND_OPTIONS } from "../../model/template-variants";
import { useServicesListQuery } from "../../queries/template-create.queries";

export default function TemplateCreateForm() {
	const { token } = theme.useToken();
	const { control, setValue } = useFormContext();
	const { getPermittedCompanyTypes, getPermittedServiceIds } = useAccess();

	const templateId = useWatch({ control, name: "templateId" });
	const permissionAction = templateId ? "update" : "create";

	const { data: servicesData, isLoading: isLoadingServices } = useServicesListQuery();

	const permittedServiceIds = useMemo(
		() => new Set(getPermittedServiceIds("contract_template", permissionAction)),
		[getPermittedServiceIds, permissionAction],
	);

	const rawServices = useMemo(() => {
		const payload = (servicesData as any)?.data ?? servicesData;
		const results = Array.isArray(payload?.results) ? payload.results : [];
		return results.filter((service: any) => permittedServiceIds.has(Number(service.id)));
	}, [servicesData, permittedServiceIds]);

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
	const selectedCompanyType = useWatch({ control, name: "company_type" });

	const companyTypeOptions = useMemo(() => {
		if (!selectedServiceId)
			return [];
		return getPermittedCompanyTypes("contract_template", permissionAction, selectedServiceId)
			// an already-saved unsupported type stays visible so the template can still be opened and corrected
			.filter(opt => !isUnsupportedTemplateCompanyType(serviceStringValue, opt.key) || opt.key === selectedCompanyType)
			.map(opt => ({
				label: opt.value,
				value: opt.key,
			}));
	}, [selectedServiceId, serviceStringValue, selectedCompanyType, permissionAction, getPermittedCompanyTypes]);

	// Only a user-driven service change clears the dependent fields; loading a template sets service_id from null.
	const previousServiceId = useRef(selectedServiceId);
	useEffect(() => {
		if (previousServiceId.current != null && previousServiceId.current !== selectedServiceId) {
			setValue("company_type", undefined);
			setValue("variant", undefined);
		}
		previousServiceId.current = selectedServiceId;
	}, [selectedServiceId, setValue]);

	const isSmsService = serviceStringValue === "sms";
	const isOpenApiService = serviceStringValue === "openapi";
	const isCompanyTypeRequired = COMPANY_TYPE_REQUIRED_SERVICES.includes(String(serviceStringValue));

	// SMS templates only exist for the client variant, so it is fixed instead of chosen (also normalizes legacy old/new values).
	useEffect(() => {
		if (isSmsService)
			setValue("variant", SMS_TEMPLATE_VARIANT);
	}, [isSmsService, selectedServiceId, setValue]);

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
						options={TEMPLATE_DOCUMENT_KIND_OPTIONS}
						selectProps={{ placeholder: "انتخاب نوع سند...", size: "large", getPopupContainer }}
						formItemProps={{ style: { marginBottom: 0 } }}
					/>
				</div>

				{isOpenApiService && (
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
							options={OPENAPI_VARIANT_OPTIONS}
							selectProps={{ placeholder: "انتخاب کنید...", size: "large", getPopupContainer }}
							formItemProps={{ style: { marginBottom: 0 } }}
						/>
					</div>
				)}

				<div className="flex-1 min-w-[200px]">
					<RHFSelect
						name="company_type"
						label={(
							<span className="text-xs font-medium" style={{ color: token.colorTextDescription }}>
								نوع شرکت
								{isCompanyTypeRequired ? <span className="text-red-500"> *</span> : " (اختیاری)"}
							</span>
						)}
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
