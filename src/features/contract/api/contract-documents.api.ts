import type { Paginated } from "#src/api/types";
import { request } from "#src/utils/request";

export interface ContractDocumentDto {
	id: number
	contract: number
	file: string
	original_filename: string
	mime_type: string
	size: number
	created_at: string
	updated_at: string
}

export function listContractDocuments(contractId: number) {
	return request
		.get("contracts/documents/", { searchParams: { contract: contractId } })
		.json<Paginated<ContractDocumentDto>>();
}

export function createContractDocument(contractId: number, file: File) {
	const fd = new FormData();
	fd.append("contract", String(contractId));
	fd.append("file", file);

	return request
		.post("contracts/documents/", { body: fd })
		.json<ContractDocumentDto>();
}

export function updateContractDocument(id: number, contractId: number, file: File) {
	const fd = new FormData();
	fd.append("contract", String(contractId));
	fd.append("file", file);

	return request
		.put(`contracts/documents/${id}/`, { body: fd })
		.json<ContractDocumentDto>();
}

export function deleteContractDocument(id: number) {
	return request
		.delete(`contracts/documents/${id}/`)
		.json<any>();
}

export async function downloadContractDocument(id: number, fileName?: string) {
	const blob = await request
		.get(`contracts/documents/${id}/download/`)
		.blob();

	const url = window.URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = fileName || "contract-file";
	document.body.appendChild(a);
	a.click();
	a.remove();
	window.URL.revokeObjectURL(url);
}
