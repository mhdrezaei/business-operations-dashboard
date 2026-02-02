import type { ContractFormValues } from "../../model/contract.form.types";
import { BasicContent } from "#src/components/";
import { RHFSelect } from "#src/shared/ui/rhf-pro";
import { ProCard } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { Col, Row } from "antd";
import React, { useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { companiesByServiceQuery, servicesQuery } from "../../queries/contract.queries";
import { MONTH_OPTIONS, YEAR_OPTIONS } from "../constants/jalali-date-options";

const COUNTERPARTY_OPTIONS = [
	{ label: "شرکای تجاری", value: "partners" },
	{ label: "دولت و اپراتورها", value: "gov_ops" },
];

const TRAFFIC_COMPANY_TYPE_OPTIONS = [
	{ label: "CP", value: "CP" },
	{ label: "IXP", value: "IXP" },
	{ label: "TCI", value: "TCI" },
	{ label: "PREMIUM", value: "PREMIUM" },
];

export function FixedStartSection() {
	const { setValue, control } = useFormContext<ContractFormValues>();

	const services = useQuery(servicesQuery());

	const serviceId = useWatch({ control, name: "serviceId" });
	const serviceCode = useWatch({ control, name: "serviceCode" });
	const counterpartyType = useWatch({ control, name: "counterpartyType" });
	const trafficCompanyType = useWatch({ control, name: "trafficCompanyType" });

	const companies = useQuery(companiesByServiceQuery(serviceId));

	const isSms = serviceCode === "sms";
	const isTraffic = serviceCode === "traffic";

	// ✅ وقتی سرویس عوض میشه: همه وابسته‌ها ریست
	useEffect(() => {
		setValue("companyId", null, { shouldDirty: true, shouldValidate: true });
		setValue("counterpartyType", null, { shouldDirty: true, shouldValidate: true });
		setValue("trafficCompanyType", null, { shouldDirty: true, shouldValidate: true });
	}, [serviceId, setValue]);

	// ✅ serviceCode از سرویس انتخابی
	useEffect(() => {
		const selected = services.data?.results.find(s => s.id === serviceId);
		setValue("serviceCode", selected?.code ?? "", { shouldDirty: true, shouldValidate: true });
	}, [serviceId, services.data, setValue]);

	// ✅ sms: اگر gov_ops شد شرکت لازم نیست
	useEffect(() => {
		if (isSms && counterpartyType === "gov_ops") {
			setValue("companyId", null, { shouldDirty: true, shouldValidate: true });
		}
	}, [isSms, counterpartyType, setValue]);

	// ✅ traffic: با تغییر نوع شرکت، شرکت ریست شود
	useEffect(() => {
		if (isTraffic) {
			setValue("companyId", null, { shouldDirty: true, shouldValidate: true });
		}
	}, [isTraffic, trafficCompanyType, setValue]);

	// ✅ options شرکت‌ها (پیش‌فرض)
	const companyOptionsDefault = useMemo(
		() =>
			(companies.data?.results ?? []).map((c: any) => ({
				label: c.name,
				value: c.id,
			})),
		[companies.data],
	);

	// ✅ options شرکت‌ها برای traffic: فقط فیلتر بر اساس company_type انتخاب شده
	const companyOptionsTraffic = useMemo(() => {
		const list = companies.data?.results ?? [];
		if (!trafficCompanyType)
			return [];
		return list
			.filter((c: any) => c.company_type === trafficCompanyType)
			.map((c: any) => ({ label: c.name, value: c.id }));
	}, [companies.data, trafficCompanyType]);

	// ✅ نمایش شرکت:
	// - sms فقط اگر partners
	// - traffic فقط اگر trafficCompanyType انتخاب شده
	// - سایر سرویس‌ها همیشه
	const showCompanySelect
		= (!isSms && !isTraffic) || (isSms && counterpartyType === "partners") || (isTraffic && !!trafficCompanyType);

	const companyOptions = isTraffic ? companyOptionsTraffic : companyOptionsDefault;

	// ✅ disabled logic
	const isCompanyDisabled = !serviceId || companies.isLoading || (isTraffic && !trafficCompanyType);

	const companyPlaceholder
		= !serviceId
			? "ابتدا سرویس را انتخاب کنید"
			: companies.isLoading
				? "در حال دریافت لیست شرکت‌ها..."
				: isTraffic && !trafficCompanyType
					? "ابتدا نوع شرکت (ترافیک) را انتخاب کنید"
					: "شرکت را انتخاب کنید";

	return (
		<ProCard>
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

					{/* ✅ sms: طرف قرارداد */}
					{isSms
						? (
							<Col span={12}>
								<RHFSelect<ContractFormValues, "counterpartyType", "partners" | "gov_ops" | null>
									name="counterpartyType"
									label="طرف قرارداد"
									options={COUNTERPARTY_OPTIONS}
									selectProps={{ allowClear: true, placeholder: "انتخاب کنید" }}
								/>
							</Col>
						)
						: null}

					{/* ✅ traffic: نوع شرکت */}
					{isTraffic
						? (
							<Col span={12}>
								<RHFSelect<ContractFormValues, "trafficCompanyType", any>
									name="trafficCompanyType"
									label="نوع شرکت (ترافیک)"
									options={TRAFFIC_COMPANY_TYPE_OPTIONS}
									selectProps={{ allowClear: true, placeholder: "انتخاب کنید" }}
								/>
							</Col>
						)
						: null}

					{/* ✅ company */}
					{showCompanySelect
						? (
							<Col span={12}>
								<RHFSelect<ContractFormValues, "companyId", number | null>
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
						)
						: null}
				</Row>

				{/* ✅ تاریخ‌ها */}
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
						selectProps={{ allowClear: true, placeholder: "سال" }}
					/>

					<RHFSelect<ContractFormValues, "startMonth", number | null>
						name="startMonth"
						label="ماه شروع"
						options={MONTH_OPTIONS as any}
						selectProps={{ allowClear: true, placeholder: "ماه" }}
					/>

					<RHFSelect<ContractFormValues, "endYear", number | null>
						name="endYear"
						label="سال پایان"
						options={YEAR_OPTIONS}
						selectProps={{ allowClear: true, placeholder: "سال" }}
					/>

					<RHFSelect<ContractFormValues, "endMonth", number | null>
						name="endMonth"
						label="ماه پایان"
						options={MONTH_OPTIONS as any}
						selectProps={{ allowClear: true, placeholder: "ماه" }}
					/>
				</div>
			</BasicContent>
		</ProCard>
	);
}
