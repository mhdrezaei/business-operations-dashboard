import { SalesAgencyContractFields } from "./sales-agency.fields";
import { salesAgencyContractFieldsSchema } from "./sales-agency.schema";

export const salesAgencyContractService = {
	code: "sales_agency",
	schema: salesAgencyContractFieldsSchema,
	Fields: SalesAgencyContractFields,
} as const;
