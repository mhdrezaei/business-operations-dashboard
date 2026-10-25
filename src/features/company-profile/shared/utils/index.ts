function normalizeCompanyTypeToken(value: unknown): string | null {
	if (typeof value !== "string")
		return null;
	const normalized = value.trim().toUpperCase();
	return normalized || null;
}

function toCompanyTypeTokens(value: unknown): string[] {
	if (value == null)
		return [];

	if (typeof value === "string") {
		const normalized = normalizeCompanyTypeToken(value);
		return normalized ? [normalized] : [];
	}

	if (typeof value === "object" && !Array.isArray(value)) {
		const obj = value as Record<string, unknown>;
		const keyTokens = Object.keys(obj)
			.map(item => normalizeCompanyTypeToken(item))
			.filter((item): item is string => Boolean(item));
		const valueTokens = Object.values(obj)
			.map(item => normalizeCompanyTypeToken(item))
			.filter((item): item is string => Boolean(item));
		return Array.from(new Set([...keyTokens, ...valueTokens]));
	}

	return [];
}

export function companyTypeMatches(companyType: unknown, selectedType: string | null | undefined): boolean {
	const selected = normalizeCompanyTypeToken(selectedType);
	if (!selected)
		return false;
	return toCompanyTypeTokens(companyType).includes(selected);
}

const COMPANY_TYPE_SERVICE_CODES = new Set(["traffic", "psp", "sms"]);

export function serviceRequiresCompanyType(serviceCode: unknown): boolean {
	return COMPANY_TYPE_SERVICE_CODES.has(String(serviceCode ?? "").trim().toLowerCase());
}

export function isSmsCommissionServiceCode(serviceCode: unknown): boolean {
	return String(serviceCode ?? "").trim().toLowerCase().replace("-", "_") === "sms_commission";
}

/** برای این سرویس‌ها BE هنگام ایجاد شرکت `company_type` را الزامی می‌داند (old: CompaniesNewPage). */
export function serviceRequiresCompanyTypeOnCreate(serviceCode: unknown): boolean {
	const code = String(serviceCode ?? "").trim().toLowerCase();
	return serviceRequiresCompanyType(code) || code === "telecom_frame" || code === "sales_agency";
}

/** کلید نوع شرکت؛ BE گاهی رشته و گاهی `{کلید: برچسب}` برمی‌گرداند. */
export function companyTypeKey(companyType: string | Record<string, string> | null | undefined): string | null {
	if (!companyType)
		return null;
	return typeof companyType === "string" ? companyType : Object.keys(companyType)[0] ?? null;
}
