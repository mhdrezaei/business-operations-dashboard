export function findFirstError(errs: any, path: string[] = []): { message: string, path: string[] } | null {
	if (!errs)
		return null;
	if (errs.message)
		return { path, message: errs.message as string };

	for (const key of Object.keys(errs)) {
		const child = errs[key];
		const res = findFirstError(child, [...path, key]);
		console.warn(res, "aaaaaaaaaa");
		if (res)
			return res;
	}
	return null;
}

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
			.map(token => normalizeCompanyTypeToken(token))
			.filter((token): token is string => Boolean(token));
		const valueTokens = Object.values(obj)
			.map(token => normalizeCompanyTypeToken(token))
			.filter((token): token is string => Boolean(token));
		return Array.from(new Set([...keyTokens, ...valueTokens]));
	}

	return [];
}

export function pickCompanyTypeToken(companyType: unknown): string | null {
	const [first] = toCompanyTypeTokens(companyType);
	return first ?? null;
}

export function companyTypeMatches(companyType: unknown, selectedType: string | null | undefined): boolean {
	const selectedToken = normalizeCompanyTypeToken(selectedType);
	if (!selectedToken)
		return false;

	return toCompanyTypeTokens(companyType).includes(selectedToken);
}
