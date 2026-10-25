import type { CompanyInfoFormValues } from "../sections/company-info/model/company-info.types";

export type ColocationMode = "PARTNER" | "DATACENTER";

export interface CompanyProfileFormValues {
	serviceId: number | null
	companyType: string | null
	/** کولوکیشن ترافیک: شریک تجاری یا دیتاسنتر (در حالت دیتاسنتر companyId شناسه دیتاسنتر است). */
	colocationMode: ColocationMode
	companyId: number | null

	companyProfile: CompanyInfoFormValues | null

}
