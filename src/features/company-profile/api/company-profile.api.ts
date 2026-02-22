import type { Paginated } from "#src/api/types.js";
import type { CompanyProfileDto } from "../sections/company-info/model/company-info.types";
import { request } from "#src/utils/request/";

export interface ListCompanyProfilesParams {
	company: number
	page?: number
	search?: string
	ordering?: string
}

export async function listCompanyProfiles(params: ListCompanyProfilesParams) {
	const searchParams: Record<string, string | number | boolean | undefined> = {
		company: params.company,
		page: params.page,
		search: params.search,
		ordering: params.ordering,
	};

	return request
		.get("contracts/company/profiles/", { searchParams })
		.json<Paginated<CompanyProfileDto>>();
}

// ---------- helpers ----------
function pickFirst<T>(data: unknown): T | null {
	if (!data)
		return null;

	// list array
	if (Array.isArray(data))
		return (data[0] as T) ?? null;

	// paginated { results: [] }
	if (typeof data === "object" && data && "results" in (data as any) && Array.isArray((data as any).results))
		return ((data as any).results[0] as T) ?? null;

	// single object
	return data as T;
}

// ---------- Public ----------
export interface PublicProfileDto {
	id: number
	company: number
	legal_name: string
	brand_name: string
	legal_address: string
	postal_code: string
	map_address: string
	map_latitude: string
	map_longitude: string
	phone: string[]
	mobile: string[]
	fax: string[]
	email: string[]
	website: string
	working_hours: string
	social_links: string
	created_at: string
	updated_at: string
}

export interface UpsertPublicProfilePayload {
	service: number
	company: number
	legal_name: string | null
	brand_name: string | null
	legal_address: string | null
	postal_code: string | null
	map_address: string | null
	map_latitude: string | null
	map_longitude: string | null
	phone: string[]
	mobile: string[]
	fax: string[]
	email: string[]
	website: string | null
	working_hours: string | null
	social_links: string | null
}

export async function getPublicProfile(params: { company: number, service: number }) {
	const searchParams = { company: params.company, service: params.service };
	const data = await request.get("contracts/company/public-profiles/", { searchParams }).json<unknown>();
	return pickFirst<PublicProfileDto>(data);
}

export async function createPublicProfile(payload: UpsertPublicProfilePayload) {
	return request.post("contracts/company/public-profiles/", { json: payload }).json<PublicProfileDto>();
}

export async function updatePublicProfile(id: number, payload: UpsertPublicProfilePayload) {
	return request.put(`contracts/company/public-profiles/${id}/`, { json: payload }).json<PublicProfileDto>();
}

export async function deletePublicProfile(id: number) {
	return request.delete(`contracts/company/public-profiles/${id}/`).json<void>();
}

// ---------- Legal ----------
export interface LegalProfileDto {
	id: number
	company: number
	national_id: string
	tax_national_id: string
	registration_number: string
	tax_registration_number: string
	registration_place: string
	registration_date: string
	legal_person_type: string
	branch_code: string
	created_at: string
	updated_at: string
}

export interface UpsertLegalProfilePayload {
	service: number
	company: number
	national_id: string | null
	tax_national_id: string | null
	registration_number: string | null
	tax_registration_number: string | null
	registration_place: string | null
	registration_date: string | null
	legal_person_type: string | null
	branch_code: string | null
}

export async function getLegalProfile(params: { company: number, service: number }) {
	const searchParams = { company: params.company, service: params.service };
	const data = await request.get("contracts/company/legal-profiles/", { searchParams }).json<unknown>();
	return pickFirst<LegalProfileDto>(data);
}

export async function createLegalProfile(payload: UpsertLegalProfilePayload) {
	return request.post("contracts/company/legal-profiles/", { json: payload }).json<LegalProfileDto>();
}

export async function updateLegalProfile(id: number, payload: UpsertLegalProfilePayload) {
	return request.put(`contracts/company/legal-profiles/${id}/`, { json: payload }).json<LegalProfileDto>();
}

export async function deleteLegalProfile(id: number) {
	return request.delete(`contracts/company/legal-profiles/${id}/`).json<void>();
}

// ---------- Finance ----------
export interface FinanceProfileDto {
	id: number
	company: number
	economic_code: string
	tax_file_number: string
	vat_status: string
	tax_office: string
	financial_commitment_cap: string
	settlement_term: string
	created_at: string
	updated_at: string
}

export interface UpsertFinanceProfilePayload {
	service: number
	company: number
	economic_code: string | null
	tax_file_number: string | null
	vat_status: string | null
	tax_office: string | null
	financial_commitment_cap: string | null
	settlement_term: string | null
}

export async function getFinanceProfile(params: { company: number, service: number }) {
	const searchParams = { company: params.company, service: params.service };
	const data = await request.get("contracts/company/finance-profiles/", { searchParams }).json<unknown>();
	return pickFirst<FinanceProfileDto>(data);
}

export async function createFinanceProfile(payload: UpsertFinanceProfilePayload) {
	return request.post("contracts/company/finance-profiles/", { json: payload }).json<FinanceProfileDto>();
}

export async function updateFinanceProfile(id: number, payload: UpsertFinanceProfilePayload) {
	return request.put(`contracts/company/finance-profiles/${id}/`, { json: payload }).json<FinanceProfileDto>();
}

export async function deleteFinanceProfile(id: number) {
	return request.delete(`contracts/company/finance-profiles/${id}/`).json<void>();
}

// ---------- Internal ----------
export interface InternalProfileDto {
	id: number
	company: number
	internal_code: string
	internal_note: string
	info_verification_status: string
	created_at: string
	updated_at: string
}

export interface UpsertInternalProfilePayload {
	service: number
	company: number
	internal_code: string | null
	internal_note: string | null
	info_verification_status: string | null
}

export async function getInternalProfile(params: { company: number, service: number }) {
	const searchParams = { company: params.company, service: params.service };
	const data = await request.get("contracts/company/internal-profiles/", { searchParams }).json<unknown>();
	return pickFirst<InternalProfileDto>(data);
}

export async function createInternalProfile(payload: UpsertInternalProfilePayload) {
	return request.post("contracts/company/internal-profiles/", { json: payload }).json<InternalProfileDto>();
}

export async function updateInternalProfile(id: number, payload: UpsertInternalProfilePayload) {
	return request.put(`contracts/company/internal-profiles/${id}/`, { json: payload }).json<InternalProfileDto>();
}

export async function deleteInternalProfile(id: number) {
	return request.delete(`contracts/company/internal-profiles/${id}/`).json<void>();
}
