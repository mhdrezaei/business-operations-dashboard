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
