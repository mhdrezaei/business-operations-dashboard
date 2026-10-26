import type { ContractServicePath } from "../../api/contracts.api";
import type { ContractApprovalFilter, ContractListItemType, ContractListUser, ContractsListQuery } from "./contracts.list.types";
import { resolveContractServicePath } from "../../shared/model/contract-service-path";
import { isSmsVendorCompany, pickCompanyTypeToken } from "../../shared/utils";

/** Column dataIndex → backend `ordering_fields` name, where they differ. */
export const CONTRACT_LIST_SORT_ALIASES: Record<string, string> = { end_date: "end_date_exclusive" };

export const CONTRACT_LIST_DEFAULT_PAGE_SIZE = 20;
export const CONTRACT_LIST_PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

const APPROVAL_FILTERS = new Set<string>(["true", "false", "pending"]);

/** Values of the search form (`current`/`pageSize` come from ProTable). Select values arrive as strings. */
export interface ContractListFormParams {
	current?: number
	pageSize?: number
	search?: string
	service_id?: number | string
	company_id?: number | string
	company_type?: string
	is_official?: string | boolean
	sms_party?: string
	is_business_approved?: string
	is_signed?: string
	real_signed?: string | boolean
}

function toBoolean(value: unknown) {
	if (value === true || value === "true")
		return true;
	return value === false || value === "false" ? false : undefined;
}

function toApprovalFilter(value: unknown) {
	return typeof value === "string" && APPROVAL_FILTERS.has(value) ? value as ContractApprovalFilter : undefined;
}

export function toContractListQuery(params: ContractListFormParams, ordering?: string): ContractsListQuery {
	return {
		page: params.current ?? 1,
		page_size: params.pageSize ?? CONTRACT_LIST_DEFAULT_PAGE_SIZE,
		search: params.search || undefined,
		service_id: params.service_id ? Number(params.service_id) : undefined,
		company_id: params.company_id ? Number(params.company_id) : undefined,
		company_type: params.company_type || undefined,
		is_official: toBoolean(params.is_official),
		sms_party: params.sms_party === "vendor" || params.sms_party === "client" ? params.sms_party : undefined,
		is_business_approved: toApprovalFilter(params.is_business_approved),
		is_signed: toApprovalFilter(params.is_signed),
		real_signed: toBoolean(params.real_signed),
		ordering,
	};
}

/**
 * The list API does not return the SMS party: use the explicit field if present, otherwise the
 * internal `SMS_VENDOR` company marks the "operators and government" party (same as old `getSmsPartyFromRow`).
 */
export function resolveSmsParty(row: Pick<ContractListItemType, "sms_party" | "company_name">): "vendor" | "client" {
	if (row.sms_party === "vendor" || row.sms_party === "client")
		return row.sms_party;
	return isSmsVendorCompany({ name: row.company_name }) ? "vendor" : "client";
}

export function resolveListServicePath(row: ContractListItemType, serviceCode: string | null | undefined): ContractServicePath {
	const code = String(serviceCode ?? "").trim().toLowerCase();
	if (code === "sms")
		return resolveSmsParty(row) === "client" ? "sms/client" : "sms/vendor";

	const path = resolveContractServicePath({ serviceCode: code, companyType: pickCompanyTypeToken(row.company_type) });
	if (path)
		return path;
	return code === "sales_agency" || code === "sales-agency" ? "sales-agency/outbound" : "openapi";
}

export type ContractPdfBlockReason = "psp" | "unofficialTraffic";

/** PSP has no cost/revenue calculations and unofficial traffic contracts have no PDF (old list rules). */
export function getContractPdfBlockReason(path: ContractServicePath, isOfficial: boolean | null | undefined): ContractPdfBlockReason | null {
	if (path === "psp")
		return "psp";
	return path === "traffic" && isOfficial === false ? "unofficialTraffic" : null;
}

export function formatContractMonth(year: number | null | undefined, month: number | null | undefined) {
	return year && month ? `${year}/${month}` : null;
}

export function getContractListUserName(user: ContractListUser | null | undefined) {
	return [user?.first_name, user?.last_name].map(part => String(part ?? "").trim()).filter(Boolean).join(" ") || null;
}
