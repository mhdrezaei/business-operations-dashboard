// src/features/company-profile/sections/key-people/model/company-people.mappers.ts
import type { CompanyPersonDto, CompanyPersonFormValues } from "./company-people.types";

function splitMulti(v: unknown): string[] {
	if (v == null)
		return [];
	if (Array.isArray(v)) {
		return v.map(x => (x == null ? "" : String(x)).trim()).filter(Boolean);
	}
	const s = typeof v === "string" ? v : String(v);
	return s.split(/\n|,/g).map(x => x.trim()).filter(Boolean);
}

function joinMulti(arr: string[]) {
	const cleaned = (arr ?? []).map(x => x.trim()).filter(Boolean);
	return cleaned.length ? cleaned.join("\n") : null;
}

export function dtoToCompanyPersonForm(dto: CompanyPersonDto): CompanyPersonFormValues {
	return {
		role: dto.role ?? null,
		full_name: dto.full_name ?? "",
		is_signatory: !!dto.is_signatory,
		national_id: dto.national_id ?? "",
		title: dto.title ?? "",
		phone: splitMulti(dto.phone),
		email: splitMulti(dto.email),
	};
}

export function companyPersonFormToPayload(
	companyId: number,
	values: CompanyPersonFormValues,
): Partial<CompanyPersonDto> {
	return {
		company: companyId,
		role: values.role ?? "OTHER",
		full_name: values.full_name.trim(),
		is_signatory: !!values.is_signatory,
		national_id: values.national_id.trim() || null,
		title: values.title.trim() || null,
		phone: joinMulti(values.phone),
		email: joinMulti(values.email),
	};
}
