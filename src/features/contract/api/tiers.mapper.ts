import type { FormTierRow } from "#src/features/contract/create/model/contract.form.types";
import type { ApiTier } from "./contract.dto";

function s2n(v: string | number | null | undefined): number | null {
	if (v === null || v === undefined || v === "")
		return null;

	const n = typeof v === "number" ? v : Number(v);
	return Number.isFinite(n) ? n : null;
}

export function apiTiersToRows(tiers?: ApiTier[]): FormTierRow[] {
	if (!tiers?.length)
		return [{ from: null, to: null, fee: null }];
	return tiers.map(t => ({
		from: s2n(t.min_inclusive),
		to: s2n(t.max_exclusive),
		fee: s2n(t.rate_per_unit),
	}));
}

export function rowsToApiTiers(rows: FormTierRow[]): ApiTier[] {
	// نکته: بک‌اند شما max_exclusive را می‌تواند null بگیرد (آخرین tier)
	// اینجا بهتره rows خالی را [] بدی و اعتبارسنجی با Zod انجام شود.
	return (rows ?? []).map(r => ({
		min_inclusive: String(r.from ?? 0),
		max_exclusive: r.to == null ? null : String(r.to),
		rate_per_unit: String(r.fee ?? 0),
	}));
}
