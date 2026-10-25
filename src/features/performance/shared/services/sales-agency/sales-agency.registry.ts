import { z } from "zod";
import { SalesAgencyPerformanceFields } from "./sales-agency.fields";

export const salesAgencyPerformanceService = {
	code: "sales_agency",
	schema: z.record(z.string(), z.unknown()),
	Fields: SalesAgencyPerformanceFields,
} as const;
