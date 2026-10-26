import type { SmsGatewayCustomerDto } from "./sms-gateway.types";

export function getOtherGatewayCustomerNames(
	customers: SmsGatewayCustomerDto[],
	companyId: number | null,
	selectedCustomerId: number | null,
) {
	if (!companyId)
		return [];

	return Array.from(new Set(customers
		.filter(customer => customer.is_mapped)
		.filter(customer => customer.mapped_company_id === companyId)
		.filter(customer => customer.id !== selectedCustomerId)
		.map(customer => customer.value)
		.filter(Boolean)));
}

export function isGatewayUnavailableError(error: unknown) {
	return (error as { response?: { status?: number } } | null)?.response?.status === 502;
}

export function findGatewayCustomerByName(customers: SmsGatewayCustomerDto[], name: string) {
	const normalized = name.trim().toLocaleLowerCase("fa");
	if (!normalized)
		return null;

	return customers.find(customer => customer.value.toLocaleLowerCase("fa") === normalized) ?? null;
}
