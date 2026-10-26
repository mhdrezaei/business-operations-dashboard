/** بدنهٔ PUT تغییر نام؛ BE روی PUT هم `company_type` را اعتبارسنجی می‌کند، پس همیشه فرستاده می‌شود. */
export function buildCompanyRenamePayload(name: string, serviceId: number, companyType: string | null) {
	return { name: name.trim(), service: serviceId, company_type: companyType };
}
