import { defaultContractTypeValue } from "#src/features/contract/components/contract-type/contract-type.types";

export const defaultShahkarServiceFields = {
	contractPricing: structuredClone(defaultContractTypeValue),
	hasNewCustomerRate: false,
	addenda: [],
} as const;
