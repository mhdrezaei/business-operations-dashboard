import type { Paginated } from "#src/api/types";
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

export function fetchOpenApiPredictionYears(serviceId: number) {
	return request
		.get("predictions/openapi/years/", {
			searchParams: { service: serviceId },
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

export function fetchPspPredictionYears(serviceId: number) {
	return request
		.get("predictions/psp/years/", {
			searchParams: { service: serviceId },
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
			searchParams: { service: serviceId },
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

export function fetchSmsPredictionYears(serviceId: number) {
	return request
		.get("predictions/sms/years/", {
			searchParams: { service: serviceId },
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

export function fetchTrafficPredictionYears(serviceId: number) {
	return request
		.get("predictions/traffic/years/", {
			searchParams: { service: serviceId },
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
