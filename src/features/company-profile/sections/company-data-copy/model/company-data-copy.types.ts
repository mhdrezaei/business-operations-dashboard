import type {
	FinanceProfileDto,
	InternalProfileDto,
	LegalProfileDto,
	PublicProfileDto,
} from "../../../api/company-profile.api";
import type { BankAccountDto } from "../../bank-accounts/model/bank-accounts.types";
import type { CompanyPersonDto } from "../../key-people/model/company-people.types";
import type { ShareholderDto } from "../../shareholders/model/shareholders.types";

export const COMPANY_COPY_SECTION_KEYS = [
	"public",
	"legal",
	"finance",
	"internal",
	"people",
	"bankAccounts",
	"shareholders",
] as const;

export type CompanyCopySectionKey = typeof COMPANY_COPY_SECTION_KEYS[number];

export const COMPANY_COPY_SECTION_LABELS: Record<CompanyCopySectionKey, string> = {
	public: "اطلاعات عمومی شرکت",
	legal: "اطلاعات ثبتی و حقوقی",
	finance: "اطلاعات مالی",
	internal: "اطلاعات داخلی",
	people: "اشخاص کلیدی",
	bankAccounts: "حساب‌های بانکی",
	shareholders: "سهام‌داران کلیدی",
};

export interface CompanyDataSnapshot {
	public: PublicProfileDto | null
	legal: LegalProfileDto | null
	finance: FinanceProfileDto | null
	internal: InternalProfileDto | null
	people: CompanyPersonDto[]
	bankAccounts: BankAccountDto[]
	shareholders: ShareholderDto[]
}

export interface CompanyCopyEndpoint {
	companyId: number
	serviceId: number
}

export interface CopyCompanyDataParams {
	source: CompanyCopyEndpoint
	destination: CompanyCopyEndpoint
	sections: CompanyCopySectionKey[]
}
