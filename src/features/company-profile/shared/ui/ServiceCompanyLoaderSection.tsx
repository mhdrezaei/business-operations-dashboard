import type { CompanyProfileFormValues } from "../../model/company-profile.form.types";

import { BasicContent } from "#src/components/";
import { RHFSelect } from "#src/shared/ui/rhf-pro";
import { ProCard } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { Col, Row } from "antd";

import React, { useEffect, useMemo, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { companiesByServiceQuery, companyProfilesByCompanyQuery, servicesQuery } from "../../queries/company-profile.queries";

import { dtoToCompanyInfoForm } from "../../sections/company-info/model/company-info.mappers";

export function ServiceCompanyLoaderSection() {
	const { setValue, control } = useFormContext<CompanyProfileFormValues>();

	const serviceId = useWatch({ control, name: "serviceId" }) || 0;
	const companyId = useWatch({ control, name: "companyId" });

	const services = useQuery(servicesQuery());
	const companies = useQuery(companiesByServiceQuery(serviceId));
	const profiles = useQuery(companyProfilesByCompanyQuery(companyId));
	console.warn(serviceId, "serrrrrrrrrr");
	const prevServiceIdRef = useRef<typeof serviceId>(undefined);
	const prevCompanyIdRef = useRef<typeof companyId>(undefined);

	useEffect(() => {
		const prev = prevServiceIdRef.current;
		prevServiceIdRef.current = serviceId;

		if (prev === undefined)
			return; // mount

		if (prev !== serviceId) {
			setValue("companyId", null, { shouldDirty: true, shouldValidate: true });
			setValue("companyProfile", null as any, { shouldDirty: true, shouldValidate: true });
		}
	}, [serviceId, setValue]);

	useEffect(() => {
		const prev = prevCompanyIdRef.current;
		prevCompanyIdRef.current = companyId;

		if (prev === undefined)
			return; // mount

		if (prev !== companyId) {
			setValue("companyProfile", null as any, { shouldDirty: true, shouldValidate: true });
		}
	}, [companyId, setValue]);

	useEffect(() => {
		if (!companyId)
			return;

		const dto = profiles.data?.results?.[0];
		if (!dto)
			return;

		setValue("companyProfile", dtoToCompanyInfoForm(dto, { serviceId, companyId }), {
			shouldDirty: false,
			shouldValidate: false,
		});
	}, [companyId, profiles.data, setValue]);

	const serviceOptions = useMemo(
		() => (services.data?.results ?? []).map(s => ({ label: s.name, value: s.id })),
		[services.data],
	);

	const companyOptions = useMemo(
		() => (companies.data?.results ?? []).map(c => ({ label: c.name, value: c.id })),
		[companies.data],
	);

	const isCompanyDisabled = !serviceId || companies.isLoading;

	const companyPlaceholder
		= !serviceId
			? "ابتدا سرویس را انتخاب کنید"
			: companies.isLoading
				? "در حال دریافت لیست شرکت‌ها..."
				: "شرکت را انتخاب کنید";

	return (
		<ProCard>
			<BasicContent className="w-full">
				<Row gutter={16}>
					<Col span={12}>
						<RHFSelect<CompanyProfileFormValues, "serviceId", number | null>
							name="serviceId"
							label="سرویس"
							loading={services.isLoading}
							options={serviceOptions}
							selectProps={{ allowClear: true, placeholder: "سرویس را انتخاب کنید" }}
						/>
					</Col>

					<Col span={12}>
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

				{companyId
					? (
						<div style={{ marginTop: 8, opacity: 0.8 }}>
							{profiles.isLoading ? "در حال بارگذاری پروفایل شرکت..." : null}
						</div>
					)
					: null}
			</BasicContent>
		</ProCard>
	);
}
