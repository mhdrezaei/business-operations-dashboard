import type { ContractTypeValue } from "#src/features/contract/components/contract-type/contract-type.types";
import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types.js";
import type { ApiContractDto } from "./contract.dto";
import { apiPricingToContractType } from "./pricing.mapper";

const EMPTY_CT: ContractTypeValue = {
	type: null,
	fixedAmount: null,
	rows: [],
	sections: [],
};

interface OpenApiServiceFields {
	billInquiry: ContractTypeValue
	receiptRegister: ContractTypeValue
	packageModel: string | null
	addenda: any[]
}

export function fromApiContract(dto: ApiContractDto): ContractFormValues {
	const serviceFields: OpenApiServiceFields = {
		billInquiry: apiPricingToContractType(dto.bill_inquiry) ?? EMPTY_CT,
		receiptRegister: apiPricingToContractType(dto.receipt_register) ?? EMPTY_CT,
		packageModel: dto.package_model ?? null,
		addenda: dto.addenda ?? [],
	};

	return {
		serviceId: dto.service ?? null,
		serviceCode: "", // ✅ اگر تو DTO داری از dto.service_code پرش کن، اگر نداری خالی
		companyId: dto.company ?? null,

		// ✅ sms-only (پیش‌فرض)
		counterpartyType: null,

		startYear: dto.start_jy ?? null,
		startMonth: dto.start_jm ?? null,
		endYear: dto.end_jy ?? null,
		endMonth: dto.end_jm ?? null,

		description: dto.note ?? "",

		// ✅ طبق تایپ فرم اجباریه
		documents: [],

		// ✅ مهم: اگر ContractFormValues.serviceFields = Record<string, unknown>
		// اینجا همون رو پاس می‌دیم ولی با تایپ درست ساختیمش
		serviceFields: serviceFields as any,
	};
}
