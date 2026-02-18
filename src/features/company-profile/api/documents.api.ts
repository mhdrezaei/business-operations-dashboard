import type { CompanyDocumentDto, Paginated } from "../sections/documents/model/company-documents.types";
import { request } from "#src/utils/request/";

export type ListCompanyDocumentsParams = Record<string, string | number | boolean | undefined>
  & { company: number, page?: number, search?: string, ordering?: string, doc_type?: string, verification_status?: string };

export async function listCompanyDocuments(params: ListCompanyDocumentsParams) {
	return request
		.get("contracts/company/documents/", { searchParams: params })
		.json<Paginated<CompanyDocumentDto>>();
}

export async function getCompanyDocument(id: number) {
	return request
		.get(`contracts/company/documents/${id}/`)
		.json<CompanyDocumentDto>();
}

export async function createCompanyDocument(formData: FormData) {
	return request
		.post("contracts/company/documents/", { body: formData })
		.json<CompanyDocumentDto>();
}

export async function updateCompanyDocument(id: number, formData: FormData) {
	return request
		.put(`contracts/company/documents/${id}/`, { body: formData })
		.json<CompanyDocumentDto>();
}

export async function deleteCompanyDocument(id: number) {
	return request
		.delete(`contracts/company/documents/${id}/`)
		.json<any>();
}
