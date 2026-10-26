import type { PerformanceListRow } from "./performance.list.types";
import { pickCompanyTypeToken } from "#src/features/performance/shared/model/performance.helpers";

function normalizeServiceCode(code: string | null | undefined) {
	return String(code ?? "").trim().toLowerCase();
}

/** Only SMS/traffic report one row per company type, and only they honour the `company_type` query param. */
export function isCompanyTypeFilterService(code: string | null | undefined) {
	const normalized = normalizeServiceCode(code);
	return normalized === "sms" || normalized === "traffic";
}

export function isCompanyTypeColumnService(code: string | null | undefined) {
	return isCompanyTypeFilterService(code) || normalizeServiceCode(code) === "psp";
}

/** The endpoint returns no `id`; one row exists per company/month and, for SMS/traffic, per contract type. */
export function getUnregisteredPerformanceRowKey(record: PerformanceListRow) {
	const row = record as Record<string, unknown>;
	return [
		row.service_id ?? row.service_code ?? row.service_name,
		row.company_id ?? row.company_name,
		row.sh_year,
		row.sh_month,
		pickCompanyTypeToken(row.company_type),
		row.is_official,
		row.collocation_mode,
	].map(value => String(value ?? "")).join("-");
}
