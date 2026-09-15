import type {
	CreateSmsGatewayMappingPayload,
	SmsGatewayCustomerDto,
	SmsGatewayMappingDto,
} from "../model/sms-gateway.types";
import { request } from "#src/utils/request";

interface PaginatedResponse<T> {
	results: T[]
}

function toItems<T>(data: T[] | PaginatedResponse<T>): T[] {
	return Array.isArray(data) ? data : data.results;
}

export async function listSmsGatewayCustomers() {
	const data = await request
		.get("sms-gateway/customers/")
		.json<SmsGatewayCustomerDto[] | PaginatedResponse<SmsGatewayCustomerDto>>();

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

	const data = await request
		.get("sms-gateway/mappings/", { searchParams })
		.json<SmsGatewayMappingDto[] | PaginatedResponse<SmsGatewayMappingDto>>();

	return toItems(data);
}

export async function createSmsGatewayMapping(payload: CreateSmsGatewayMappingPayload) {
	return request
		.post("sms-gateway/mappings/", { json: payload })
		.json<SmsGatewayMappingDto>();
}

export async function deleteSmsGatewayMapping(mappingId: number) {
	await request.delete(`sms-gateway/mappings/${mappingId}/`);
}
