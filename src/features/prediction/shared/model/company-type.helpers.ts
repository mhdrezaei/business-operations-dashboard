export function normalizeCompanyTypeToken(value: unknown): string | null {
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
		const raw = value as Record<string, unknown>;
		const keyTokens = Object.keys(raw)
			.map(token => normalizeCompanyTypeToken(token))
			.filter((token): token is string => Boolean(token));
		const valueTokens = Object.values(raw)
			.map(token => normalizeCompanyTypeToken(token))
			.filter((token): token is string => Boolean(token));

		return Array.from(new Set([...keyTokens, ...valueTokens]));
	}

	return [];
}

export function getCompanyTypeToken(value: unknown): string | null {
	return toCompanyTypeTokens(value)[0] ?? null;
}

export function companyTypeMatches(companyType: unknown, selectedType: string | null | undefined): boolean {
	const selectedToken = normalizeCompanyTypeToken(selectedType);
	if (!selectedToken)
		return false;

	return toCompanyTypeTokens(companyType).includes(selectedToken);
}
