import { SalesAgencyPerformanceFields } from "./sales-agency.fields";
import { salesAgencyPerformanceSchema } from "./sales-agency.schema";

export const salesAgencyPerformanceService = {
	code: "sales_agency",
	schema: salesAgencyPerformanceSchema,
	Fields: SalesAgencyPerformanceFields,
} as const;
