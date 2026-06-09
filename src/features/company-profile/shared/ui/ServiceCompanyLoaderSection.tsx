import type { CompanyProfileFormValues } from "../../model/company-profile.form.types";

import { BasicContent } from "#src/components/";
import { useAccess } from "#src/hooks";
import { RHFSelect } from "#src/shared/ui/rhf-pro";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Col, Row } from "antd";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { companiesByServiceQuery, servicesQuery } from "../../queries/company-profile.queries";
import { companyTypeMatches } from "../utils";

import CompanyCreateModal from "./CompanyCreateModal";
import CompanyRenameModal from "./CompanyRenameModal";

export function ServiceCompanyLoaderSection() {
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
		<Card>
			<BasicContent className="w-full">
				<Row gutter={16}>
					<Col span={8}>
						<RHFSelect<CompanyProfileFormValues, "serviceId", number | null>
							name="serviceId"
							label="سرویس"
							loading={services.isLoading}
							options={serviceOptions}
							selectProps={{ allowClear: true, placeholder: "سرویس را انتخاب کنید" }}
						/>
					</Col>

					{requiresCompanyType
						? (
							<Col span={8}>
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
							</Col>
						)
						: null}

					<Col span={8}>
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
					</Col>
				</Row>

				<div className="flex justify-end gap-3 mt-3">
					<Button
						type="default"
						disabled={!serviceId || !canCreateCompany || (requiresCompanyType && !companyType)}
						onClick={() => setCreateOpen(true)}
					>
						ایجاد شرکت جدید
					</Button>

					<Button
						type="primary"
						disabled={!companyId || !canUpdateCompany || (requiresCompanyType && !companyType)}
						onClick={() => setRenameOpen(true)}
					>
						ویرایش نام شرکت
					</Button>
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
			</BasicContent>
		</Card>
	);
}
