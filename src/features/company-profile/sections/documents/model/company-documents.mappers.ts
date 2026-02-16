import type {
	CompanyDocumentDto,
	CompanyDocumentFormValues,
} from "./company-documents.types";

export const emptyCompanyDocumentValues: CompanyDocumentFormValues = {
	doc_type: null,
	verification_status: null,
	valid_from: null,
	valid_until: null,
	file: null,
};

export function dtoToCompanyDocumentForm(dto: CompanyDocumentDto): CompanyDocumentFormValues {
	return {
		doc_type: dto.doc_type ?? null,
		verification_status: dto.verification_status ?? null,
		valid_from: dto.valid_from ?? null,
		valid_until: dto.valid_until ?? null,
		file: null, // فایل جدید فقط اگر کاربر انتخاب کند
	};
}

export function companyDocumentFormToFormData(args: {
	serviceId: number
	companyId: number
	values: CompanyDocumentFormValues
	keepFileIfNull?: boolean
}) {
	const { serviceId, companyId, values, keepFileIfNull } = args;

	const fd = new FormData();
	fd.append("service", String(serviceId));
	fd.append("company", String(companyId));

	if (values.doc_type)
		fd.append("doc_type", values.doc_type);

	if (values.verification_status)
		fd.append("verification_status", values.verification_status);

	if (values.valid_from)
		fd.append("valid_from", values.valid_from);

	if (values.valid_until)
		fd.append("valid_until", values.valid_until);

	// file: اگر null بود برای create نباید ارسال شود، برای update هم معمولاً اختیاری است
	if (values.file instanceof File) {
		fd.append("file", values.file);
	}
	else if (keepFileIfNull) {
		// هیچ کاری نکن (برای update اگر فایل جدید انتخاب نشده)
	}

	return fd;
}
