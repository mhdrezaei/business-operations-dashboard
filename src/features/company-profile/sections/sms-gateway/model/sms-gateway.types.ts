export interface SmsGatewayCustomerDto {
	id: number
	value: string
	is_mapped: boolean
	mapped_company_id: number | null
	mapped_company_name: string | null
}

export interface SmsGatewayMappingDto {
	id: number
	company: number
	company_name: string
	service: number
	service_code: string
	gateway_customer_id: number
	gateway_customer_name: string
	created_at: string
	updated_at: string
	created_by: number | null
	updated_by: number | null
}

export interface CreateSmsGatewayMappingPayload {
	company: number
	gateway_customer_id: number
}
