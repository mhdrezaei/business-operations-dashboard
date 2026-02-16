import type { CompanyDocumentFormValues } from "./company-documents.types";
import { z } from "zod";

const DOC_TYPE_VALUES = [
	"OFFICIAL_GAZETTE_CHANGES",
	"REGISTRATION_NOTICE",
	"ARTICLES_OF_ASSOCIATION",
	"REPRESENTATIVE_LETTER",
	"LOGO",
	"OTHER",
] as const;

const VERIFICATION_STATUS_VALUES = ["PENDING", "VERIFIED", "REJECTED"] as const;

export const companyDocumentSchema: z.ZodType<CompanyDocumentFormValues> = z.object({
	doc_type: z.enum(DOC_TYPE_VALUES).nullable(),
	verification_status: z.enum(VERIFICATION_STATUS_VALUES).nullable(),
	valid_from: z.string().nullable(),
	valid_until: z.string().nullable(),
	file: z.any().nullable(),
});
