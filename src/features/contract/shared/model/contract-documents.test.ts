import { describe, expect, it } from "vitest";
import { CONTRACT_DOCUMENT_MAX_COUNT, CONTRACT_DOCUMENT_MAX_SIZE_BYTES, getContractDocumentRejection } from "./contract-documents";

describe("getContractDocumentRejection", () => {
	it("accepts pdf/png/jpg within the size limit", () => {
		expect(getContractDocumentRejection({ name: "a.PDF", type: "application/pdf", size: 10 })).toBeNull();
		expect(getContractDocumentRejection({ name: "a.jpeg", type: "", size: 10 })).toBeNull();
	});

	it("rejects other types and files over 50MB", () => {
		expect(getContractDocumentRejection({ name: "a.docx", type: "application/msword", size: 10 })).toBe("type");
		expect(getContractDocumentRejection({ name: "a.pdf", type: "application/pdf", size: CONTRACT_DOCUMENT_MAX_SIZE_BYTES + 1 })).toBe("size");
	});

	it("rejects a new file once the 10-file cap is reached", () => {
		const file = { name: "a.pdf", type: "application/pdf", size: 10 };
		expect(getContractDocumentRejection(file, CONTRACT_DOCUMENT_MAX_COUNT - 1)).toBeNull();
		expect(getContractDocumentRejection(file, CONTRACT_DOCUMENT_MAX_COUNT)).toBe("count");
	});
});
