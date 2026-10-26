import { listSmsGatewayCustomers } from "#src/features/company-profile/sections/sms-gateway/api/sms-gateway.api";
import { fetchSmsGatewayDeliveryStatuses, fetchSmsOperatorInvoices } from "#src/features/performance/api/performances.api";
import { queryOptions } from "@tanstack/react-query";

export const smsOperatorInvoicesQueryKey = ["sms-gateway", "operator-invoices"] as const;

export function smsGatewayMappedCompaniesQuery() {
	return queryOptions({
		queryKey: ["sms-gateway", "customers", "mapped-companies"],
		queryFn: async () => {
			const customers = await listSmsGatewayCustomers();
			const companies = new Map<number, { label: string, value: number }>();
			for (const customer of customers) {
				if (customer.is_mapped && customer.mapped_company_id != null)
					companies.set(customer.mapped_company_id, { value: customer.mapped_company_id, label: customer.mapped_company_name ?? `#${customer.mapped_company_id}` });
			}
			return [...companies.values()];
		},
		staleTime: 5 * 60 * 1000,
	});
}

export function smsGatewayDeliveryStatusesQuery() {
	return queryOptions({
		queryKey: ["sms-gateway", "delivery-statuses"],
		queryFn: async () => (await fetchSmsGatewayDeliveryStatuses()).map(status => ({ value: status.id, label: status.value })),
		staleTime: 5 * 60 * 1000,
	});
}

export function smsOperatorInvoicesQuery() {
	return queryOptions({
		queryKey: smsOperatorInvoicesQueryKey,
		queryFn: fetchSmsOperatorInvoices,
	});
}
