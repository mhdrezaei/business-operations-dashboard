// src/features/company-profile/sections/key-people/model/company-people.schema.ts
import { z } from "zod";

export const companyPersonSchema = z.object({
	role: z.string().nullable(),
	full_name: z.string().trim().min(2, "نام و نام خانوادگی الزامی است"),
	is_signatory: z.boolean(),
	national_id: z.string().trim().optional().default(""),
	title: z.string().trim().optional().default(""),
	phone: z.string().trim().optional().default(""),
	email: z.string().trim().optional().default(""),
});
