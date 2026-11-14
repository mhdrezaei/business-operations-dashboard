/** Company types whose county (مراکز استان) performance is optional: it may be omitted or removed. */
const COUNTY_OPTIONAL_COMPANY_TYPES = ["CP", "IXP", "PREMIUM", "TCI"];

export function isCountyOptionalCompanyType(companyType: unknown) {
	return typeof companyType === "string" && COUNTY_OPTIONAL_COMPANY_TYPES.includes(companyType.trim().toUpperCase());
}
