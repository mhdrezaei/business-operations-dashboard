import type { CompanyDocumentDto } from "./company-documents.types";

const EXTENSION_BY_MIME: Record<string, string> = {
	"application/pdf": "pdf",
	"image/png": "png",
	"image/svg+xml": "svg",
	"image/jpeg": "jpg",
};

function hasExtension(name: string) {
	return /\.[a-z0-9]{1,5}$/i.test(name);
}

function basename(path: string) {
	const clean = path.split(/[?#]/)[0] ?? "";
	const last = clean.split("/").pop() ?? "";
	try {
		return decodeURIComponent(last);
	}
	catch {
		return last;
	}
}

/** نام فایل دانلود: `original_filename`، وگرنه نام فایل ذخیره‌شده؛ در صورت نبود پسوند از mime اضافه می‌شود. */
export function resolveCompanyDocumentFileName(
	doc: Pick<CompanyDocumentDto, "original_filename" | "mime_type" | "file">,
	blobType?: string,
) {
	const name = doc.original_filename?.trim() || basename(doc.file ?? "") || "document";
	if (hasExtension(name))
		return name;
	const mime = (doc.mime_type || blobType || "").split(";")[0]?.trim().toLowerCase() ?? "";
	const extension = EXTENSION_BY_MIME[mime];
	return extension ? `${name}.${extension}` : name;
}
