import type { CompanyInfoFormValues, CompanyProfileDto, SocialLinkItem } from "./company-info.types";

function splitMulti(v: unknown): string[] {
	if (v == null)
		return [];

	if (Array.isArray(v)) {
		return v
			.map(x => (x == null ? "" : String(x)).trim())
			.filter(Boolean);
	}

	const s = typeof v === "string" ? v : String(v);

	return s
		.split(/\n|,/g)
		.map(x => x.trim())
		.filter(Boolean);
}

function joinMulti(arr: string[]) {
	const cleaned = arr.map(x => x.trim()).filter(Boolean);
	return cleaned.length ? cleaned.join("\n") : null;
}

function parseSocialLinks(raw: string | null): SocialLinkItem[] {
	if (!raw)
		return [];
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	}
	catch {
		return [];
	}
}

function serializeSocialLinks(items: SocialLinkItem[]): string | null {
	const cleaned = items
		.map(i => ({ label: i.label.trim(), url: i.url.trim() }))
		.filter(i => i.label && i.url);
	return cleaned.length ? JSON.stringify(cleaned) : null;
}

export const emptyCompanyInfoValues: CompanyInfoFormValues = {
	service: 0,
	company: 0,
	legal_name: "",
	brand_name: "",
	national_id: "",
	tax_national_id: "",
	legal_person_type: null,

	registration_number: "",
	tax_registration_number: "",
	registration_place: "",
	registration_date: null,
	branch_code: "",

	legal_address: "",
	postal_code: "",

	map_address: "",
	map_latitude: "",
	map_longitude: "",

	phone: [],
	mobile: [],
	fax: [],
	email: [],

	website: "",

	economic_code: "",
	tax_file_number: "",
	vat_status: null,
	tax_office: "",

	cooperation_start_date: null,
	cooperation_status: null,

	financial_commitment_cap: "",
	settlement_term: null,
	working_hours: "",

	social_links: [],

	internal_code: "",
	internal_note: "",
	info_verification_status: null,
};

export function dtoToCompanyInfoForm(dto: CompanyProfileDto, meta: { serviceId?: number, companyId: number }): CompanyInfoFormValues {
	return {
		service: meta.serviceId || 0,
		company: meta.companyId,
		legal_name: dto.legal_name ?? "",
		brand_name: dto.brand_name ?? "",
		national_id: dto.national_id ?? "",
		tax_national_id: dto.tax_national_id ?? "",
		legal_person_type: dto.legal_person_type ?? null,

		registration_number: dto.registration_number ?? "",
		tax_registration_number: dto.tax_registration_number ?? "",
		registration_place: dto.registration_place ?? "",
		registration_date: dto.registration_date ?? null,
		branch_code: dto.branch_code ?? "",

		legal_address: dto.legal_address ?? "",
		postal_code: dto.postal_code ?? "",

		map_address: dto.map_address ?? "",
		map_latitude: dto.map_latitude ?? "",
		map_longitude: dto.map_longitude ?? "",

		phone: splitMulti(dto.phone),
		mobile: splitMulti(dto.mobile),
		fax: splitMulti(dto.fax),
		email: splitMulti(dto.email),

		website: dto.website ?? "",

		economic_code: dto.economic_code ?? "",
		tax_file_number: dto.tax_file_number ?? "",
		vat_status: dto.vat_status ?? null,
		tax_office: dto.tax_office ?? "",

		cooperation_start_date: dto.cooperation_start_date ?? null,
		cooperation_status: dto.cooperation_status ?? null,

		financial_commitment_cap: dto.financial_commitment_cap ?? "",
		settlement_term: dto.settlement_term ?? null,
		working_hours: dto.working_hours ?? "",

		social_links: parseSocialLinks(dto.social_links),

		internal_code: dto.internal_code ?? "",
		internal_note: dto.internal_note ?? "",
		info_verification_status: dto.info_verification_status ?? null,
	};
}

export function companyInfoFormToPayload(values: CompanyInfoFormValues): Partial<CompanyProfileDto> {
	return {
		legal_name: values.legal_name.trim() || null,
		brand_name: values.brand_name.trim() || null,
		national_id: values.national_id.trim() || null,
		tax_national_id: values.tax_national_id.trim() || null,
		legal_person_type: values.legal_person_type ?? null,

		registration_number: values.registration_number.trim() || null,
		tax_registration_number: values.tax_registration_number.trim() || null,
		registration_place: values.registration_place.trim() || null,
		registration_date: values.registration_date ?? null,
		branch_code: values.branch_code.trim() || null,

		legal_address: values.legal_address.trim() || null,
		postal_code: values.postal_code.trim() || null,

		map_address: values.map_address.trim() || null,
		map_latitude: values.map_latitude.trim() || null,
		map_longitude: values.map_longitude.trim() || null,

		phone: joinMulti(values.phone),
		mobile: joinMulti(values.mobile),
		fax: joinMulti(values.fax),
		email: joinMulti(values.email),

		website: values.website.trim() || null,

		economic_code: values.economic_code.trim() || null,
		tax_file_number: values.tax_file_number.trim() || null,
		vat_status: values.vat_status ?? null,
		tax_office: values.tax_office.trim() || null,

		cooperation_start_date: values.cooperation_start_date ?? null,
		cooperation_status: values.cooperation_status ?? null,

		financial_commitment_cap: values.financial_commitment_cap.trim() || null,
		settlement_term: values.settlement_term ?? null,
		working_hours: values.working_hours.trim() || null,

		social_links: serializeSocialLinks(values.social_links),

		internal_code: values.internal_code.trim() || null,
		internal_note: values.internal_note.trim() || null,
		info_verification_status: values.info_verification_status ?? null,
	};
}
