import { fetchCompaniesByService } from "#src/api/common/common.api";
import { queryOptions } from "@tanstack/react-query";
import { listSmsGatewayCustomers, listSmsGatewayMappings } from "../api/sms-gateway.api";

export function smsGatewayCustomersQuery() {
	return queryOptions({
		queryKey: ["sms-gateway", "customers"],
		queryFn: listSmsGatewayCustomers,
		staleTime: 30 * 1000,
	});
}

export function smsGatewayCompaniesQuery(serviceId: number | null) {
	return queryOptions({
		queryKey: ["sms-gateway", "companies", { serviceId }],
		queryFn: () => fetchCompaniesByService(serviceId!, { pageSize: 1000 }),
		enabled: !!serviceId,
		staleTime: 2 * 60 * 1000,
	});
}

export function smsGatewayMappingsByCompanyQuery(companyId: number | null) {
	return queryOptions({
		queryKey: ["sms-gateway", "mappings", { companyId }],
		queryFn: () => listSmsGatewayMappings({ company: companyId! }),
		enabled: !!companyId,
	});
}

export function smsGatewayMappingsByCustomerQuery(gatewayCustomerId: number | null) {
	return queryOptions({
		queryKey: ["sms-gateway", "mappings", { gatewayCustomerId }],
		queryFn: () => listSmsGatewayMappings({ gateway_customer_id: gatewayCustomerId! }),
		enabled: !!gatewayCustomerId,
	});
}
