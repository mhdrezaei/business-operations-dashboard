import type {
	InternalProfileDto,
	UpsertInternalProfilePayload,
} from "#src/features/company-profile/api/company-profile.api";

import type { InfoVerificationStatus } from "../../model/company-info.types";

export interface InternalProfileFormValues {
	service: number
	company: number
	internal_code: string
	internal_note: string
	info_verification_status: InfoVerificationStatus | null
}

export const emptyInternalProfileValues: InternalProfileFormValues = {
	service: 0,
	company: 0,
	internal_code: "",
	internal_note: "",
	info_verification_status: null,
};

export function dtoToInternalForm(dto: InternalProfileDto, meta: { serviceId: number, companyId: number }): InternalProfileFormValues {
	return {
		service: meta.serviceId,
		company: meta.companyId,
		internal_code: dto.internal_code ?? "",
		internal_note: dto.internal_note ?? "",
		info_verification_status: (dto.info_verification_status as any) ?? null,
	};
}

export function internalFormToPayload(values: InternalProfileFormValues): UpsertInternalProfilePayload {
	return {
		service: values.service,
		company: values.company,
		internal_code: values.internal_code.trim() || null,
		internal_note: values.internal_note.trim() || null,
		info_verification_status: values.info_verification_status ?? null,
	};
}
