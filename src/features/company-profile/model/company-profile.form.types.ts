import type { CompanyInfoFormValues } from "../sections/company-info/model/company-info.types";

export interface CompanyProfileFormValues {
	serviceId: number | null
	companyId: number | null

	// داده بخش اول آکاردئون (پروفایل شرکت)
	companyProfile: CompanyInfoFormValues | null

	// بعداً:
	// keyPeople: ...
	// shareholders: ...
	// bankAccounts: ...
	// documents: ...
}
