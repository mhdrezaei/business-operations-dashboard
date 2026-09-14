import type { PerformanceServiceCode } from "./performance.form.types";

const UNREGISTERED_SOURCE = "unregistered";

export interface UnregisteredPerformancePreset {
	serviceId: number
	serviceCode: PerformanceServiceCode
	companyId: number
	companyType: string | null
	salesAgentId: number | null
	year: number
	month: number
}

function readPositiveInteger(params: URLSearchParams, key: string) {
	const value = Number(params.get(key));
	return Number.isInteger(value) && value > 0 ? value : null;
}

export function buildUnregisteredPerformanceSearch(
	preset: UnregisteredPerformancePreset,
	sourceKey: string,
) {
	const params = new URLSearchParams({
		source: UNREGISTERED_SOURCE,
		service_id: String(preset.serviceId),
		service_code: String(preset.serviceCode),
		company_id: String(preset.companyId),
		sh_year: String(preset.year),
		sh_month: String(preset.month),
		source_key: sourceKey,
	});

	if (preset.companyType)
		params.set("company_type", preset.companyType);
	if (preset.salesAgentId)
		params.set("sales_agent_id", String(preset.salesAgentId));

	return `?${params.toString()}`;
}

export function parseUnregisteredPerformanceSearch(search: string): UnregisteredPerformancePreset | null {
	const params = new URLSearchParams(search);
	if (params.get("source") !== UNREGISTERED_SOURCE)
		return null;

	const serviceId = readPositiveInteger(params, "service_id");
	const companyId = readPositiveInteger(params, "company_id");
	const year = readPositiveInteger(params, "sh_year");
	const month = readPositiveInteger(params, "sh_month");
	const serviceCode = params.get("service_code")?.trim().toLowerCase() ?? "";
	if (!serviceId || !companyId || !year || !month || month > 12 || !serviceCode)
		return null;

	return {
		serviceId,
		serviceCode: serviceCode as PerformanceServiceCode,
		companyId,
		companyType: params.get("company_type")?.trim().toUpperCase() || null,
		salesAgentId: readPositiveInteger(params, "sales_agent_id"),
		year,
		month,
	};
}
