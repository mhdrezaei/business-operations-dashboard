import type { ContractFormValues } from "../../../model/contract.form.types";
import { BasicContent } from "#src/components/";
import { RHFSelect } from "#src/shared/ui/rhf-pro";
import { ProCard } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { Col, Row } from "antd";
import React, { useEffect, useMemo, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { companiesByServiceQuery, servicesQuery } from "../../../queries/contract.queries";
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

	// ✅ جلوگیری از پاک شدن مقادیر در edit (فقط بعد از mount)
	const prevServiceIdRef = useRef<typeof serviceId>(undefined);
	const prevTrafficCompanyTypeRef = useRef<typeof trafficCompanyType>(undefined);
	const prevCounterpartyTypeRef = useRef<typeof counterpartyType>(undefined);

	// ✅ فقط وقتی serviceId واقعاً تغییر کرد وابسته‌ها ریست شوند
	useEffect(() => {
		const prev = prevServiceIdRef.current;
		prevServiceIdRef.current = serviceId;

		if (prev === undefined)
			return;

		if (prev !== serviceId) {
			setValue("companyId", null, { shouldDirty: true, shouldValidate: true });
			setValue("counterpartyType", null, { shouldDirty: true, shouldValidate: true });
			setValue("trafficCompanyType" as any, null, { shouldDirty: true, shouldValidate: true });
		}
	}, [serviceId, setValue]);

	// ✅ serviceCode از سرویس انتخابی
	useEffect(() => {
		if (serviceId == null) {
			setValue("serviceCode", null, { shouldDirty: true, shouldValidate: true });
			return;
		}
		if (!services.data?.results?.length)
			return;

		const selected = services.data.results.find(s => s.id === serviceId);
		const normalizedCode = typeof selected?.code === "string" ? selected.code.trim().toLowerCase() : "";
		if (!normalizedCode)
			return;

		setValue("serviceCode", normalizedCode as any, { shouldDirty: true, shouldValidate: true });
	}, [serviceId, services.data, setValue]);

	// ✅ sms: فقط وقتی counterpartyType بعد از mount تغییر کرد و gov_ops شد، companyId پاک شود
	useEffect(() => {
		const prev = prevCounterpartyTypeRef.current;
		prevCounterpartyTypeRef.current = counterpartyType;

		if (prev === undefined)
			return;

		if (isSms && counterpartyType === "gov_ops" && prev !== counterpartyType) {
			setValue("companyId", null, { shouldDirty: true, shouldValidate: true });
		}
	}, [isSms, counterpartyType, setValue]);

	// ✅ traffic: فقط وقتی trafficCompanyType بعد از mount تغییر کرد، companyId پاک شود
	useEffect(() => {
		const prev = prevTrafficCompanyTypeRef.current;
		prevTrafficCompanyTypeRef.current = trafficCompanyType;

		if (prev === undefined)
			return;

		if (isTraffic && prev !== trafficCompanyType) {
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
	const showCompanySelect
		= (!isSms && !isTraffic) || (isSms && counterpartyType === "partners") || (isTraffic && !!trafficCompanyType);

	const companyOptions = isTraffic ? companyOptionsTraffic : companyOptionsDefault;

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
