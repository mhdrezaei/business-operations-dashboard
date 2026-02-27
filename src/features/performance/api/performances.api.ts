import type { Paginated } from "#src/api/types";
import { request } from "#src/utils/request";

export type PerformanceServicePath = | "openapi"
  | "commercial"
  | "traffic"
  | "psp"
  | "shahkar"
  | "sms/client"
  | "sms/vendor"
  | "sms-commission";

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
}

interface UploadPerformanceFileParams {
	service: PerformanceServicePath
	companyId: number
	year: number
	month: number
	files: Record<string, File>
	extraFields?: Record<string, string | number | boolean | null | undefined>
	searchParams?: Record<string, string | number | boolean | null | undefined>
}

function buildContractsPath(service: PerformanceServicePath) {
	return `contracts/${service}/`;
}

function buildPerformancePath(service: PerformanceServicePath, companyId: number, year: number, month: number) {
	return `performances/${service}/${companyId}-${year}-${month}/`;
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

export function fetchPerformanceContracts(service: PerformanceServicePath, serviceId: number, companyId: number) {
	return request
		.get(buildContractsPath(service), {
			searchParams: {
				service: serviceId,
				company: companyId,
			},
		})
		.json<Paginated<PerformanceContractListItem>>();
}

export function upsertPerformance({
	service,
	companyId,
	year,
	month,
	payload,
	searchParams,
}: UpsertPerformanceParams) {
	return request
		.put(buildPerformancePath(service, companyId, year, month), {
			searchParams: compactSearchParams(searchParams ?? {}),
			json: payload,
		})
		.json<any>();
}

export function uploadPerformanceFiles({
	service,
	companyId,
	year,
	month,
	files,
	extraFields,
	searchParams,
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
		.put(buildPerformancePath(service, companyId, year, month), {
			searchParams: compactSearchParams(searchParams ?? {}),
			body,
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
