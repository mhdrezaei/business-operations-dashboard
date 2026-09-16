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
		national_id: values.national_id.trim() || null,
		title: values.title.trim() || null,
		phone: cleanMultiValue(values.phone),
		email: cleanMultiValue(values.email),
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
		national_id: dto.national_id,
		title: dto.title,
		phone: dto.phone ?? [],
		email: dto.email ?? [],
		is_signatory: dto.is_signatory,
		contract_order: contractOrder,
	};
}
