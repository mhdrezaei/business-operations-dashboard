import type { PublicProfileFormValues } from "./company-public.mappers";
import { z } from "zod";

export const publicProfileSchema = z.object({
	legal_name: z.string().trim().min(2, "نام حقوقی الزامی است"),
	brand_name: z.string().trim().default(""),

	legal_address: z.string().trim().default(""),
	postal_code: z.string().trim().default(""),

	map_address: z.string().trim().default(""),
	map_latitude: z.string().trim().default(""),
	map_longitude: z.string().trim().default(""),

	phone: z.array(z.string().trim().min(3, "نامعتبر")).default([]),
	mobile: z.array(z.string().trim().min(3, "نامعتبر")).default([]),
	fax: z.array(z.string().trim().min(3, "نامعتبر")).default([]),
	email: z.array(z.string().trim().email("ایمیل نامعتبر است")).default([]),

	website: z.string().trim().default(""),
	working_hours: z.string().trim().default(""),

	social_links: z
		.array(z.object({ label: z.string().trim().min(2, "الزامی"), url: z.string().trim().min(3, "نامعتبر") }))
		.default([]),

	service: z.number(),
	company: z.number(),
}) as unknown as z.ZodType<PublicProfileFormValues>;
