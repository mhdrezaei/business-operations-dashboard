export const CONTRACT_DOCUMENT_ACCEPT = ".pdf,.png,.jpg,.jpeg";
export const CONTRACT_DOCUMENT_MAX_SIZE_BYTES = 50 * 1024 * 1024;
export const CONTRACT_DOCUMENT_MAX_COUNT = 10;

const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
const ALLOWED_EXTENSIONS = CONTRACT_DOCUMENT_ACCEPT.split(",");

export type ContractDocumentRejection = "type" | "size" | "count";

/** فیلتر old: نوع pdf/png/jpg و حداکثر ۵۰ مگابایت؛ به‌علاوهٔ سقف ۱۰ فایل (`currentCount` تعداد فایل‌های فعلی). */
export function getContractDocumentRejection(file: { name: string, type?: string, size?: number }, currentCount = 0): ContractDocumentRejection | null {
	if (currentCount >= CONTRACT_DOCUMENT_MAX_COUNT)
		return "count";
	const lowerName = file.name.toLowerCase();
	const isAllowedType = ALLOWED_MIME_TYPES.has(file.type ?? "") || ALLOWED_EXTENSIONS.some(ext => lowerName.endsWith(ext));
	if (!isAllowedType)
		return "type";
	if ((file.size ?? 0) > CONTRACT_DOCUMENT_MAX_SIZE_BYTES)
		return "size";
	return null;
}
