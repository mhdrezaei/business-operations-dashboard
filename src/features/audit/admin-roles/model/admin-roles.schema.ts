import { z } from "zod";

export const adminRoleScopeValues = ["global", "service_admin"] as const;
export const adminRoleDomainValues = ["contracts", "performances", "predictions", "company_profile"] as const;
export const adminRolePermissionActionValues = ["view", "create", "update", "delete"] as const;

export const adminRoleScopeOptions = [
	{ label: "سراسری", value: "global" },
	{ label: "ادمین سرویس", value: "service_admin" },
] as const;

export const adminRolePermissionTabs = [
	{ label: "قراردادها", value: "contracts" },
	{ label: "عملکردها", value: "performances" },
	{ label: "پیش‌بینی‌ها", value: "predictions" },
	{ label: "پروفایل شرکت", value: "company_profile" },
] as const;

export const adminRolePermissionActions = [
	{ label: "مشاهده", value: "view" },
	{ label: "ایجاد", value: "create" },
	{ label: "ویرایش", value: "update" },
	{ label: "حذف", value: "delete" },
] as const;

export const companyProfileCardOptions = [
	{ code: "company_public_profiles", label: "اطلاعات عمومی شرکت" },
	{ code: "company_internal_profiles", label: "اطلاعات داخلی" },
	{ code: "company_people", label: "لیست اشخاص کلیدی" },
	{ code: "company_documents", label: "لیست مدارک" },
	{ code: "company_legal_profiles", label: "اطلاعات ثبتی و حقوقی" },
	{ code: "company_finance_profiles", label: "اطلاعات مالی" },
	{ code: "company_shareholders", label: "سهام‌داران کلیدی" },
	{ code: "company_bank_accounts", label: "حساب‌های بانکی" },
] as const;

export const trafficCompanyTypes = ["CP", "IXP", "TCI", "PREMIUM"] as const;

export function normalizeAdminRoleValue(value: unknown): any {
	if (value === undefined || value === null)
		return null;
	if (typeof value === "string")
		return value.trim();
	if (typeof value === "number" || typeof value === "boolean")
		return value;
	if (Array.isArray(value))
		return value.map(normalizeAdminRoleValue);
	if (value instanceof Date)
		return value.toISOString();
	if (typeof value === "object") {
		return Object.keys(value as Record<string, unknown>)
			.sort()
			.reduce<Record<string, any>>((result, key) => {
				result[key] = normalizeAdminRoleValue((value as Record<string, unknown>)[key]);
				return result;
			}, {});
	}
	return String(value).trim();
}

export function mergeAdminRoleValues(
	initial: AdminRoleFormValues,
	current: Partial<AdminRoleFormValues> | undefined,
): AdminRoleFormValues {
	const definedCurrentValues = Object.fromEntries(
		Object.entries(current ?? {}).filter(([, value]) => value !== undefined),
	) as Partial<AdminRoleFormValues>;

	return {
		...initial,
		...definedCurrentValues,
	};
}

export function getComparableAdminRoleString(values: AdminRoleFormValues): string {
	return JSON.stringify(normalizeAdminRoleValue(values));
}

export const adminRoleUpsertSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "نام نقش الزامی است."),
	description: z.string().trim(),
});

export type AdminRoleFormValues = z.output<typeof adminRoleUpsertSchema>;
export type AdminRoleDomainKey = typeof adminRoleDomainValues[number];
export type AdminRolePermissionAction = typeof adminRolePermissionActionValues[number];
