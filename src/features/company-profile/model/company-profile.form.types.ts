import type { CompanyInfoFormValues } from "../sections/company-info/model/company-info.types";

export interface CompanyProfileFormValues {
	serviceId: number | null
	companyId: number | null

	companyProfile: CompanyInfoFormValues | null

}
