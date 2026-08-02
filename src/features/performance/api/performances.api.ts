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
	fiscal_year?: number | null
	fiscal_month?: number | null
	value: number
	operation_type: string
	company_name: string
	is_official?: boolean | null
	income_financial: number
	expense_financial: number
	profit_financial: number
	income?: number | null
	expense?: number | null
	profit?: number | null
	income_tci?: number | null
	income_first_side?: number | null
	income_area?: number | null
	income_sales_agent?: number | null
	price?: number | null
	sales_agent_id?: number | null
	sales_agent_name?: string | null
	operator?: string | null
	language?: string | null
	created_by_user?: Record<string, unknown> | string | null
	updated_by_user?: Record<string, unknown> | string | null
	[key: string]: unknown
}

export interface PerformanceReportTotals {
	value: number
	income_financial: number
	expense_financial: number
	profit_financial: number
	income_tci?: number | null
	income_first_side?: number | null
	income_area?: number | null
	income_sales_agent?: number | null
	[key: string]: unknown
}

export interface PerformanceReportListResponse extends Paginated<PerformanceReportListItem> {
	totals?: PerformanceReportTotals | null
}

export type PerformanceReportPeriodType = "sh" | "fiscal";

export interface PerformanceReportQuery {
	service_id: number
	service_code: string
	sh_periods?: string
	fiscal_periods?: string
	company_ids?: string
	company_type?: string
	is_official?: boolean
	default_conversion_ratio?: number
	by_company?: boolean
	by_month?: boolean
	by_operator?: boolean
	by_language?: boolean
	page?: number
	page_size?: number
	total?: boolean
}

export type PredictionSummaryPeriodMode = "shamsi_months" | "fiscal_months" | "shamsi_quarters" | "fiscal_quarters";

export interface PredictionSummarySelectedPeriod {
	year: number
	months?: number[]
	quarters?: number[]
}

export interface PredictionSummaryQuery {
	service_codes: string
	period_mode: PredictionSummaryPeriodMode
	periods: string
	total?: boolean
	default_conversion_ratio?: number
}

export interface PredictionSummaryPeriod {
	calendar_type?: string | null
	bucket_type?: string | null
	year?: number | string | null
	month?: number | string | null
	quarter?: number | string | null
	months_expanded?: Array<number | string | {
		sh_year?: number | string | null
		sh_month?: number | string | null
	}>
	performance?: Record<string, unknown> | null
	predictions?: Record<string, unknown> | null
	[key: string]: unknown
}

export interface PredictionSummaryService {
	service_id?: number | string | null
	service_code?: string | null
	period_mode?: PredictionSummaryPeriodMode | string | null
	periods?: PredictionSummaryPeriod[]
}

export interface PredictionSummaryResponse {
	services: PredictionSummaryService[]
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

export interface MonthlyContractStatusResponse {
	service: {
		id: number
		code: string
		name: string
	} | null
	company: {
		id: number
		name: string
	} | null
	period: {
		year: number
		month: number
	}
	has_contract: boolean
	base_contract_id: number | null
	used_addendum: boolean
	source?: "addendum" | "base_contract" | string
	openapi?: {
		contract_model: string | null
	} | null
	traffic?: {
		has_county_contract: boolean
		location_units?: Record<string, string>
	} | null
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

interface UploadTrafficExcelImportParams {
	file: File
	searchParams: {
		sh_year: number
		sh_month: number
		company_type: string
	}
	suppressErrorNotification?: boolean
}

interface UpdateTrafficExcelImportParams {
	serviceId: number
	file: File
	searchParams: {
		sh_year: number
		sh_month: number
		company_type: string
	}
	suppressErrorNotification?: boolean
}

export interface TrafficExcelImportResponse {
	total_rows_in_file: number
	filled_rows: number
	created: number
	skipped_empty: number
	rejected: number
	rejected_by_reason: Record<string, number>
	rejected_items: Array<{
		row_no: number
		company_name: string
		reason: string
		details: Record<string, unknown>
	}>
}

export interface TrafficExcelUpdateResponse {
	total_rows_in_file: number
	filled_rows: number
	updated: number
	skipped_empty: number
	rejected: number
	rejected_by_reason: Record<string, number>
	rejected_items: Array<{
		row_no: number
		company_name: string
		reason: string
		details: Record<string, unknown>
	}>
}

export type SmsGatewayImportStatus = "will_create" | "will_update" | "no_contract" | "unmapped" | string;

export interface SmsGatewayImportOperator {
	operator: "MCI" | "IRANCELL" | "OTHER" | string
	language: "FA" | "EN" | string
	value: number
}

export interface SmsGatewayManualImportResponse {
	sh_year: number
	sh_month: number
	confirmed: boolean
	items: Array<{
		status: SmsGatewayImportStatus
		gateway_customer_name: string
		company_id: number | null
		company_name: string | null
		company_type: string | null
		service: string | null
		operators: SmsGatewayImportOperator[]
	}>
	summary: {
		will_create: number
		will_update: number
		no_contract: number
		unmapped: number
	}
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

export function fetchPerformanceGaps({
	serviceId,
	companyId,
	companyType,
}: {
	serviceId: number
	companyId?: number | null
	companyType?: string | null
}) {
	return request
		.get("performances/gaps/", {
			searchParams: compactSearchParams({
				service_id: serviceId,
				company_id: companyId,
				company_type: companyType,
			}),
		})
		.json<PerformanceGapsResponse>();
}

export function fetchMonthlyContractStatus({
	serviceId,
	companyId,
	companyType,
	year,
	month,
}: {
	serviceId: number
	companyId: number
	companyType?: string | null
	year: number
	month: number
}) {
	return request
		.get("contracts/monthly-status/", {
			searchParams: compactSearchParams({
				service_id: serviceId,
				company_id: companyId,
				company_type: companyType,
				year,
				month,
			}),
		})
		.json<MonthlyContractStatusResponse>();
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

export function updatePerformanceByComposite(
	service: PerformanceServicePath,
	companyId: number,
	year: number,
	month: number,
	payload: Record<string, unknown>,
) {
	return request
		.put(buildPerformancePath(service, companyId, year, month), { json: payload })
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

export function uploadTrafficExcelImport({
	file,
	searchParams,
	suppressErrorNotification,
}: UploadTrafficExcelImportParams) {
	const body = new FormData();
	body.append("file", file);

	return request
		.post("performances/traffic/excel-import/", {
			searchParams: compactSearchParams(searchParams),
			body,
			suppressErrorNotification,
		})
		.json<TrafficExcelImportResponse>();
}

export function updateTrafficExcelImport({
	serviceId,
	file,
	searchParams,
	suppressErrorNotification,
}: UpdateTrafficExcelImportParams) {
	const body = new FormData();
	body.append("service_id", String(serviceId));
	body.append("file", file);
	body.append("sh_year", String(searchParams.sh_year));
	body.append("sh_month", String(searchParams.sh_month));
	body.append("company_type", searchParams.company_type);

	return request
		.put("performances/traffic/excel-update-import/", {
			body,
			suppressErrorNotification,
		})
		.json<TrafficExcelUpdateResponse>();
}

export async function downloadTrafficUpdateTemplate({
	serviceId,
	sh_year,
	sh_month,
	company_type,
}: {
	serviceId: number
	sh_year: number
	sh_month: number
	company_type: string
}) {
	const blob = await request
		.put("performances/traffic/excel-update-template/", {
			searchParams: compactSearchParams({
				service_id: serviceId,
				sh_year,
				sh_month,
				company_type,
			}),
			json: null,
		})
		.blob();

	return blob;
}

export async function downloadPerformanceTemplate(
	service: "traffic" | "commercial",
	params: Record<string, string | number | boolean | null | undefined>,
) {
	const path = service === "traffic"
		? "performances/traffic/excel-template/"
		: `performances/${service}/template/`;

	const blob = await request
		.get(path, {
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

export function importSmsGatewayPerformance(shYear: number, shMonth: number, confirmed: boolean) {
	return request
		.post("sms-gateway/manual-import/", {
			json: { sh_year: shYear, sh_month: shMonth, confirmed },
		})
		.json<SmsGatewayManualImportResponse>();
}

export function fetchUnregisteredPerformanceList(params: UnregisterdPerformanceListQuery) {
	return request
		.get("performances/report/missing-contract-performances/", {
			searchParams: compactSearchParams(params as Record<string, unknown>),
		})
		.json<Paginated<PerformanceListItem>>();
}

export function fetchPerformanceReportAvailability(
	serviceId: number,
	shPeriods?: string[],
	companyType?: string | null,
	periodType?: PerformanceReportPeriodType | null,
) {
	const periods = (shPeriods ?? [])
		.map(item => String(item ?? "").trim())
		.filter(Boolean)
		.join(",");

	return request
		.get("performances/report/availability/", {
			searchParams: compactSearchParams({
				service_id: serviceId,
				sh_periods: periods,
				company_type: companyType,
				period_type: periodType,
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

export function fetchPredictionPerformanceSummary(params: PredictionSummaryQuery) {
	return request
		.get("performances/report/predictions-performance-summary/", {
			searchParams: compactSearchParams(params as unknown as Record<string, unknown>),
		})
		.json<PredictionSummaryResponse>();
}
