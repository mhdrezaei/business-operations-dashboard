import { i18n } from "#src/locales";

/** Services whose company types have a dedicated label; others (traffic, telecom_frame, …) show the raw value. */
const LABELED_SERVICES = new Set(["sms", "psp", "sales_agency"]);

export function companyTypeLabel(serviceCode: string | null | undefined, companyType: string | null | undefined) {
	if (!companyType)
		return companyType ?? null;
	if (!serviceCode || !LABELED_SERVICES.has(serviceCode))
		return companyType;
	const key = `dashboard.companyTypes.${serviceCode}.${String(companyType).trim().toUpperCase()}`;
	return i18n.exists(key) ? i18n.t(key) : companyType;
}

/** "Service – total" / "Service (type)" label of a service row. */
export function serviceTypeLabel(row: { service_code: string, service_name: string | null }, companyType: string | null) {
	const name = row.service_name || row.service_code;
	return companyType ? `${name} (${companyTypeLabel(row.service_code, companyType)})` : name;
}

/** Type shown for a list row: the contract's own type when known, else the company type. */
export function rowCompanyType(row: { company_type: string | null, contract_company_type?: string | null }) {
	return row.contract_company_type ?? row.company_type;
}
