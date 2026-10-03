import type { Paginated } from "#src/api/types";
import type {
	ContractListItemType,
	ContractsListQuery,
	PaginatedResult,
} from "../list/model/contracts.list.types";
// import type { ContractServicePath } from "./contract-service.types";
import { request } from "#src/utils/request";

export type ContractServicePath = | "openapi" | "traffic" | "psp" | "commercial"
  | "shahkar"
  | "sales-agency/outbound"
  | "sales-agency/rep-management"
  | "sms/client"
  | "sms/vendor"
  | "sms-commission";

export interface ContractGapsResponse {
	company: {
		id: number
		name: string
	} | null
	service: {
		id: number
		name: string
		code: string
	} | null
	allowed_jalali_range: {
		start_jy: number
		start_jm: number
		end_jy: number
		end_jm: number
	} | null
	missing_months_by_year: Record<string, number[]>
	missing_gregorian_ranges: Array<{
		start_jy: number
		start_jm: number
		end_jy: number
		end_jm: number
		start_date: string
		end_date_exclusive: string
	}>
	vendor_gate_applied: boolean
	vendor_gate_service_code: string | null
}

export interface SmsCommissionAgentDto {
	id: number
	name: string
	company: number
	created_at: string
	updated_at: string
}

export interface TrafficDatacenterDto {
	id: number | string
	name?: string | null
	title?: string | null
	code?: string | null
	[key: string]: unknown
}

const SALES_AGENCY_EXPENSE_TITLES_PATH = "contracts/sales-agency/expense-titles/";

function salesAgencyExpenseTitleRows(response: any): any[] {
	return Array.isArray(response)
		? response
		: response?.results ?? response?.titles ?? response?.data ?? [];
}

function salesAgencyExpenseTitleName(item: any): string | null {
	const value = typeof item === "string"
		? item
		: item?.title ?? item?.name ?? item?.expense_title ?? item?.cost_title;
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

export interface SalesAgencyExpenseTitle {
	id: number
	title: string
}

export async function fetchSalesAgencyExpenseTitleRecords(): Promise<SalesAgencyExpenseTitle[]> {
	const response = await request
		.get(SALES_AGENCY_EXPENSE_TITLES_PATH, { searchParams: { page_size: "1000" } })
		.json<any>();
	return salesAgencyExpenseTitleRows(response)
		.map((item: any) => ({ id: Number(item?.id), title: salesAgencyExpenseTitleName(item) }))
		.filter((item: { id: number, title: string | null }): item is SalesAgencyExpenseTitle => Number.isInteger(item.id) && item.id > 0 && item.title != null);
}

export async function fetchSalesAgencyExpenseTitles(): Promise<string[]> {
	const response = await request
		.get(SALES_AGENCY_EXPENSE_TITLES_PATH, { searchParams: { page_size: "1000" } })
		.json<any>();
	return salesAgencyExpenseTitleRows(response)
		.map(salesAgencyExpenseTitleName)
		.filter((title: string | null): title is string => title != null);
}

export function createSalesAgencyExpenseTitle(title: string) {
	return request
		.post(SALES_AGENCY_EXPENSE_TITLES_PATH, { json: { name: title } })
		.json<any>();
}

export async function resolveSalesAgencyExpenseTitleIds(titles: string[]): Promise<number[]> {
	const records = await fetchSalesAgencyExpenseTitleRecords();
	const idByTitle = new Map(records.map(item => [item.title.toLocaleLowerCase(), item.id]));
	const ids: number[] = [];

	for (const title of [...new Set(titles.map(item => item.trim()).filter(Boolean))]) {
		const key = title.toLocaleLowerCase();
		let id = idByTitle.get(key);
		if (id == null) {
			const created = await createSalesAgencyExpenseTitle(title);
			const createdId = Number(created?.id ?? created?.data?.id);
			if (Number.isInteger(createdId) && createdId > 0) {
				id = createdId;
			}
			else {
				const refreshed = await fetchSalesAgencyExpenseTitleRecords();
				id = refreshed.find(item => item.title.toLocaleLowerCase() === key)?.id;
			}
			if (id != null)
				idByTitle.set(key, id);
		}
		if (id == null)
			throw new Error(`شناسه عنوان هزینه «${title}» دریافت نشد.`);
		ids.push(id);
	}

	return ids;
}

export async function resolveSalesAgencyExpenseTitleNames(titles: unknown[]): Promise<string[]> {
	const records = await fetchSalesAgencyExpenseTitleRecords();
	const titleById = new Map(records.map(item => [String(item.id), item.title]));
	const knownTitles = new Set(records.map(item => item.title.toLocaleLowerCase()));
	return titles.map((value) => {
		const raw = String(value ?? "");
		if (knownTitles.has(raw.toLocaleLowerCase()))
			return records.find(item => item.title.toLocaleLowerCase() === raw.toLocaleLowerCase())!.title;
		return titleById.get(raw) ?? raw;
	});
}

function buildContractPath(service: ContractServicePath, id?: number) {
	return id
		? `contracts/${service}/${id}/`
		: `contracts/${service}/`;
}

function toSearchParams(params: ContractsListQuery) {
	const out: Record<string, string> = {};

	Object.entries(params).forEach(([k, v]) => {
		if (v == null)
			return;
		out[k] = String(v);
	});

	return out;
}

/* ===================== LIST ===================== */

export function fetchContractsList(params: ContractsListQuery) {
	return request
		.get("contracts/list", { searchParams: toSearchParams(params) })
		.json<PaginatedResult<ContractListItemType>>();
}

export interface ContractApprovalHistoryEntryDto {
	field_name: string
	old_value: boolean | null
	new_value: boolean | null
	changed_by: {
		id: number
		name: string
	} | null
	changed_at: string
	reason: string
	comment: string
}

export interface ContractApprovalHistorySubjectDto {
	id: number
	display_addendum_number?: string
	is_signed: boolean | null
	is_business_approved: boolean | null
	sign_approval_history: ContractApprovalHistoryEntryDto[]
}

export interface ContractApprovalHistoryResponse extends ContractApprovalHistorySubjectDto {
	addenda: ContractApprovalHistorySubjectDto[]
}

export function fetchCompanyContracts(
	service: ContractServicePath,
	companyId: number,
	companyType?: string | null,
	serviceId?: number | null,
) {
	if (service === "sms/client" || service === "sms/vendor") {
		const searchParams: Record<string, string> = {
			company_id: String(companyId),
			page_size: "1000",
			sms_party: service === "sms/client" ? "client" : "vendor",
		};

		if (serviceId != null)
			searchParams.service_id = String(serviceId);

		return request
			.get("contracts/list", { searchParams })
			.json<PaginatedResult<any>>();
	}

	const searchParams: Record<string, string> = {
		company: String(companyId),
		page_size: "1000",
	};

	if (companyType)
		searchParams.company_type = companyType;
	if (serviceId != null)
		searchParams.service = String(serviceId);

	return request
		.get(buildContractPath(service), { searchParams })
		.json<PaginatedResult<any>>();
}

/* ===================== DETAIL ===================== */

export function fetchContractDetail(
	service: ContractServicePath,
	id: number,
) {
	return request
		.get(buildContractPath(service, id))
		.json<any>();
}

export function fetchContractApprovalHistory(service: ContractServicePath, id: number) {
	return request
		.get(`${buildContractPath(service, id)}approve/`)
		.json<ContractApprovalHistoryResponse>();
}
/* ===================== CREATE ===================== */

export function fetchCreateContract(service: ContractServicePath, payload: any) {
	return request
		.post(buildContractPath(service), { json: payload })
		.json<any>();
}
/* ===================== UPDATE ===================== */

export function fetchUpdateContract(
	service: ContractServicePath,
	id: number,
	payload: any,
) {
	return request
		.put(buildContractPath(service, id), { json: payload })
		.json<any>();
}

/* ===================== DELETE ===================== */

export function fetchDeleteContract(
	service: ContractServicePath,
	id: number,
) {
	return request
		.delete(buildContractPath(service, id))
		.json<any>();
}

export function fetchContractGaps(serviceId: number, companyId?: number | null, companyType?: string | null) {
	const searchParams: Record<string, string> = {
		service_id: String(serviceId),
	};

	if (companyId != null)
		searchParams.company_id = String(companyId);

	if (companyType)
		searchParams.company_type = companyType;

	return request
		.get("contracts/gaps/", {
			searchParams,
		})
		.json<ContractGapsResponse>();
}

export function fetchSmsCommissionAgents() {
	return request
		.get("contracts/sms-commission/agents/", {
			searchParams: {
				page_size: 1000,
			},
		})
		.json<Paginated<SmsCommissionAgentDto>>();
}

export function fetchTrafficDatacenters() {
	return request
		.get("contracts/traffic/datacenters/")
		.json<Paginated<TrafficDatacenterDto> | TrafficDatacenterDto[]>();
}
