import type {
	FinanceProfileDto,
	UpsertFinanceProfilePayload,
} from "#src/features/company-profile/api/company-profile.api";

import type { SettlementTerm, VatStatus } from "../company-info.types";

export interface FinanceProfileFormValues {
	service: number
	company: number

	economic_code: string
	tax_file_number: string
	vat_status: VatStatus | null
	tax_office: string

	financial_commitment_cap: string
	settlement_term: SettlementTerm | null
}

export const emptyFinanceProfileValues: FinanceProfileFormValues = {
	service: 0,
	company: 0,
	economic_code: "",
	tax_file_number: "",
	vat_status: null,
	tax_office: "",
	financial_commitment_cap: "",
	settlement_term: null,
};

export function dtoToFinanceForm(dto: FinanceProfileDto, meta: { serviceId: number, companyId: number }): FinanceProfileFormValues {
	return {
		service: meta.serviceId,
		company: meta.companyId,
		economic_code: dto.economic_code ?? "",
		tax_file_number: dto.tax_file_number ?? "",
		vat_status: (dto.vat_status as any) ?? null,
		tax_office: dto.tax_office ?? "",
		financial_commitment_cap: dto.financial_commitment_cap ?? "",
		settlement_term: (dto.settlement_term as any) ?? null,
	};
}

export function financeFormToPayload(values: FinanceProfileFormValues): UpsertFinanceProfilePayload {
	return {
		service: values.service,
		company: values.company,
		economic_code: values.economic_code.trim() || null,
		tax_file_number: values.tax_file_number.trim() || null,
		vat_status: values.vat_status ?? null,
		tax_office: values.tax_office.trim() || null,
		financial_commitment_cap: values.financial_commitment_cap.trim() || null,
		settlement_term: values.settlement_term ?? null,
	};
}
