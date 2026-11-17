import type { Paginated } from "#src/api/types";
import type {
	SmsGatewayCustomerDto,
	SmsGatewayMappingDto,
	SmsGatewayMappingPayload,
} from "../model/sms-gateway.types";
import { fetchAllPages } from "#src/api/fetch-all-pages";
import { request } from "#src/utils/request";

function toItems<T>(data: T[] | Paginated<T>): T[] {
	return Array.isArray(data) ? data : data.results;
}

export async function listSmsGatewayCustomers() {
	const data = await request
		.get("sms-gateway/customers/")
		.json<SmsGatewayCustomerDto[] | Paginated<SmsGatewayCustomerDto>>();

	return toItems(data);
}

export async function listSmsGatewayMappings(params?: {
	company?: number
	gateway_customer_id?: number
}) {
	const searchParams: Record<string, string> = {};
	if (params?.company)
		searchParams.company = String(params.company);
	if (params?.gateway_customer_id)
		searchParams.gateway_customer_id = String(params.gateway_customer_id);

	const { results } = await fetchAllPages(page => request
		.get("sms-gateway/mappings/", { searchParams: { ...searchParams, page: String(page) } })
		.json<SmsGatewayMappingDto[] | Paginated<SmsGatewayMappingDto>>());

	return results;
}

export async function createSmsGatewayMapping(payload: SmsGatewayMappingPayload) {
	return request
		.post("sms-gateway/mappings/", { json: payload })
		.json<SmsGatewayMappingDto>();
}

export async function updateSmsGatewayMapping(mappingId: number, payload: SmsGatewayMappingPayload) {
	return request
		.put(`sms-gateway/mappings/${mappingId}/`, { json: payload })
		.json<SmsGatewayMappingDto>();
}

export async function deleteSmsGatewayMapping(mappingId: number) {
	await request.delete(`sms-gateway/mappings/${mappingId}/`);
}
