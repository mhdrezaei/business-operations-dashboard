import type { ShareholderDto, ShareholderFormValues } from "./shareholders.types";

export const emptyShareholderValues: ShareholderFormValues = {
	full_name: "",
	national_id: "",
	ownership_percent: "",
	note: "",
};

export function dtoToShareholderForm(dto: ShareholderDto): ShareholderFormValues {
	return {
		full_name: dto.full_name ?? "",
		national_id: dto.national_id ?? "",
		ownership_percent: dto.ownership_percent ?? "",
		note: dto.note ?? "",
	};
}

export function shareholderFormToPayload(
	values: ShareholderFormValues,
	meta: { service: number, company: number },
) {
	const ownership = values.ownership_percent.trim();
	return {
		service: meta.service,
		company: meta.company,
		full_name: values.full_name.trim(),
		national_id: values.national_id.trim() || "",
		ownership_percent: ownership || "-",
		note: values.note.trim() || "",
	};
}
