import type { PublicProfileFormValues } from "./company-public.mappers";
import { z } from "zod";

function cleanTextList(value: unknown) {
	if (value == null)
		return [];
	if (!Array.isArray(value))
		return value;
	return value.map(item => String(item).trim()).filter(Boolean);
}

function cleanSocialLinks(value: unknown) {
	if (!Array.isArray(value))
		return value;
	return value.filter((item) => {
		if (!item || typeof item !== "object")
			return false;
		const { label, url } = item as { label?: unknown, url?: unknown };
		return String(label ?? "").trim() || String(url ?? "").trim();
	});
}

const textListSchema = z.preprocess(cleanTextList, z.array(z.string().trim().min(3, "نامعتبر")).default([]));
const emailListSchema = z.preprocess(cleanTextList, z.array(z.string().trim().email("ایمیل نامعتبر است")).default([]));
const socialLinksSchema = z.preprocess(
	cleanSocialLinks,
	z.array(z.object({ label: z.string().trim().min(2, "الزامی"), url: z.string().trim().min(3, "نامعتبر") })).default([]),
);

export const publicProfileSchema = z.object({
	legal_name: z.string().trim().min(2, "نام حقوقی الزامی است"),
	brand_name: z.string().trim().default(""),

	legal_address: z.string().trim().default(""),
	postal_code: z.string().trim().default(""),

	map_address: z.string().trim().default(""),
	map_latitude: z.string().trim().default(""),
	map_longitude: z.string().trim().default(""),

	phone: textListSchema,
	mobile: textListSchema,
	fax: textListSchema,
	email: emailListSchema,

	website: z.string().trim().default(""),
	working_hours: z.string().trim().default(""),

	social_links: socialLinksSchema,

	service: z.number(),
	company: z.number(),
}) as unknown as z.ZodType<PublicProfileFormValues>;
