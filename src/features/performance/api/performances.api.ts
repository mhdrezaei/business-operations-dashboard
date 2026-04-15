import type { Paginated } from "#src/api/types";
import { request } from "#src/utils/request";

export type PerformanceContractServicePath = | "openapi"
  | "commercial"
  | "traffic"
  | "psp"
  | "shahkar"
  | "sms/client"
  | "sms/vendor"
  | "sms-commission";

export type PerformanceServicePath = | "openapi"
  | "commercial"
  | "traffic"
  | "psp"
  | "shahkar"
  | "sms"
  | "sms-commission";

export interface PerformanceListItem {
	id?: number
	company?: number | null
	company_id?: number | null
	service?: number | null
	service_id?: number | null
	company_name?: string | null
	service_name?: string | null
	sh_year?: number | null
	sh_month?: number | null
	operation_type?: string | null
	operator?: string | null
	language?: string | null
	location?: string | null
	company_type?: string | null
	sales_agent?: number | null
	sales_agent_id?: number | null
	sales_agent_name?: string | null
	value?: string | number | null
	value_receive?: string | number | null
	income?: string | number | null
	expense?: string | number | null
	profit?: string | number | null
	[key: string]: unknown
}

export interface PerformanceListQuery {
	page?: number
	page_size?: number
	search?: string
	service?: number
	company?: number
	sh_year?: number
	sh_month?: number
	ordering?: string
	gr_month_start_after?: string
	gr_month_start_before?: string
	operation_type?: string
	operator?: string
	language?: string
	sales_agent?: number
	location?: string
	company_type?: string
	is_official?: boolean
	customer_name?: string
	customer_nic?: number
	province_code?: string
	service_type?: number
}
export interface UnregisterdPerformanceListQuery {
	page?: number
	page_size?: number
	service_ids?: string
	company_ids?: string
	search?: string
	sh_year?: number
	sh_month?: number
	ordering?: string
	gr_month_start_after?: string
	gr_month_start_before?: string
	operation_type?: string
	operator?: string
	language?: string
	sales_agent?: number
	location?: string
	company_type?: string
	is_official?: boolean
	customer_name?: string
	customer_nic?: number
	province_code?: string
	service_type?: number
}
export interface PerformanceReportAvailability {
	service_id: number
	service_code: string
	overall_sms_performance: boolean
	periods: string[]
	company_ids: number[]
}

export interface PerformanceReportListItem {
	id: number
	company_id: number
	service_id?: number | null
	service_code?: string | null
	service_name?: string | null
	sh_year: number
	sh_month: number
	value: number
	operation_type: string
	company_name: string
	is_official?: boolean | null
	income_financial: number
	expense_financial: number
	profit_financial: number
	[key: string]: unknown
}

export interface PerformanceReportTotals {
	value: number
	income_financial: number
	expense_financial: number
	profit_financial: number
}

export interface PerformanceReportListResponse extends Paginated<PerformanceReportListItem> {
	totals?: PerformanceReportTotals | null
}

export interface PerformanceReportQuery {
	service_id: number
	service_code: string
	sh_periods: string
	company_ids?: string
	company_type?: string
	is_official?: boolean
	page?: number
	page_size?: number
	total?: boolean
}
export interface PerformanceContractListItem {
	id: number
	company: number | null
	service: number | null
	start_jy: number | null
	start_jm: number | null
	end_jy: number | null
	end_jm: number | null
	contract_openapi_details?: {
		contract_model?: string | null
		package_model?: {
			mode?: string | null
			tiers?: Array<Record<string, unknown>>
		} | null
	} | null
	agent?: number | null
	sales_agent?: number | null
	[key: string]: unknown
}

export interface PerformanceGapsResponse {
	company: {
		id: number
		name: string
	} | null
	company_type: string | null
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
	contract_months_by_year: Record<string, number[]>
	contract_gregorian_ranges: Array<{
		start_jy: number
		start_jm: number
		end_jy: number
		end_jm: number
		start_date: string
		end_date_exclusive: string
	}>
	performance_months_by_year: Record<string, number[]>
	performance_gregorian_ranges: Array<{
		start_jy: number
		start_jm: number
		end_jy: number
		end_jm: number
		start_date: string
		end_date_exclusive: string
	}>
	missing_months_by_year: Record<string, number[]>
	missing_gregorian_ranges: Array<{
		start_jy: number
		start_jm: number
		end_jy: number
		end_jm: number
		start_date: string
		end_date_exclusive: string
	}>
	contract_source: string | null
}

export interface SmsCommissionAgentDto {
	id: number
	name: string
	company: number
	created_at: string
	updated_at: string
}

interface UpsertPerformanceParams {
	service: PerformanceServicePath
	companyId: number
	year: number
	month: number
	payload: Record<string, unknown>
	searchParams?: Record<string, string | number | boolean | null | undefined>
	suppressErrorNotification?: boolean
}

interface UploadPerformanceFileParams {
	service: PerformanceServicePath
	files: Record<string, File>
	extraFields?: Record<string, string | number | boolean | null | undefined>
	searchParams?: Record<string, string | number | boolean | null | undefined>
	suppressErrorNotification?: boolean
}

function buildContractsPath(service: PerformanceContractServicePath) {
	return `contracts/${service}/`;
}

function buildPerformancePath(service: PerformanceServicePath, companyId: number, year: number, month: number) {
	return `performances/${service}/${companyId}-${year}-${month}/`;
}

function buildPerformanceByIdPath(service: PerformanceServicePath, id: number) {
	return `performances/${service}/${id}/`;
}

function buildPerformanceSmsCommissionPath(companyId: number, salesAgentId: number, year: number, month: number) {
	return `performances/sms-commission/${companyId}-${salesAgentId}-${year}-${month}/`;
}

function compactSearchParams(params: Record<string, unknown>) {
	const output: Record<string, string> = {};
	Object.entries(params).forEach(([key, value]) => {
		if (value == null || value === "")
			return;
		output[key] = String(value);
	});
	return output;
}

export function fetchPerformanceGaps(serviceId: number, companyId: number) {
	return request
		.get("performances/gaps/", {
			searchParams: {
				service_id: serviceId,
				company_id: companyId,
			},
		})
		.json<PerformanceGapsResponse>();
}

export function fetchPerformanceContracts(service: PerformanceContractServicePath, serviceId: number, companyId: number) {
	return request
		.get(buildContractsPath(service), {
			searchParams: {
				service: serviceId,
				company: companyId,
			},
		})
		.json<Paginated<PerformanceContractListItem>>();
}

export function fetchPerformanceList(service: PerformanceServicePath, params: PerformanceListQuery) {
	return request
		.get(`performances/${service}/`, {
			searchParams: compactSearchParams(params as Record<string, unknown>),
		})
		.json<Paginated<PerformanceListItem>>();
}

export function fetchPerformanceDetail(service: PerformanceServicePath, id: number) {
	return request
		.get(buildPerformanceByIdPath(service, id))
		.json<Record<string, unknown>>();
}

export function updatePerformanceById(service: PerformanceServicePath, id: number, payload: Record<string, unknown>) {
	return request
		.put(buildPerformanceByIdPath(service, id), { json: payload })
		.json<Record<string, unknown>>();
}

export function updateSmsCommissionPerformanceByComposite(
	companyId: number,
	salesAgentId: number,
	year: number,
	month: number,
	payload: Record<string, unknown>,
) {
	return request
		.put(buildPerformanceSmsCommissionPath(companyId, salesAgentId, year, month), {
			json: payload,
		})
		.json<Record<string, unknown>>();
}

export function deletePerformanceById(service: PerformanceServicePath, id: number) {
	return request
		.delete(buildPerformanceByIdPath(service, id))
		.json<Record<string, unknown>>();
}

export function deletePerformanceByComposite(service: PerformanceServicePath, companyId: number, year: number, month: number) {
	return request
		.delete(buildPerformancePath(service, companyId, year, month))
		.json<Record<string, unknown>>();
}

export function deleteSmsCommissionPerformanceByComposite(
	companyId: number,
	salesAgentId: number,
	year: number,
	month: number,
) {
	return request
		.delete(buildPerformanceSmsCommissionPath(companyId, salesAgentId, year, month))
		.json<Record<string, unknown>>();
}

export function upsertPerformance({
	service,
	// companyId,
	// year,
	// month,
	payload,
	suppressErrorNotification,
	// searchParams,
}: UpsertPerformanceParams) {
	return request
		// .post(buildPerformancePath(service, companyId, year, month), {
		.post(`performances/${service}/`, {
			// searchParams: compactSearchParams(searchParams ?? {}),
			json: payload,
			suppressErrorNotification,
		})
		.json<any>();
}

export function uploadPerformanceFiles({
	service,
	files,
	extraFields,
	searchParams,
	suppressErrorNotification,
}: UploadPerformanceFileParams) {
	const body = new FormData();

	Object.entries(files).forEach(([field, file]) => {
		body.append(field, file);
	});

	Object.entries(extraFields ?? {}).forEach(([field, value]) => {
		if (value == null || value === "")
			return;
		body.append(field, String(value));
	});

	return request
		.post(`performances/${service}/`, {
			searchParams: compactSearchParams(searchParams ?? {}),
			body,
			suppressErrorNotification,
		})
		.json<any>();
}

export async function downloadPerformanceTemplate(
	service: "traffic" | "commercial",
	params: Record<string, string | number | boolean | null | undefined>,
) {
	const blob = await request
		.get(`performances/${service}/template/`, {
			searchParams: compactSearchParams(params),
		})
		.blob();

	return blob;
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

export function fetchUnregisteredPerformanceList(params: UnregisterdPerformanceListQuery) {
	return request
		.get("performances/report/missing-contract-performances/", {
			searchParams: compactSearchParams(params as Record<string, unknown>),
		})
		.json<Paginated<PerformanceListItem>>();
}

export function fetchPerformanceReportAvailability(serviceId: number, shPeriods?: string[]) {
	const periods = (shPeriods ?? [])
		.map(item => String(item ?? "").trim())
		.filter(Boolean)
		.join(",");

	return request
		.get("performances/report/availability/", {
			searchParams: compactSearchParams({
				service_id: serviceId,
				sh_periods: periods,
			}),
		})
		.json<PerformanceReportAvailability>();
}

export function fetchPerformanceReport(params: PerformanceReportQuery) {
	return request
		.get("performances/report/", {
			searchParams: compactSearchParams(params as unknown as Record<string, unknown>),
		})
		.json<PerformanceReportListResponse>();
}
