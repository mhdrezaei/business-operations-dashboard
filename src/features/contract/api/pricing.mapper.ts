import type { ContractTypeValue } from "#src/features/contract/shared/model/contract.form.types.js";
import type { ApiPricing } from "./contract.dto";
import { apiTiersToRows, rowsToApiTiers } from "./tiers.mapper";

type ApiPricingTiers = NonNullable<ApiPricing["tiers"]>;

function normalizeApiTiers(value: ApiPricing["tiers"]): ApiPricingTiers {
	if (Array.isArray(value))
		return value;
	if (value && typeof value === "object")
		return value;
	return [];
}

function toBlendedMode(mode: unknown): "fixed" | "variable" | null {
	const raw = String(mode ?? "").trim().toUpperCase();
	if (raw === "FIXED" || raw === "SINGLE")
		return "fixed";
	if (raw === "PROGRESSIVE")
		return "variable";
	return null;
}

function toApiSegmentMode(mode: unknown): "FIXED" | "PROGRESSIVE" | null {
	if (mode === "fixed")
		return "FIXED";
	if (mode === "variable")
		return "PROGRESSIVE";
	return null;
}

export function apiPricingToContractType(p: ApiPricing | null | undefined): ContractTypeValue {
	const defaultRows = [
		{ from: null, to: null, fee: null },
		{ from: null, to: null, fee: null },
	];

	if (!p) {
		return { type: null, fixedAmount: null, rows: defaultRows, sections: [] };
	}

	if (p.calculation_type === "TIER_SINGLE") {
		const tiers = normalizeApiTiers(p.tiers);
		return {
			type: "tier_fixed",
			fixedAmount: null,
			rows: apiTiersToRows(Array.isArray(tiers) ? tiers : []),
			sections: [],
		};
	}

	if (p.calculation_type === "TIER_PROGRESSIVE") {
		const tiers = normalizeApiTiers(p.tiers);
		return {
			type: "tier_variable",
			fixedAmount: null,
			rows: apiTiersToRows(Array.isArray(tiers) ? tiers : []),
			sections: [],
		};
	}

	if (p.calculation_type === "FLAT") {
		const tiers = normalizeApiTiers(p.tiers);
		const firstRateRaw = Array.isArray(tiers) ? tiers[0]?.rate_per_unit : null;
		const firstRate = firstRateRaw == null || firstRateRaw === "" ? null : Number(firstRateRaw);
		return {
			type: "fixed",
			fixedAmount: Number.isFinite(firstRate) ? firstRate : null,
			rows: defaultRows,
			sections: [],
		};
	}

	if (p.calculation_type === "TIER_MIXED") {
		const tiers = normalizeApiTiers(p.tiers);
		const segments = !Array.isArray(tiers) && Array.isArray(tiers?.segments) ? tiers.segments : [];

		return {
			type: "tier_blended",
			fixedAmount: null,
			rows: defaultRows,
			sections: segments.map((segment) => {
				const segmentTiers = Array.isArray(segment?.tiers) ? segment.tiers : [];
				return {
					mode: toBlendedMode(segment?.mode),
					rows: apiTiersToRows(segmentTiers),
				};
			}),
		};
	}

	return { type: null, fixedAmount: null, rows: defaultRows, sections: [] };
}

export function contractTypeToApiPricing(v: ContractTypeValue): ApiPricing | null {
	if (!v?.type)
		return null;

	if (v.type === "fixed") {
		return {
			calculation_type: "FLAT",
			tiers: [{
				min_inclusive: null,
				max_exclusive: null,
				rate_per_unit: String(v.fixedAmount ?? 0),
			}],
		};
	}

	if (v.type === "tier_fixed") {
		return {
			calculation_type: "TIER_SINGLE",
			tiers: rowsToApiTiers(v.rows),
		};
	}

	if (v.type === "tier_variable") {
		return {
			calculation_type: "TIER_PROGRESSIVE",
			tiers: rowsToApiTiers(v.rows),
		};
	}

	if (v.type === "tier_blended") {
		const segments: Array<{ mode: "FIXED" | "PROGRESSIVE", tiers: ReturnType<typeof rowsToApiTiers> }> = [];
		for (const section of v.sections ?? []) {
			const mode = toApiSegmentMode(section?.mode);
			const tiers = rowsToApiTiers(section?.rows ?? []);
			if (!mode || !tiers.length)
				continue;
			segments.push({ mode, tiers });
		}

		return {
			calculation_type: "TIER_MIXED",
			tiers: {
				segments,
			},
		};
	}

	return null;
}
