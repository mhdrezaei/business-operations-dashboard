import type { CompanyInfoFormValues } from "./company-info.types";
// src/features/company-profile/sections/company-info/model/company-info.schema.ts
import { z } from "zod";

// ✅ دقیقاً مطابق union-type های شما
const LegalPersonTypeEnum = z.enum(["PRIVATE_JOINT_STOCK", "PUBLIC_JOINT_STOCK", "LIMITED_LIABILITY"]);
const VatStatusEnum = z.enum(["SUBJECT", "EXEMPT", "UNKNOWN"]);
const CooperationStatusEnum = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]);
const SettlementTermEnum = z.enum(["CASH", "CREDIT", "INSTALLMENT"]);
const InfoVerificationStatusEnum = z.enum(["PENDING", "VERIFIED", "REJECTED"]);

export const companyInfoSchema = z
	.object({
		legal_name: z.string().trim().min(2, "نام حقوقی الزامی است"),
		brand_name: z.string().trim().default(""),

		national_id: z.string().trim().min(6, "شناسه ملی نامعتبر است"),
		tax_national_id: z.string().trim().default(""),

		legal_person_type: LegalPersonTypeEnum.nullable(),

		registration_number: z.string().trim().default(""),
		tax_registration_number: z.string().trim().default(""),
		registration_place: z.string().trim().default(""),
		registration_date: z.string().nullable(),
		branch_code: z.string().trim().default(""),

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

		economic_code: z.string().trim().default(""),
		tax_file_number: z.string().trim().default(""),
		vat_status: VatStatusEnum.nullable(),
		tax_office: z.string().trim().default(""),

		cooperation_start_date: z.string().nullable(),
		cooperation_status: CooperationStatusEnum.nullable(),

		financial_commitment_cap: z.string().trim().default(""),
		settlement_term: SettlementTermEnum.nullable(),
		working_hours: z.string().trim().default(""),

		social_links: z
			.array(z.object({ label: z.string().trim().min(2, "الزامی"), url: z.string().trim().min(3, "نامعتبر") }))
			.default([]),

		internal_code: z.string().trim().default(""),
		internal_note: z.string().trim().default(""),

		info_verification_status: InfoVerificationStatusEnum.nullable(),
	}) as unknown as z.ZodType<CompanyInfoFormValues>;
