import type { LegalProfileFormValues } from "./company-legal.mappers";
import { z } from "zod";

const LegalPersonTypeEnum = z.enum(["PRIVATE_JOINT_STOCK", "PUBLIC_JOINT_STOCK", "LIMITED_LIABILITY"]);

export const legalProfileSchema = z.object({
	national_id: z.string().trim().min(6, "شناسه ملی نامعتبر است"),
	tax_national_id: z.string().trim().default(""),

	registration_number: z.string().trim().default(""),
	tax_registration_number: z.string().trim().default(""),
	registration_place: z.string().trim().default(""),
	registration_date: z.string().nullable(),

	legal_person_type: LegalPersonTypeEnum.nullable(),
	branch_code: z.string().trim().default(""),

	service: z.number(),
	company: z.number(),
}) as unknown as z.ZodType<LegalProfileFormValues>;
