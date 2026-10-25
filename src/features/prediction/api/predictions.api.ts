import type { Paginated } from "#src/api/types";
import type { PredictionListParams } from "../shared/model/prediction.list.types";
import { request } from "#src/utils/request";

export type OpenApiAmountPrefix = "bill_inquiry" | "receipt_register" | "bill_inquiry_midterm" | "bill_inquiry_endterm" | "receipt_register_connected" | "receipt_register_disconnected";
export type OpenApiAmountKey = `${OpenApiAmountPrefix}_${"value" | "income" | "expense"}_year`;

export interface OpenApiPredictionYearDto extends Partial<Record<OpenApiAmountKey, string | number | null>> {
	id: number
	service: number
	fiscal_year: number
	openapi_model: string | null
	q1_percent: number | null
	q2_percent: number | null
	q3_percent: number | null
	q4_percent: number | null
	manual_shares: Record<string, unknown> | null
	note: string | null
	created_at: string
	updated_at: string
}

export interface OpenApiPredictionPayload extends Partial<Record<OpenApiAmountKey, number>> {
	service: number
	fiscal_year: number
	openapi_model?: string
	q1_percent: number
	q2_percent: number
	q3_percent: number
	q4_percent: number
	manual_shares: Record<string, unknown>
	note: string
}

export interface PspPredictionYearDto {
	id: number
	service: number
	fiscal_year: number
	company_type?: string | Record<string, string> | null
	value_year: string | number | null
	income_year: string | number | null
	q1_percent: number | null
	q2_percent: number | null
	q3_percent: number | null
	q4_percent: number | null
	manual_shares: Record<string, unknown> | null
	note: string | null
	created_at: string
	updated_at: string
}

export interface PspPredictionPayload {
	service: number
	fiscal_year: number
	company_type?: string
	value_year: number
	income_year: number
	q1_percent: number
	q2_percent: number
	q3_percent: number
	q4_percent: number
	manual_shares: Record<string, unknown>
	note: string
}

export type ShahkarPredictionYearDto = PspPredictionYearDto;
export type ShahkarPredictionPayload = PspPredictionPayload;

export interface SmsPredictionYearDto {
	id: number
	service: number
	fiscal_year: number
	company_type?: string | Record<string, string> | null
	value_year: string | number | null
	income_year: string | number | null
	expense_year: string | number | null
	price_buy: string | number | null
	price_sell: string | number | null
	q1_percent: number | null
	q2_percent: number | null
	q3_percent: number | null
	q4_percent: number | null
	manual_shares: Record<string, unknown> | null
	note: string | null
	created_at: string
	updated_at: string
}

export interface SmsPredictionPayload {
	service: number
	fiscal_year: number
	company_type: string
	value_year: number
	income_year: number
	expense_year: number
	price_buy: number
	price_sell: number
	q1_percent: number
	q2_percent: number
	q3_percent: number
	q4_percent: number
	manual_shares: Record<string, unknown>
	note: string
}

export interface TrafficPredictionLocationDto {
	location: string | null
	value_year: string | number | null
	value_receive_year: string | number | null
	income_year: string | number | null
	expense_year: string | number | null
}

export interface TrafficPredictionYearDto {
	id: number
	service: number
	fiscal_year: number
	company_type: string | Record<string, string> | null
	locations: TrafficPredictionLocationDto[] | null
	q1_percent: number | null
	q2_percent: number | null
	q3_percent: number | null
	q4_percent: number | null
	manual_shares: Record<string, unknown> | null
	note: string | null
	created_at: string
	updated_at: string
}

export interface TrafficPredictionLocationPayload {
	location: string
	value_year: number
	value_receive_year: number
	income_year: number
	expense_year: number
}

export interface TrafficPredictionPayload {
	service: number
	fiscal_year: number
	company_type: string
	locations: TrafficPredictionLocationPayload[]
	q1_percent: number
	q2_percent: number
	q3_percent: number
	q4_percent: number
	manual_shares: Record<string, unknown>
	note: string
}

// backend max page size: one fiscal year per service/company type, so a single page holds every record
const PREDICTION_YEARS_PAGE_SIZE = 100;

function buildPredictionListSearchParams(params: PredictionListParams) {
	return Object.fromEntries(
		Object.entries(params).filter(([, value]) => value != null && value !== ""),
	);
}

export function deletePrediction(service: "openapi" | "psp" | "shahkar" | "sms" | "traffic", id: number) {
	const paths = {
		openapi: `predictions/openapi/years/${id}/`,
		psp: `predictions/psp/years/${id}/`,
		shahkar: `predictions/shahkar/years/${id}/`,
		sms: `predictions/sms/years/${id}/`,
		traffic: `predictions/traffic/years/${id}/`,
	};

	return request.delete(paths[service]).json<unknown>();
}

export function fetchOpenApiPredictionYears(serviceId: number) {
	return request
		.get("predictions/openapi/years/", {
			searchParams: { service: serviceId, page_size: PREDICTION_YEARS_PAGE_SIZE },
		})
		.json<Paginated<OpenApiPredictionYearDto>>();
}

export function listOpenApiPredictions(params: PredictionListParams) {
	return request
		.get("predictions/openapi/years/", {
			searchParams: buildPredictionListSearchParams(params),
		})
		.json<Paginated<OpenApiPredictionYearDto>>();
}

export function createOpenApiPrediction(payload: OpenApiPredictionPayload) {
	return request
		.post("predictions/openapi/years/", {
			json: payload,
		})
		.json<OpenApiPredictionYearDto>();
}

export function updateOpenApiPrediction(id: number, payload: OpenApiPredictionPayload) {
	return request
		.put(`predictions/openapi/years/${id}/`, {
			json: payload,
		})
		.json<OpenApiPredictionYearDto>();
}

export function fetchPspPredictionYears(serviceId: number, companyType?: string | null) {
	return request
		.get("predictions/psp/years/", {
			searchParams: buildPredictionListSearchParams({
				service: serviceId,
				company_type: companyType ?? undefined,
				page_size: PREDICTION_YEARS_PAGE_SIZE,
			}),
		})
		.json<Paginated<PspPredictionYearDto>>();
}

export function listPspPredictions(params: PredictionListParams) {
	return request
		.get("predictions/psp/years/", {
			searchParams: buildPredictionListSearchParams(params),
		})
		.json<Paginated<PspPredictionYearDto>>();
}

export function createPspPrediction(payload: PspPredictionPayload) {
	return request
		.post("predictions/psp/years/", {
			json: payload,
		})
		.json<PspPredictionYearDto>();
}

export function updatePspPrediction(id: number, payload: PspPredictionPayload) {
	return request
		.put(`predictions/psp/years/${id}/`, {
			json: payload,
		})
		.json<PspPredictionYearDto>();
}

export function fetchShahkarPredictionYears(serviceId: number) {
	return request
		.get("predictions/shahkar/years/", {
			searchParams: { service: serviceId, page_size: PREDICTION_YEARS_PAGE_SIZE },
		})
		.json<Paginated<ShahkarPredictionYearDto>>();
}

export function listShahkarPredictions(params: PredictionListParams) {
	return request
		.get("predictions/shahkar/years/", {
			searchParams: buildPredictionListSearchParams(params),
		})
		.json<Paginated<ShahkarPredictionYearDto>>();
}

export function createShahkarPrediction(payload: ShahkarPredictionPayload) {
	return request
		.post("predictions/shahkar/years/", {
			json: payload,
		})
		.json<ShahkarPredictionYearDto>();
}

export function updateShahkarPrediction(id: number, payload: ShahkarPredictionPayload) {
	return request
		.put(`predictions/shahkar/years/${id}/`, {
			json: payload,
		})
		.json<ShahkarPredictionYearDto>();
}

export function fetchSmsPredictionYears(serviceId: number, companyType?: string | null) {
	return request
		.get("predictions/sms/years/", {
			searchParams: buildPredictionListSearchParams({
				service: serviceId,
				company_type: companyType ?? undefined,
				page_size: PREDICTION_YEARS_PAGE_SIZE,
			}),
		})
		.json<Paginated<SmsPredictionYearDto>>();
}

export function listSmsPredictions(params: PredictionListParams) {
	return request
		.get("predictions/sms/years/", {
			searchParams: buildPredictionListSearchParams(params),
		})
		.json<Paginated<SmsPredictionYearDto>>();
}

export function createSmsPrediction(payload: SmsPredictionPayload) {
	return request
		.post("predictions/sms/years/", {
			json: payload,
		})
		.json<SmsPredictionYearDto>();
}

export function updateSmsPrediction(id: number, payload: SmsPredictionPayload) {
	return request
		.put(`predictions/sms/years/${id}/`, {
			json: payload,
		})
		.json<SmsPredictionYearDto>();
}

export function fetchTrafficPredictionYears(serviceId: number, companyType?: string | null) {
	return request
		.get("predictions/traffic/years/", {
			searchParams: buildPredictionListSearchParams({
				service: serviceId,
				company_type: companyType ?? undefined,
				page_size: PREDICTION_YEARS_PAGE_SIZE,
			}),
		})
		.json<Paginated<TrafficPredictionYearDto>>();
}

export function listTrafficPredictions(params: PredictionListParams) {
	return request
		.get("predictions/traffic/years/", {
			searchParams: buildPredictionListSearchParams(params),
		})
		.json<Paginated<TrafficPredictionYearDto>>();
}

export function createTrafficPrediction(payload: TrafficPredictionPayload) {
	return request
		.post("predictions/traffic/years/", {
			json: payload,
		})
		.json<TrafficPredictionYearDto>();
}

export function updateTrafficPrediction(id: number, payload: TrafficPredictionPayload) {
	return request
		.put(`predictions/traffic/years/${id}/`, {
			json: payload,
		})
		.json<TrafficPredictionYearDto>();
}
