import type {
	LegalProfileDto,
	UpsertLegalProfilePayload,
} from "#src/features/company-profile/api/company-profile.api";

import type { LegalPersonType } from "../company-info.types";

export interface LegalProfileFormValues {
	service: number
	company: number

	national_id: string
	tax_national_id: string

	registration_number: string
	tax_registration_number: string
	registration_place: string
	registration_date: string | null
	legal_person_type: LegalPersonType | null
	branch_code: string
}

export const emptyLegalProfileValues: LegalProfileFormValues = {
	service: 0,
	company: 0,
	national_id: "",
	tax_national_id: "",
	registration_number: "",
	tax_registration_number: "",
	registration_place: "",
	registration_date: null,
	legal_person_type: null,
	branch_code: "",
};

export function dtoToLegalForm(dto: LegalProfileDto, meta: { serviceId: number, companyId: number }): LegalProfileFormValues {
	return {
		service: meta.serviceId,
		company: meta.companyId,
		national_id: dto.national_id ?? "",
		tax_national_id: dto.tax_national_id ?? "",
		registration_number: dto.registration_number ?? "",
		tax_registration_number: dto.tax_registration_number ?? "",
		registration_place: dto.registration_place ?? "",
		registration_date: dto.registration_date ?? null,
		legal_person_type: (dto.legal_person_type as any) ?? null,
		branch_code: dto.branch_code ?? "",
	};
}

export function legalFormToPayload(values: LegalProfileFormValues): UpsertLegalProfilePayload {
	return {
		service: values.service,
		company: values.company,
		national_id: values.national_id.trim() || null,
		tax_national_id: values.tax_national_id.trim() || null,

		registration_number: values.registration_number.trim() || null,
		tax_registration_number: values.tax_registration_number.trim() || null,
		registration_place: values.registration_place.trim() || null,
		registration_date: values.registration_date ?? null,

		legal_person_type: values.legal_person_type ?? null,
		branch_code: values.branch_code.trim() || null,
	};
}
