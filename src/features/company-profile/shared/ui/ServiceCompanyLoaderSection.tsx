import type { CSSProperties } from "react";
import type { CompanyProfileFormValues } from "../../model/company-profile.form.types";

import ContractFilterSearchIcon from "#src/assets/svg/header/contract-filter-search.svg?react";
import { useAccess } from "#src/hooks";
import { RHFSelect } from "#src/shared/ui/rhf-pro";
import { DownOutlined, EditOutlined, PlusOutlined, UpOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, ConfigProvider, Form, theme } from "antd";

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { companiesByServiceQuery, servicesQuery } from "../../queries/company-profile.queries";
import { companyTypeMatches } from "../utils";

import CompanyCreateModal from "./CompanyCreateModal";
import CompanyRenameModal from "./CompanyRenameModal";
import "./service-company-loader-section.css";

export function ServiceCompanyLoaderSection() {
	const antdContext = useContext(ConfigProvider.ConfigContext);
	const { token } = theme.useToken();
	const configuredCardRadius = antdContext.theme?.components?.Card?.borderRadiusLG;
	const filterRadius = typeof configuredCardRadius === "number" ? configuredCardRadius : token.borderRadiusLG;
	const { setValue, control } = useFormContext<CompanyProfileFormValues>();
	const { getPermittedCompanyTypes, getPermittedServiceIds, hasDomainPermissionByServiceId } = useAccess();

	const serviceId = useWatch({ control, name: "serviceId" }) || 0;
	const companyType = useWatch({ control, name: "companyType" });
	const companyId = useWatch({ control, name: "companyId" });

	const services = useQuery(servicesQuery());
	const companies = useQuery(companiesByServiceQuery(serviceId));

	const permittedServiceIdList = getPermittedServiceIds("company_profile", "view");
	const permittedServiceIds = useMemo(
		() => new Set(permittedServiceIdList),
		[permittedServiceIdList.join(",")],
	);

	const selectedServiceCode = useMemo(() => {
		if (!serviceId)
			return "";
		return String((services.data?.results ?? []).find(item => item.id === serviceId)?.code ?? "").trim().toLowerCase();
	}, [serviceId, services.data]);
	const requiresCompanyType = selectedServiceCode === "traffic" || selectedServiceCode === "psp" || selectedServiceCode === "sms";

	const canCreateCompany = hasDomainPermissionByServiceId("company_profile", "create", serviceId || null, companyType);
	const canUpdateCompany = hasDomainPermissionByServiceId("company_profile", "update", serviceId || null, companyType);

	const [createOpen, setCreateOpen] = useState(false);
	const [renameOpen, setRenameOpen] = useState(false);
	const [filtersCollapsed, setFiltersCollapsed] = useState(false);

	const prevServiceIdRef = useRef<typeof serviceId>(undefined);
	const prevCompanyTypeRef = useRef<typeof companyType>(undefined);
	const prevCompanyIdRef = useRef<typeof companyId>(undefined);

	useEffect(() => {
		const prev = prevServiceIdRef.current;
		prevServiceIdRef.current = serviceId;

		if (prev === undefined)
			return;

		if (prev !== serviceId) {
			setValue("companyType", null, { shouldDirty: true, shouldValidate: true });
			setValue("companyId", null, { shouldDirty: true, shouldValidate: true });
			setValue("companyProfile", null as any, { shouldDirty: true, shouldValidate: true });
		}
	}, [serviceId, setValue]);

	useEffect(() => {
		if (!serviceId)
			return;

		if (!permittedServiceIds.has(serviceId)) {
			setValue("serviceId", null, { shouldDirty: true, shouldValidate: true });
			setValue("companyType", null, { shouldDirty: true, shouldValidate: true });
			setValue("companyId", null, { shouldDirty: true, shouldValidate: true });
			setValue("companyProfile", null as any, { shouldDirty: true, shouldValidate: true });
		}
	}, [serviceId, setValue, permittedServiceIdList.join(",")]);

	useEffect(() => {
		const prev = prevCompanyTypeRef.current;
		prevCompanyTypeRef.current = companyType;

		if (prev === undefined)
			return;

		if (prev !== companyType) {
			setValue("companyId", null, { shouldDirty: true, shouldValidate: true });
			setValue("companyProfile", null as any, { shouldDirty: true, shouldValidate: true });
		}
	}, [companyType, setValue]);

	useEffect(() => {
		const prev = prevCompanyIdRef.current;
		prevCompanyIdRef.current = companyId;

		if (prev === undefined)
			return;

		if (prev !== companyId)
			setValue("companyProfile", null as any, { shouldDirty: true, shouldValidate: true });
	}, [companyId, setValue]);

	const serviceOptions = useMemo(
		() =>
			(services.data?.results ?? [])
				.filter(service => permittedServiceIds.has(service.id))
				.map(service => ({ label: service.name, value: service.id })),
		[services.data, permittedServiceIdList.join(",")],
	);

	const companyTypeOptions = useMemo(
		() => requiresCompanyType && serviceId
			? getPermittedCompanyTypes("company_profile", "view", serviceId).map(item => ({ label: item.value, value: item.key }))
			: [],
		[requiresCompanyType, serviceId, getPermittedCompanyTypes],
	);

	const companyOptions = useMemo(
		() => (companies.data?.results ?? [])
			.filter(c => !requiresCompanyType || !companyType || companyTypeMatches(c.company_type, companyType))
			.map(c => ({ label: c.name, value: c.id })),
		[companies.data, requiresCompanyType, companyType],
	);

	const selectedCompanyName = useMemo(() => {
		if (!companyId)
			return null;
		return (companies.data?.results ?? []).find(c => c.id === companyId)?.name ?? null;
	}, [companies.data, companyId]);

	const isCompanyDisabled = !serviceId || companies.isLoading || (requiresCompanyType && !companyType);

	const companyPlaceholder = !serviceId
		? "ابتدا سرویس را انتخاب کنید"
		: companies.isLoading
			? "در حال دریافت لیست شرکت‌ها..."
			: "شرکت را انتخاب کنید";

	return (
		<div
			className={`basic-table-shell company-profile-filter-shell${filtersCollapsed ? " basic-table-shell--collapsed" : ""}`}
			style={{
				"--basic-table-filter-margin": `${token.marginLG}px`,
				"--basic-table-filter-padding": `${token.paddingLG}px`,
				"--basic-table-filter-padding-top": `${token.paddingLG + token.controlHeightLG + token.marginSM}px`,
				"--basic-table-filter-border": `${token.lineWidth}px solid ${token.colorBorderSecondary}`,
				"--basic-table-filter-radius": `${filterRadius}px`,
				"--basic-table-filter-background": token.colorBgContainer,
				"--basic-table-filter-shadow": token.boxShadowTertiary,
				"--basic-table-filter-heading": token.colorTextHeading,
				"--basic-table-filter-secondary": token.colorTextTertiary,
				"--basic-table-filter-text": token.colorText,
				"--basic-table-filter-split": token.colorSplit,
				"--basic-table-filter-fill": token.colorFillSecondary,
				"--basic-table-filter-primary": token.colorPrimary,
				"--basic-table-filter-primary-bg": token.colorPrimaryBg,
				"--basic-table-filter-control-radius": `${token.borderRadius}px`,
				"--basic-table-filter-line-width": `${token.lineWidth}px`,
				"--basic-table-filter-dash-length": `${Math.max(token.sizeXS - token.lineWidthBold, 1)}px`,
				"--basic-table-filter-dash-gap": `${token.paddingXXS}px`,
				"--basic-table-filter-label-weight": token.fontWeightStrong,
				"--basic-table-heading-icon-size": `${token.controlHeightLG + token.paddingSM}px`,
				"--basic-table-heading-icon-radius": `${token.borderRadiusLG}px`,
				"--company-profile-filter-grid-gap": `${token.marginLG}px`,
				"--company-profile-filter-action-gap": `${token.marginSM}px`,
				"--company-profile-filter-action-offset": `${token.marginLG}px`,
				"--company-profile-filter-content-padding": `${token.paddingLG}px`,
			} as CSSProperties}
		>
			<div
				className="basic-table-filter-heading"
				role="button"
				tabIndex={0}
				aria-expanded={!filtersCollapsed}
				onClick={() => setFiltersCollapsed(current => !current)}
				onKeyDown={(event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						setFiltersCollapsed(current => !current);
					}
				}}
			>
				<span className="basic-table-filter-heading__icon" aria-hidden="true">
					<ContractFilterSearchIcon />
				</span>
				<div className="basic-table-filter-heading__copy">
					<div className="basic-table-filter-heading__title">انتخاب شرکت</div>
					<div className="basic-table-filter-heading__subtitle">
						برای مشاهده و مدیریت اطلاعات، ابتدا سرویس و شرکت موردنظر را انتخاب کنید.
					</div>
				</div>
				<button
					type="button"
					className="basic-table-filter-toggle"
					aria-label={filtersCollapsed ? "باز کردن فیلترها" : "بستن فیلترها"}
					aria-expanded={!filtersCollapsed}
					onClick={(event) => {
						event.stopPropagation();
						setFiltersCollapsed(current => !current);
					}}
				>
					{filtersCollapsed ? <DownOutlined /> : <UpOutlined />}
				</button>
			</div>

			<div className="ant-pro-table-search company-profile-filter-card">
				{!filtersCollapsed && (
					<Form layout="vertical" className="company-profile-filter-content w-full">
						<div className="company-profile-filter-grid">
							<div>
								<RHFSelect<CompanyProfileFormValues, "serviceId", number | null>
									name="serviceId"
									label="سرویس"
									loading={services.isLoading}
									options={serviceOptions}
									selectProps={{ allowClear: true, placeholder: "سرویس را انتخاب کنید" }}
								/>
							</div>

							{requiresCompanyType
								? (
									<div>
										<RHFSelect<CompanyProfileFormValues, "companyType", string | null>
											name="companyType"
											label="نوع شرکت"
											loading={false}
											options={companyTypeOptions as any}
											selectProps={{
												allowClear: true,
												disabled: !serviceId,
												placeholder: "نوع شرکت را انتخاب کنید",
											}}
										/>
									</div>
								)
								: null}

							<div>
								<RHFSelect<CompanyProfileFormValues, "companyId", number | null>
									name="companyId"
									label="شرکت"
									loading={companies.isLoading}
									options={companyOptions as any}
									selectProps={{
										allowClear: true,
										disabled: isCompanyDisabled,
										placeholder: companyPlaceholder,
										style: isCompanyDisabled ? { cursor: "not-allowed" } : undefined,
										open: isCompanyDisabled ? false : undefined,
									}}
								/>
							</div>
						</div>

						<div className="company-profile-filter-actions">
							<Button
								type="default"
								icon={<PlusOutlined />}
								disabled={!serviceId || !canCreateCompany || (requiresCompanyType && !companyType)}
								onClick={() => setCreateOpen(true)}
							>
								ایجاد شرکت جدید
							</Button>

							<Button
								type="primary"
								icon={<EditOutlined />}
								disabled={!companyId || !canUpdateCompany || (requiresCompanyType && !companyType)}
								onClick={() => setRenameOpen(true)}
							>
								ویرایش نام شرکت
							</Button>
						</div>
					</Form>
				)}
			</div>

			<CompanyCreateModal
				open={createOpen}
				serviceId={serviceId}
				companyType={companyType}
				requiresCompanyType={requiresCompanyType}
				serviceOptions={serviceOptions}
				disabled={!serviceId || !canCreateCompany || (requiresCompanyType && !companyType)}
				onClose={() => setCreateOpen(false)}
				onCreated={(createdCompanyId) => {
					setValue("companyId", createdCompanyId, { shouldDirty: true, shouldValidate: true });
					setCreateOpen(false);
				}}
			/>

			<CompanyRenameModal
				open={renameOpen}
				serviceId={serviceId}
				companyType={companyType}
				requiresCompanyType={requiresCompanyType}
				companyId={companyId ?? null}
				companyName={selectedCompanyName}
				disabled={!companyId || !canUpdateCompany || (requiresCompanyType && !companyType)}
				onClose={() => setRenameOpen(false)}
				onRenamed={(newName) => {
					void newName;
					setRenameOpen(false);
				}}
				onDeleted={() => {
					setValue("companyId", null, { shouldDirty: true, shouldValidate: true });
					setValue("companyProfile", null as any, { shouldDirty: true, shouldValidate: true });
					setRenameOpen(false);
				}}
			/>
		</div>
	);
}
