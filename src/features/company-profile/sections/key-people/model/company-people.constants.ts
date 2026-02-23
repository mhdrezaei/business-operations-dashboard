import type { CompanyPersonRole } from "./company-people.types";

export const COMPANY_PERSON_ROLE_OPTIONS: Array<{ label: string, value: CompanyPersonRole }> = [
	{ label: "هیئت رئیسه", value: "BOARD" },
	{ label: "مدیرعامل", value: "CEO" },
	{ label: "تجاری", value: "COMMERCIAL" },
	{ label: "امور قراردادها", value: "CONTRACTS" },
	{ label: "واحد مالی/حسابداری", value: "FINANCE" },
	{ label: "سایر", value: "OTHER" },
	{ label: "نماینده", value: "REPRESENTATIVE" },
];

export const COMPANY_PEOPLE_ORDERING_OPTIONS: Array<{ label: string, value: string }> = [
	{ label: "جدیدترین", value: "-id" },
	{ label: "قدیمی‌ترین", value: "id" },
	{ label: "نام (صعودی)", value: "full_name" },
	{ label: "نام (نزولی)", value: "-full_name" },
	{ label: "نقش (صعودی)", value: "role" },
	{ label: "نقش (نزولی)", value: "-role" },
];
