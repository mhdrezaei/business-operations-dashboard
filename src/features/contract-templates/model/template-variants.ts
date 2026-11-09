export const SMS_TEMPLATE_VARIANT = "sms_client";

export const OPENAPI_VARIANT_OPTIONS = [
	{ value: "openapi_legacy", label: "قدیمی" },
	{ value: "openapi_legacy_2", label: "تفکیکی" },
];

/** Services whose template must carry an explicit variant; every other service sends none. */
export const VARIANT_REQUIRED_SERVICES = ["sms", "openapi"];

/** Services whose template needs a company type: the backend variable catalog is resolved per type. */
export const COMPANY_TYPE_REQUIRED_SERVICES = ["traffic", "psp"];

/** Company types the backend variable catalog (tag-values) does not support, so a template for them could never be printed or signed. */
export const UNSUPPORTED_TEMPLATE_COMPANY_TYPES: Record<string, string[]> = {
	traffic: ["COLLOCATION"],
	psp: ["IVR"],
};

export function isUnsupportedTemplateCompanyType(service: string | null | undefined, companyType: string | null | undefined) {
	return Boolean(service && companyType && UNSUPPORTED_TEMPLATE_COMPANY_TYPES[service]?.includes(String(companyType).toUpperCase()));
}

export const TEMPLATE_DOCUMENT_KIND_OPTIONS = [
	{ label: "اصل قرارداد", value: "contract" },
	{ label: "الحاقیه", value: "addendum" },
];

export const TEMPLATE_VARIANT_LABELS: Record<string, string> = {
	...Object.fromEntries(OPENAPI_VARIANT_OPTIONS.map(option => [option.value, option.label])),
	sms_client: "مشتری",
	sms_vendor: "فروشنده",
};

const OPENAPI_VARIANT_BY_CONTRACT_MODEL: Record<string, string> = {
	LEGACY: "openapi_legacy",
	LEGACY_2: "openapi_legacy_2",
};

/**
 * Variant a template must carry to fit the contract, or null when it cannot be derived
 * (the backend does not filter templates by variant, and tag-values accepts a mismatched one).
 * An openapi addendum may use another model than its base contract, so only base contracts are matched.
 */
export function getExpectedTemplateVariant(servicePath: string, contractModel: unknown, isAddendum: boolean): string | null {
	const [service, party] = servicePath.split("/");
	if (service === "sms" && party)
		return `sms_${party}`;
	if (service === "openapi" && !isAddendum)
		return OPENAPI_VARIANT_BY_CONTRACT_MODEL[String(contractModel)] ?? null;
	return null;
}
