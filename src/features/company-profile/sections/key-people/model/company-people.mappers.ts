// src/features/company-profile/sections/key-people/model/company-people.mappers.ts
import type { CompanyPersonDto, CompanyPersonFormValues } from "./company-people.types";

export function dtoToCompanyPersonForm(dto: CompanyPersonDto): CompanyPersonFormValues {
	return {
		role: dto.role ?? null,
		full_name: dto.full_name ?? "",
		is_signatory: !!dto.is_signatory,
		national_id: dto.national_id ?? "",
		title: dto.title ?? "",
		phone: dto.phone ?? "",
		email: dto.email ?? "",
	};
}

export function companyPersonFormToPayload(
	companyId: number,
	serviceId: number,
	values: CompanyPersonFormValues,
): Partial<CompanyPersonDto> {
	return {
		company: companyId,
		service: serviceId,
		role: values.role ?? "OTHER",
		full_name: values.full_name.trim(),
		is_signatory: !!values.is_signatory,
		national_id: values.national_id.trim() || null,
		title: values.title.trim() || null,
		phone: values.phone.trim() || null,
		email: values.email.trim() || null,
	};
}
