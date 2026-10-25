import type { CompanyPersonContactItem, CompanyPersonDto, CompanyPersonFormValues, CompanyPersonPayload } from "./company-people.types";

function normalizeMultiValue(value: string[] | string | null | undefined): CompanyPersonContactItem[] {
	if (Array.isArray(value)) {
		return value
			.map(item => item?.trim() ?? "")
			.filter(Boolean)
			.map(item => ({ value: item }));
	}

	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed ? [{ value: trimmed }] : [];
	}

	return [];
}

function cleanMultiValue(values: CompanyPersonContactItem[]): string[] {
	return values.map(({ value }) => value.trim()).filter(Boolean);
}

export function dtoToCompanyPersonForm(dto: CompanyPersonDto): CompanyPersonFormValues {
	return {
		role: dto.role ?? null,
		full_name: dto.full_name ?? "",
		is_signatory: !!dto.is_signatory,
		national_id: dto.national_id ?? "",
		title: dto.title ?? "",
		gender: dto.gender ?? null,
		official_gazette_number: dto.official_gazette_number ?? "",
		official_gazette_date: dto.official_gazette_date ?? "",
		phone: normalizeMultiValue(dto.phone),
		email: normalizeMultiValue(dto.email),
	};
}

export function companyPersonFormToPayload(
	companyId: number,
	serviceId: number,
	values: CompanyPersonFormValues,
	contractOrder: number | null = null,
): CompanyPersonPayload {
	return {
		company: companyId,
		service: serviceId,
		role: values.role ?? "OTHER",
		full_name: values.full_name.trim(),
		is_signatory: !!values.is_signatory,
		national_id: values.national_id.trim(),
		title: values.title.trim(),
		gender: values.gender ?? null,
		phone: cleanMultiValue(values.phone),
		email: cleanMultiValue(values.email),
		official_gazette_number: values.official_gazette_number.trim() || null,
		official_gazette_date: values.official_gazette_date || null,
		contract_order: contractOrder,
	};
}

export function companyPersonDtoToPayload(
	dto: CompanyPersonDto,
	serviceId: number,
	contractOrder: number | null,
): CompanyPersonPayload {
	return {
		company: dto.company,
		service: serviceId,
		role: dto.role,
		full_name: dto.full_name,
		national_id: dto.national_id ?? "",
		title: dto.title ?? "",
		gender: dto.gender ?? null,
		phone: dto.phone ?? [],
		email: dto.email ?? [],
		is_signatory: dto.is_signatory,
		official_gazette_number: dto.official_gazette_number ?? null,
		official_gazette_date: dto.official_gazette_date ?? null,
		contract_order: contractOrder,
	};
}
