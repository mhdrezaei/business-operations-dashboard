import type { Paginated } from "#src/api/types";
import type { PredictionListParams } from "../shared/model/prediction.list.types";
import { request } from "#src/utils/request";

export interface OpenApiPredictionYearDto {
	id: number
	service: number
	fiscal_year: number
	openapi_model: string | null
	bill_inquiry_value_year: string | number | null
	bill_inquiry_income_year: string | number | null
	bill_inquiry_expense_year: string | number | null
	receipt_register_value_year: string | number | null
	receipt_register_income_year: string | number | null
	receipt_register_expense_year: string | number | null
	sms_total_value_year: string | number | null
	sms_total_income_year: string | number | null
	sms_total_expense_year: string | number | null
	traffic_total_value_year: string | number | null
	traffic_total_income_year: string | number | null
	traffic_total_expense_year: string | number | null
	q1_percent: number | null
	q2_percent: number | null
	q3_percent: number | null
	q4_percent: number | null
	manual_shares: Record<string, unknown> | null
	note: string | null
	created_at: string
	updated_at: string
}

export interface OpenApiPredictionPayload {
	service: number
	fiscal_year: number
	openapi_model: string
	bill_inquiry_value_year: number
	bill_inquiry_income_year: number
	bill_inquiry_expense_year: number
	receipt_register_value_year: number
	receipt_register_income_year: number
	receipt_register_expense_year: number
	sms_total_value_year: number
	sms_total_income_year: number
	sms_total_expense_year: number
	traffic_total_value_year: number
	traffic_total_income_year: number
	traffic_total_expense_year: number
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
	company_type: string | null
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

function buildPredictionListSearchParams(params: PredictionListParams) {
	return Object.fromEntries(
		Object.entries(params).filter(([, value]) => value != null && value !== ""),
	);
}

export function fetchOpenApiPredictionYears(serviceId: number) {
	return request
		.get("predictions/openapi/years/", {
			searchParams: { service: serviceId },
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

export function fetchOpenApiPredictionDetail(id: number) {
	return request
		.get(`predictions/openapi/years/${id}/`)
		.json<OpenApiPredictionYearDto>();
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

export function fetchPspPredictionYears(serviceId: number) {
	return request
		.get("prediction/psp/year/", {
			searchParams: { service: serviceId },
		})
		.json<Paginated<PspPredictionYearDto>>();
}

export function listPspPredictions(params: PredictionListParams) {
	return request
		.get("prediction/psp/year/", {
			searchParams: buildPredictionListSearchParams(params),
		})
		.json<Paginated<PspPredictionYearDto>>();
}

export function fetchPspPredictionDetail(id: number) {
	return request
		.get(`prediction/psp/year/${id}/`)
		.json<PspPredictionYearDto>();
}

export function createPspPrediction(payload: PspPredictionPayload) {
	return request
		.post("prediction/psp/year/", {
			json: payload,
		})
		.json<PspPredictionYearDto>();
}

export function updatePspPrediction(id: number, payload: PspPredictionPayload) {
	return request
		.put(`prediction/psp/year/${id}/`, {
			json: payload,
		})
		.json<PspPredictionYearDto>();
}

export function fetchShahkarPredictionYears(serviceId: number) {
	return request
		.get("prediction/shahkar/year/", {
			searchParams: { service: serviceId },
		})
		.json<Paginated<ShahkarPredictionYearDto>>();
}

export function listShahkarPredictions(params: PredictionListParams) {
	return request
		.get("prediction/shahkar/year/", {
			searchParams: buildPredictionListSearchParams(params),
		})
		.json<Paginated<ShahkarPredictionYearDto>>();
}

export function fetchShahkarPredictionDetail(id: number) {
	return request
		.get(`prediction/shahkar/year/${id}/`)
		.json<ShahkarPredictionYearDto>();
}

export function createShahkarPrediction(payload: ShahkarPredictionPayload) {
	return request
		.post("prediction/shahkar/year/", {
			json: payload,
		})
		.json<ShahkarPredictionYearDto>();
}

export function updateShahkarPrediction(id: number, payload: ShahkarPredictionPayload) {
	return request
		.put(`prediction/shahkar/year/${id}/`, {
			json: payload,
		})
		.json<ShahkarPredictionYearDto>();
}

export function fetchSmsPredictionYears(serviceId: number) {
	return request
		.get("prediction/sms/year/", {
			searchParams: { service: serviceId },
		})
		.json<Paginated<SmsPredictionYearDto>>();
}

export function listSmsPredictions(params: PredictionListParams) {
	return request
		.get("prediction/sms/year/", {
			searchParams: buildPredictionListSearchParams(params),
		})
		.json<Paginated<SmsPredictionYearDto>>();
}

export function fetchSmsPredictionDetail(id: number) {
	return request
		.get(`prediction/sms/year/${id}/`)
		.json<SmsPredictionYearDto>();
}

export function createSmsPrediction(payload: SmsPredictionPayload) {
	return request
		.post("prediction/sms/year/", {
			json: payload,
		})
		.json<SmsPredictionYearDto>();
}

export function updateSmsPrediction(id: number, payload: SmsPredictionPayload) {
	return request
		.put(`prediction/sms/year/${id}/`, {
			json: payload,
		})
		.json<SmsPredictionYearDto>();
}

export function fetchTrafficPredictionYears(serviceId: number) {
	return request
		.get("prediction/traffic/year/", {
			searchParams: { service: serviceId },
		})
		.json<Paginated<TrafficPredictionYearDto>>();
}

export function listTrafficPredictions(params: PredictionListParams) {
	return request
		.get("prediction/traffic/year/", {
			searchParams: buildPredictionListSearchParams(params),
		})
		.json<Paginated<TrafficPredictionYearDto>>();
}

export function fetchTrafficPredictionDetail(id: number) {
	return request
		.get(`prediction/traffic/year/${id}/`)
		.json<TrafficPredictionYearDto>();
}

export function createTrafficPrediction(payload: TrafficPredictionPayload) {
	return request
		.post("prediction/traffic/year/", {
			json: payload,
		})
		.json<TrafficPredictionYearDto>();
}

export function updateTrafficPrediction(id: number, payload: TrafficPredictionPayload) {
	return request
		.put(`prediction/traffic/year/${id}/`, {
			json: payload,
		})
		.json<TrafficPredictionYearDto>();
}
