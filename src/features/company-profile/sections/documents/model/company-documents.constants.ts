import type { CompanyDocumentDocType, CompanyDocumentVerificationStatus } from "./company-documents.types";

export const DOC_TYPE_OPTIONS: Array<{ label: string, value: CompanyDocumentDocType }> = [
	{ label: "روزنامه رسمی تغییرات", value: "OFFICIAL_GAZETTE_CHANGES" },
	{ label: "آگهی ثبت", value: "REGISTRATION_NOTICE" },
	{ label: "اساسنامه", value: "ARTICLES_OF_ASSOCIATION" },
	{ label: "معرفی‌نامه نماینده", value: "REPRESENTATIVE_LETTER" },
	{ label: "لوگوی شرکت", value: "LOGO" },
	{ label: "سایر", value: "OTHER" },
];

export const VERIFICATION_STATUS_OPTIONS: Array<{ label: string, value: CompanyDocumentVerificationStatus }> = [
	{ label: "در انتظار بررسی", value: "PENDING" },
	{ label: "تایید شده", value: "VERIFIED" },
	{ label: "رد شده", value: "REJECTED" },
];

export const ORDERING_OPTIONS: Array<{ label: string, value: string }> = [
	{ label: "جدیدترین", value: "-created_at" },
	{ label: "قدیمی‌ترین", value: "created_at" },
	{ label: "نوع مدرک (صعودی)", value: "doc_type" },
	{ label: "نوع مدرک (نزولی)", value: "-doc_type" },
	{ label: "وضعیت تایید (صعودی)", value: "verification_status" },
	{ label: "وضعیت تایید (نزولی)", value: "-verification_status" },
];
