import type { FinanceProfileFormValues } from "./company-finance.mappers";
import { z } from "zod";

const VatStatusEnum = z.enum(["SUBJECT", "EXEMPT", "UNKNOWN"]);
const SettlementTermEnum = z.enum(["CASH", "CREDIT", "INSTALLMENT"]);

export const financeProfileSchema = z.object({
	economic_code: z.string().trim().default(""),
	tax_file_number: z.string().trim().default(""),
	vat_status: VatStatusEnum.nullable(),
	tax_office: z.string().trim().default(""),

	financial_commitment_cap: z.string().trim().default(""),
	settlement_term: SettlementTermEnum.nullable(),

	service: z.number(),
	company: z.number(),
}) as unknown as z.ZodType<FinanceProfileFormValues>;
