import type { CompanyProfileFormValues } from "../model/company-profile.form.types";
import React, { useState } from "react";

import { FormProvider, useForm, useWatch } from "react-hook-form";
import CompanyProfileAccordion from "../shared/ui/CompanyProfileAccordion";
import { ServiceCompanyLoaderSection } from "../shared/ui/ServiceCompanyLoaderSection";

const defaultValues: CompanyProfileFormValues = {
	serviceId: null,
	companyType: null,
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
	const companyId = useWatch<CompanyProfileFormValues, "companyId">({ name: "companyId" });
	const [profileRevision, setProfileRevision] = useState(0);

	return (
		<div>
			<div className="w-full grid grid-cols-1 ">
				{/* کارت قراردادهای شرکت (بعدا) */}
				<div />

				{/* ✅ کارت یکپارچه سرویس + شرکت + لود پروفایل */}
				<div>
					<ServiceCompanyLoaderSection onCompanyDataCopied={() => setProfileRevision(current => current + 1)} />
				</div>
			</div>

			{/* آکاردئون فقط وقتی company انتخاب شد */}
			{companyId && (
				<div className="mt-4">
					<CompanyProfileAccordion revision={profileRevision} />
				</div>
			)}
		</div>
	);
}
