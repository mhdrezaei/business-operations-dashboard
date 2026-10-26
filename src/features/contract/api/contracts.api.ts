import type { Paginated } from "#src/api/types";
import type {
	ContractListItemType,
	ContractsListQuery,
	PaginatedResult,
} from "../list/model/contracts.list.types";
// import type { ContractServicePath } from "./contract-service.types";
import { i18n } from "#src/locales";
import { request } from "#src/utils/request";

export type ContractServicePath = | "openapi" | "traffic" | "psp" | "commercial"
  | "shahkar"
  | "sales-agency/outbound"
  | "sales-agency/rep-management"
  | "sms/client"
  | "sms/vendor"
  | "sms-commission"
  | "telecom-frame";

export interface SignFlowPreviewResponse {
	service: string
	contract: {
		id: number
		contract_number: string
		company: string
	}
	addendum_group_id: number | null
	company_type: string | null
	rule_config: {
		id: number
		name: string
	}
	steps: Array<{
		order: number
		name: string
		recipients: Array<{
			target_type: string
			user_id: number
			username: string
		}>
		resolved_users: Array<{
			user_id: number
			username: string
		}>
	}>
	has_active_flow: boolean
	active_flow_id: number | null
	real_sign_flow?: { id: number, [key: string]: any } | number | string | null
}

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
		.get(SALES_AGENCY_EXPENSE_TITLES_PATH, { searchParams: { page_size: "1000", is_active: "true" } })
		.json<any>();
	return salesAgencyExpenseTitleRows(response)
		.filter((item: any) => item?.is_active !== false)
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
			throw new Error(i18n.t("contract.create.costTitleIdMissing", { title }));
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

export type ContractApprovalField = "is_business_approved" | "is_signed";

export interface ContractApprovalAddendumPayload extends Partial<Record<ContractApprovalField, boolean>> {
	id: number
	comment?: string
}

export interface ContractApprovalPayload extends Partial<Record<ContractApprovalField, boolean>> {
	comment?: string
	addenda?: ContractApprovalAddendumPayload[]
}

export function fetchCompanyContracts(
	service: ContractServicePath,
	companyId: number | null,
	companyType?: string | null,
	serviceId?: number | null,
	options?: { isOfficial?: boolean | null },
) {
	if (service === "sms/client" || service === "sms/vendor") {
		const searchParams: Record<string, string> = {
			page_size: "1000",
			sms_party: service === "sms/client" ? "client" : "vendor",
		};

		if (companyId != null)
			searchParams.company_id = String(companyId);

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
	if (options?.isOfficial != null)
		searchParams.is_official = String(options.isOfficial);

	return request
		.get(buildContractPath(service), { searchParams })
		.json<PaginatedResult<any>>();
}

/* ===================== SIGN FLOW & PDF ===================== */

export function fetchSignFlowPreview(service: ContractServicePath, contractId: number, addendumGroupId?: string | null) {
	const json: Record<string, any> = { service, contract_id: contractId };
	if (addendumGroupId) {
		json.addendum_group_id = addendumGroupId;
	}
	return request
		.post("contracts/sign-flows/preview/", {
			json,
		})
		.json<SignFlowPreviewResponse>();
}

export function createSignFlow(service: ContractServicePath, contractId: number, addendumGroupId?: string | null) {
	const json: Record<string, any> = { service, contract_id: contractId };
	if (addendumGroupId) {
		json.addendum_group_id = addendumGroupId;
	}
	return request
		.post("contracts/sign-flows/", {
			json,
			timeout: 30_000,
		})
		.json<SignFlowDetail>();
}

export function requestOfficialPdf(service: ContractServicePath, contractId: number, body: FormData, addendumGroupId?: string | null) {
	const searchParams: Record<string, string> = {};
	if (addendumGroupId) {
		searchParams.addendum_group_id = addendumGroupId;
	}
	return request
		.post(`contracts/${service}/${contractId}/official-pdf/`, {
			body,
			searchParams,
			timeout: 120_000,
			retry: 0,
		})
		.json<any>(); // Assuming it returns some success status
}

export interface CheckOfficialPdfStatusResponse {
	can_upload: boolean
	has_official_pdf: boolean
	real_sign_flow?: { id: number, [key: string]: any } | number | string | null
}

export function checkOfficialPdfStatus(service: ContractServicePath, contractId: number, addendumGroupId?: string | null) {
	const searchParams: Record<string, string> = {};
	if (addendumGroupId) {
		searchParams.addendum_group_id = addendumGroupId;
	}
	return request
		.get(`contracts/${service}/${contractId}/official-pdf/status/`, { searchParams })
		.json<CheckOfficialPdfStatusResponse>();
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

export function fetchContractPrintData(
	service: ContractServicePath,
	id: number,
	addendumGroupId?: string | null,
) {
	const searchParams: Record<string, string> = {};
	if (addendumGroupId) {
		searchParams.addendum_group_id = addendumGroupId;
	}
	return request
		.get(`${buildContractPath(service, id)}print-data/`, { searchParams })
		.json<any>();
}

export function fetchContractApprovalHistory(service: ContractServicePath, id: number) {
	return request
		.get(`${buildContractPath(service, id)}approve/`)
		.json<ContractApprovalHistoryResponse>();
}

export function updateContractApproval(service: ContractServicePath, id: number, payload: ContractApprovalPayload) {
	return request
		.patch(`${buildContractPath(service, id)}approve/`, { json: payload })
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

export interface SignFlowListItem {
	id: number
	state: string
	service: string
	service_name: string
	company_type: any
	contract_id: number
	contract_number: string
	company_name: string
	addendum_group_id: string | null
	record_type: string
	template_id: number | null
	template_name: string | null
	rule_config_id: number
	current_step_order: number
	current_step_name: string
	total_steps: number
	contract_start_date: string
	contract_end_date: string
	is_waiting_for_me: boolean
	started_at: string
	finished_at: string | null
	cancel_reason: string
	created_by: number
	created_by_username: string
	created_at: string
}

export function fetchSignFlowsList(params: {
	page?: number
	page_size?: number
	mine?: "assigned" | "created"
	state?: string
	service?: string
	record_type?: "contract" | "addendum"
	ordering?: string
	company_type?: string
	contract_id?: number
}) {
	// Filter out null/undefined values to avoid passing them to searchParams
	const searchParams: Record<string, string> = {};
	for (const [key, value] of Object.entries(params)) {
		if (value != null && value !== "") {
			searchParams[key] = String(value);
		}
	}
	return request
		.get("contracts/sign-flows/", { searchParams })
		.json<PaginatedResult<SignFlowListItem>>();
}

export interface SignFlowStep {
	order: number
	name: string
	state: string
	activated_at: string | null
	decided_at: string | null
	recipients: Array<{
		target_type: string
		user_id: number
		username: string
		role_id: number | null
		role_name: string | null
	}>
	assignments: Array<{
		user_id: number
		username: string
		source_target_type: string
		source_role_id: number | null
	}>
	decision: string | null
}

export interface SignFlowDetail {
	id: number
	state: string
	service: string
	service_name: string
	company_type: Record<string, string> | null
	contract_id: number
	contract_number: string
	company_name: string
	addendum_group_id: string | null
	record_type: string
	template_id: number | null
	template_name: string | null
	rule_config_id: number
	current_step_order: number
	current_step_name: string
	total_steps: number
	contract_start_date: string
	contract_end_date: string
	is_waiting_for_me: boolean
	started_at: string
	finished_at: string | null
	cancel_reason: string
	created_by: number
	created_by_username: string
	created_at: string
	steps: SignFlowStep[]
	print_service_code: string
	cancelled_by: number | null
	revoked_at: string | null
	revoked_by: number | null
	revoked_by_username: string | null
	revoke_reason: string
}

export interface SignFlowHistoryItem {
	id: number
	state: string
	started_at: string
	finished_at: string | null
	cancel_or_reject_reason: string
	revoked_at: string | null
	revoke_reason: string
}

export async function fetchSignFlowDetail(id: number | string): Promise<SignFlowDetail> {
	return request.get(`contracts/sign-flows/${id}/`).json<SignFlowDetail>();
}

export async function fetchSignFlowHistory(contractId: number | string): Promise<SignFlowHistoryItem[]> {
	return request.get(`contracts/sign-flows/history/?contract_id=${contractId}`).json<SignFlowHistoryItem[]>();
}

export function fetchSignFlowOfficialPdf(id: number | string) {
	return request.get(`contracts/sign-flows/${id}/official-pdf/`, {
		timeout: 60_000,
	});
}

export async function cancelSignFlow(id: number | string, reason: string): Promise<SignFlowDetail> {
	return request.post(`contracts/sign-flows/${id}/cancel/`, {
		json: { reason },
	}).json<SignFlowDetail>();
}

export interface DecideSignFlowPayload {
	action: "approve" | "reject"
	comment?: string
}

export async function decideSignFlow(id: number | string, payload: DecideSignFlowPayload): Promise<SignFlowDetail> {
	return request.post(`contracts/sign-flows/${id}/decide/`, {
		json: payload,
	}).json<SignFlowDetail>();
}
export function fetchContractTemplates(service: string, companyType?: string | null, documentKind?: string | null) {
	const searchParams: Record<string, string> = {
		service,
	};
	if (companyType) {
		searchParams.company_type = companyType;
	}
	if (documentKind) {
		searchParams.document_kind = documentKind;
	}

	return request
		.get("contracts/templates/", { searchParams })
		.json<PaginatedResult<any> | any>();
}

export interface TemplateTagValuesResponse {
	service: string
	variant: string | null
	company_type: string
	document_kind: string
	values: Record<string, any>
	labels: Record<string, string>
	missing: string[]
	unknown: string[]
	template_id: number
}

export async function fetchTemplateTagValues(templateId: number, contractId: number, addendumGroupId?: string | null): Promise<TemplateTagValuesResponse> {
	const searchParams: Record<string, string> = {
		template_id: templateId.toString(),
		contract_id: contractId.toString(),
	};
	if (addendumGroupId) {
		searchParams.addendum_group_id = addendumGroupId;
	}

	return request.get("contracts/templates/tag-values/", { searchParams }).json<TemplateTagValuesResponse>();
}
