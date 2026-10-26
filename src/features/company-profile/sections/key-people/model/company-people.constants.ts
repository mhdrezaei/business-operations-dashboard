import type { CompanyPersonGender, CompanyPersonRole } from "./company-people.types";

export const COMPANY_PERSON_ROLE_OPTIONS: Array<{ label: string, value: CompanyPersonRole }> = [
	{ label: "مدیرعامل", value: "CEO" },
	{ label: "هیئت رئیسه", value: "BOARD" },
	{ label: "نماینده", value: "REPRESENTATIVE" },
	{ label: "واحد مالی/حسابداری", value: "FINANCE" },
	{ label: "امور قراردادها", value: "CONTRACTS" },
	{ label: "تجاری", value: "COMMERCIAL" },
	{ label: "سایر", value: "OTHER" },
];

export const COMPANY_PERSON_GENDER_OPTIONS: Array<{ label: string, value: CompanyPersonGender }> = [
	{ label: "آقا", value: "MALE" },
	{ label: "خانم", value: "FEMALE" },
];

const ROLE_SLOT_GROUP_LABELS: Record<string, string> = {
	signatories: "گروه صاحبان امضا",
	signatory: "گروه صاحبان امضا",
	board_members: "گروه هیئت‌مدیره",
	board_member: "گروه هیئت‌مدیره",
};

export function getRoleSlotGroupLabel(value: string | null | undefined) {
	const normalized = value?.trim() ?? "";
	return ROLE_SLOT_GROUP_LABELS[normalized.toLowerCase()] ?? normalized;
}

export const COMPANY_PEOPLE_ORDERING_OPTIONS: Array<{ label: string, value: string }> = [
	{ label: "جدیدترین", value: "-id" },
	{ label: "قدیمی‌ترین", value: "id" },
	{ label: "نام (صعودی)", value: "full_name" },
	{ label: "نام (نزولی)", value: "-full_name" },
	{ label: "نقش (صعودی)", value: "role" },
	{ label: "نقش (نزولی)", value: "-role" },
];
