import type { InternalProfileFormValues } from "./company-internal.mappers";
import { z } from "zod";

const InfoVerificationStatusEnum = z.enum(["PENDING", "VERIFIED", "REJECTED"]);

export const internalProfileSchema = z.object({
	internal_code: z.string().trim().default(""),
	internal_note: z.string().trim().default(""),
	info_verification_status: InfoVerificationStatusEnum.nullable(),

	service: z.number(),
	company: z.number(),
}) as unknown as z.ZodType<InternalProfileFormValues>;
