import type { CompanyProfileFormValues } from "../model/company-profile.form.types";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";

import { FormProvider, useForm, useWatch } from "react-hook-form";
import { servicesQuery } from "../queries/company-profile.queries";
import CompanyContractsCard from "../shared/ui/CompanyContractsCard";
import CompanyProfileAccordion from "../shared/ui/CompanyProfileAccordion";
import { ServiceCompanyLoaderSection } from "../shared/ui/ServiceCompanyLoaderSection";

const defaultValues: CompanyProfileFormValues = {
	serviceId: null,
	companyType: null,
	colocationMode: "PARTNER",
	companyId: null,
	companyProfile: null,
};

export default function CompanyProfilesPage() {
	const methods = useForm<CompanyProfileFormValues>({
		defaultValues,
		mode: "onBlur",
	});

	return (
		<FormProvider {...methods}>
			<CompanyProfilesPageInner />
		</FormProvider>
	);
}

function CompanyProfilesPageInner() {
	const serviceId = useWatch<CompanyProfileFormValues, "serviceId">({ name: "serviceId" });
	const companyType = useWatch<CompanyProfileFormValues, "companyType">({ name: "companyType" });
	const colocationMode = useWatch<CompanyProfileFormValues, "colocationMode">({ name: "colocationMode" });
	const companyId = useWatch<CompanyProfileFormValues, "companyId">({ name: "companyId" });
	const services = useQuery(servicesQuery());
	const serviceCode = String(services.data?.results.find(item => item.id === serviceId)?.code ?? "").trim().toLowerCase();
	const isDatacenterMode = colocationMode === "DATACENTER";
	const [profileRevision, setProfileRevision] = useState(0);

	return (
		<div>
			<div className="w-full grid grid-cols-1 ">
				{/* ✅ کارت یکپارچه سرویس + شرکت + لود پروفایل */}
				<div>
					<ServiceCompanyLoaderSection onCompanyDataCopied={() => setProfileRevision(current => current + 1)} />
				</div>

				{/* کارت قراردادهای شرکت (در حالت دیتاسنتر غیرفعال است) */}
				{companyId && serviceId && !isDatacenterMode && (
					<CompanyContractsCard
						serviceId={serviceId}
						serviceCode={serviceCode}
						companyType={companyType}
						companyId={companyId}
					/>
				)}
			</div>

			{/* آکاردئون فقط وقتی company انتخاب شد */}
			{companyId && (
				<div className="mt-4">
					{isDatacenterMode
						? <p className="text-center">در این حالت فقط عملیات ایجاد، ویرایش و حذف نام دیتاسنتر فعال است.</p>
						: <CompanyProfileAccordion revision={profileRevision} />}
				</div>
			)}
		</div>
	);
}
