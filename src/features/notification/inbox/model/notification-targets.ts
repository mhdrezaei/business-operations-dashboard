import { toPositiveInt } from "#src/api/notifications";
import { resolveContractServicePath } from "#src/features/contract/shared/model/contract-service-path";
import { buildContractEditPath } from "#src/features/contract/shared/utils/contract-routes";
import { buildUnregisteredPerformanceSearch } from "#src/features/performance/shared/model/performance-registration-preset";

import { isSmsVendorCompany } from "./notification-events";

type PerformancePreset = Parameters<typeof buildUnregisteredPerformanceSearch>[0];

/** A company / contract row coming from `data.companies` or `data.items` of a notification. */
export type NotificationEntry = Record<string, unknown>;

interface NotificationTargetContext {
	/** notification `data` */
	data: Record<string, unknown>
	/** service id -> service code (user's accessible services) */
	serviceCodeById: ReadonlyMap<number, string>
}

function readText(...values: unknown[]) {
	for (const value of values) {
		const text = String(value ?? "").trim();
		if (text)
			return text;
	}
	return "";
}

/** `company_type` can be a plain code or an object keyed by the code (old `normalizeCompanyTypeCode`). */
export function readCompanyTypeCode(value: unknown) {
	if (value && typeof value === "object" && !Array.isArray(value))
		return Object.keys(value)[0]?.trim().toUpperCase() ?? "";
	return readText(value).toUpperCase();
}

function resolveServiceCode(context: NotificationTargetContext, entry: NotificationEntry) {
	const serviceId = toPositiveInt(entry.service_id ?? context.data.service_id);
	return readText(entry.service_code, context.data.service_code, serviceId ? context.serviceCodeById.get(serviceId) : "");
}

function isSmsService(serviceCode: string, serviceName: string) {
	const code = serviceCode.toLowerCase();
	const name = serviceName.toLowerCase();
	return code === "sms" || code.startsWith("sms/") || name.includes("sms") || name.includes("پیامک");
}

/** Edit form of the contract a notification entry refers to; null when the service path cannot be resolved. */
export function buildNotificationContractEditPath(context: NotificationTargetContext, entry: NotificationEntry) {
	const serviceId = toPositiveInt(entry.service_id ?? context.data.service_id);
	const contractId = toPositiveInt(entry.contract_id);
	if (!serviceId || !contractId)
		return null;

	const serviceCode = resolveServiceCode(context, entry);
	const companyType = readCompanyTypeCode(entry.company_type ?? context.data.company_type) || null;
	const isSmsVendor = isSmsVendorCompany(entry.company_name);
	const isSms = isSmsService(serviceCode, readText(entry.service_name, context.data.service_name));
	const service = resolveContractServicePath({
		serviceCode: isSms ? "sms" : serviceCode,
		companyType,
		counterpartyType: isSmsVendor ? "gov_ops" : isSms ? "partners" : null,
	});

	return service ? buildContractEditPath({ contractId, service, serviceId, companyType }) : null;
}

/** "ثبت عملکرد": new performance form pre-filled from the missing-performance notification. */
export function buildNotificationPerformanceNewTarget(context: NotificationTargetContext, entry: NotificationEntry) {
	const serviceId = toPositiveInt(entry.service_id ?? context.data.service_id);
	const companyId = toPositiveInt(entry.company_id);
	const year = toPositiveInt(context.data.target_sh_year);
	const month = toPositiveInt(context.data.target_sh_month);
	const serviceCode = resolveServiceCode(context, entry);
	if (!serviceId || !companyId || !year || !month || !serviceCode)
		return null;

	const preset: PerformancePreset = {
		serviceId,
		serviceCode: serviceCode.toLowerCase() as PerformancePreset["serviceCode"],
		companyId,
		companyType: readCompanyTypeCode(entry.company_type ?? context.data.company_type) || null,
		salesAgentId: null,
		year,
		month,
	};
	return `/performances/new${buildUnregisteredPerformanceSearch(preset, `notification-${companyId}-${year}-${month}`)}`;
}

export function buildNotificationSignFlowPath(data: Record<string, unknown>) {
	const flowId = toPositiveInt(data.flow_id);
	return flowId ? `/contracts/sign-flows/${flowId}` : null;
}
