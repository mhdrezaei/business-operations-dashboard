import type { ContractFormValues } from "../../model/contract.form.types";
import { BasicContent } from "#src/components/";
import { RHFSelect } from "#src/shared/ui/rhf-pro";
import { useQuery } from "@tanstack/react-query";
import { Col, Row } from "antd";

import React, { useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { companiesByServiceQuery, servicesQuery } from "../../queries/contract.queries";
import { MONTH_OPTIONS, YEAR_OPTIONS } from "../constants/jalali-date-options";

export function FixedStartSection() {
	const { setValue, control } = useFormContext<ContractFormValues>();

	const services = useQuery(servicesQuery());

	// ✅ بهتر از watch: useWatch مخصوص RHF و رندرها بهینه‌تر
	const serviceId = useWatch({ control, name: "serviceId" });

	const companies = useQuery(companiesByServiceQuery(serviceId));

	// ✅ وقتی سرویس عوض میشه، شرکت ریست بشه (companyId در root است)
	useEffect(() => {
		setValue("companyId", null, { shouldDirty: true, shouldValidate: true });
	}, [serviceId, setValue]);

	// اگر هنوز هم serviceCode می‌خوای:
	useEffect(() => {
		const selected = services.data?.results.find(s => s.id === serviceId);
		setValue("serviceCode", selected?.code ?? "");
	}, [serviceId, services.data, setValue]);

	const companyOptions = useMemo(
		() =>
			(companies.data?.results ?? []).map(c => ({
				label: c.name,
				value: c.id,
			})),
		[companies.data],
	);

	const isCompanyDisabled = !serviceId;
	const companyPlaceholder = isCompanyDisabled
		? "ابتدا سرویس را انتخاب کنید"
		: companies.isLoading
			? "در حال دریافت لیست شرکت‌ها..."
			: "شرکت را انتخاب کنید";

	return (
		<>
			<BasicContent className="w-full">
				<Row gutter={16}>
					<Col span={12}>
						<RHFSelect<ContractFormValues, "serviceId", number | null>
							name="serviceId"
							label="نوع سرویس"
							loading={services.isLoading}
							options={(services.data?.results ?? []).map(s => ({ label: s.name, value: s.id }))}
							selectProps={{ allowClear: true, placeholder: "سرویس را انتخاب کنید" }}
						/>
					</Col>
					<Col span={12}>
						{/* ✅ Select شرکت (companyId در root) */}
						<RHFSelect<ContractFormValues, "companyId", number | null>
							name="companyId"
							label="شرکت"
							loading={companies.isLoading}
							options={companyOptions}
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
				{/* ✅ چهار Select کنار هم مثل تصویر */}
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
						gap: 12,
						marginTop: 8,
					}}
				>
					<RHFSelect<ContractFormValues, "startYear", number | null>
						name="startYear"
						label="سال شروع"
						options={YEAR_OPTIONS}
						selectProps={{
							allowClear: true,
							placeholder: "سال",
						}}
					/>

					<RHFSelect<ContractFormValues, "startMonth", number | null>
						name="startMonth"
						label="ماه شروع"
						options={MONTH_OPTIONS as any}
						selectProps={{
							allowClear: true,
							placeholder: "ماه",
						}}
					/>

					<RHFSelect<ContractFormValues, "endYear", number | null>
						name="endYear"
						label="سال پایان"
						options={YEAR_OPTIONS}
						selectProps={{
							allowClear: true,
							placeholder: "سال",
						}}
					/>

					<RHFSelect<ContractFormValues, "endMonth", number | null>
						name="endMonth"
						label="ماه پایان"
						options={MONTH_OPTIONS as any}
						selectProps={{
							allowClear: true,
							placeholder: "ماه",
						}}
					/>
				</div>
			</BasicContent>
		</>
	);
}
