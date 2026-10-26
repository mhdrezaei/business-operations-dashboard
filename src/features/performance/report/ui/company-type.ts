import type { ReportSelectOption } from "./constants";
import { pickCompanyTypeToken } from "#src/features/performance/shared/model/performance.helpers";

export const ALL_COMPANY_TYPES = "__all__";

export function normalizeCompanyTypeFilter(value: unknown) {
	const values = (Array.isArray(value) ? value : [value])
		.map(item => String(item ?? "").trim())
		.filter(item => item && item !== ALL_COMPANY_TYPES);
	return values.length > 0 ? Array.from(new Set(values)).join(",") : undefined;
}

export function hasCompanyTypeSelection(value: unknown) {
	return Array.isArray(value) ? value.length > 0 : !!value;
}

export function isOnlyCompanyType(value: unknown, expectedType: string) {
	const values = Array.isArray(value) ? value : String(value ?? "").split(",");
	const normalizedValues = values.map(item => String(item).trim().toUpperCase()).filter(Boolean);
	return normalizedValues.length === 1 && normalizedValues[0] === expectedType.trim().toUpperCase();
}

/** CP/IXP/TCI/PREMIUM rows carry contract units; only COLLOCATION opts out of raw_values / conversion ratio. */
export function isUnitConversionCompanyType(value: unknown) {
	const values = (Array.isArray(value) ? value : String(value ?? "").split(","))
		.map(item => String(item).trim().toUpperCase())
		.filter(Boolean);
	return values.length > 0 && !values.includes("COLLOCATION");
}

export function hasMixedCompanyTypeIncluding(value: unknown, expectedType: string) {
	const values = Array.isArray(value) ? value : String(value ?? "").split(",");
	const normalizedValues = values.map(item => String(item).trim().toUpperCase()).filter(Boolean);
	return normalizedValues.length > 1 && normalizedValues.includes(expectedType.trim().toUpperCase());
}

export function getReportCompanyTypeLabel(companyType: unknown, companyTypeOptions: ReportSelectOption[]) {
	if (companyType && typeof companyType === "object" && !Array.isArray(companyType)) {
		const [responseLabel] = Object.values(companyType as Record<string, unknown>)
			.map(value => String(value ?? "").trim())
			.filter(Boolean);
		if (responseLabel)
			return responseLabel;
	}

	const companyTypeKey = pickCompanyTypeToken(companyType);
	if (!companyTypeKey)
		return "-";
	return companyTypeOptions.find(option => String(option.value) === companyTypeKey)?.label ?? companyTypeKey;
}
