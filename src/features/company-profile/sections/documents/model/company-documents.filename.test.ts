import { resolveCompanyDocumentFileName } from "./company-documents.filename";

describe("resolveCompanyDocumentFileName", () => {
	it("keeps original filename with extension", () => {
		expect(resolveCompanyDocumentFileName({ original_filename: "a.pdf", mime_type: "application/pdf", file: "" })).toBe("a.pdf");
	});

	it("adds extension from mime when original filename is missing", () => {
		expect(resolveCompanyDocumentFileName({ original_filename: null, mime_type: "image/png", file: "/media/docs/logo" })).toBe("logo.png");
	});

	it("uses the stored file name and falls back to the blob type", () => {
		expect(resolveCompanyDocumentFileName({ original_filename: null, mime_type: null, file: "https://x/m/doc%201.pdf?x=1" })).toBe("doc 1.pdf");
		expect(resolveCompanyDocumentFileName({ original_filename: null, mime_type: null, file: "" }, "application/pdf")).toBe("document.pdf");
	});
});
