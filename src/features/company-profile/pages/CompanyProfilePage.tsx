import type { CompanyProfileFormValues } from "../model/company-profile.form.types";
import React from "react";

import { FormProvider, useForm, useWatch } from "react-hook-form";
import CompanyProfileAccordion from "../shared/ui/CompanyProfileAccordion";
import { ServiceCompanyLoaderSection } from "../shared/ui/ServiceCompanyLoaderSection";

const defaultValues: CompanyProfileFormValues = {
	serviceId: null,
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

	return (
		<div>
			<div className="w-full grid grid-cols-1 ">
				{/* کارت قراردادهای شرکت (بعدا) */}
				<div />

				{/* ✅ کارت یکپارچه سرویس + شرکت + لود پروفایل */}
				<div>
					<ServiceCompanyLoaderSection />
				</div>
			</div>

			{/* آکاردئون فقط وقتی company انتخاب شد */}
			{companyId
				? (
					<div style={{ marginTop: 16 }}>
						<CompanyProfileAccordion />
					</div>
				)
				: (
					<div style={{ marginTop: 16, opacity: 0.8 }}>
						راهنما: ابتدا سرویس و سپس شرکت را انتخاب کنید.
					</div>
				)}
		</div>
	);
}
