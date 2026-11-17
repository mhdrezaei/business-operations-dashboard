/** Selection of the performance edit workspace, mirrored in the URL so a refresh restores it. */
export interface PerformanceEditSelection {
	serviceId: number | null
	serviceCode: string | null
	companyType: string | null
	companyId: number | null
	year: number | null
	month: number | null
}

export const EMPTY_PERFORMANCE_EDIT_SELECTION: PerformanceEditSelection = {
	serviceId: null,
	serviceCode: null,
	companyType: null,
	companyId: null,
	year: null,
	month: null,
};

function toPositiveInt(value: string | null) {
	const number = Number(value);
	return value && Number.isInteger(number) && number > 0 ? number : null;
}

const toText = (value: string | null) => value?.trim() || null;

export function parsePerformanceEditSelection(search: string): PerformanceEditSelection {
	const params = new URLSearchParams(search);
	const serviceId = toPositiveInt(params.get("serviceId"));
	if (serviceId == null)
		return EMPTY_PERFORMANCE_EDIT_SELECTION;

	return {
		serviceId,
		serviceCode: toText(params.get("service")),
		companyType: toText(params.get("companyType")),
		companyId: toPositiveInt(params.get("companyId")),
		year: toPositiveInt(params.get("year")),
		month: toPositiveInt(params.get("month")),
	};
}

/** Query string ("?a=b" or "") for the selection; nothing is written until a service is chosen. */
export function buildPerformanceEditSearch(selection: PerformanceEditSelection): string {
	if (selection.serviceId == null)
		return "";

	const params = new URLSearchParams({ serviceId: String(selection.serviceId) });
	const optional: Array<[string, string | number | null]> = [
		["service", selection.serviceCode],
		["companyType", selection.companyType],
		["companyId", selection.companyId],
		["year", selection.year],
		["month", selection.month],
	];
	optional.forEach(([key, value]) => {
		if (value != null && value !== "")
			params.set(key, String(value));
	});
	return `?${params.toString()}`;
}
