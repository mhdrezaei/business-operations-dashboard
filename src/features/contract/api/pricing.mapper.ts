import type { ContractTypeValue } from "#src/features/contract/shared/model/contract.form.types.js";
import type { ApiPricing } from "./contract.dto";
import { apiTiersToRows, rowsToApiTiers } from "./tiers.mapper";

export function apiPricingToContractType(p: ApiPricing | null | undefined): ContractTypeValue {
	const defaultRows = [
		{ from: null, to: null, fee: null },
		{ from: null, to: null, fee: null },
	];

	if (!p) {
		return { type: null, fixedAmount: null, rows: defaultRows, sections: [] };
	}

	if (p.calculation_type === "TIER_SINGLE") {
		return {
			type: "tier_fixed",
			fixedAmount: null,
			rows: apiTiersToRows(p.tiers),
			sections: [],
		};
	}

	if (p.calculation_type === "TIER_PROGRESSIVE") {
		return {
			type: "tier_variable",
			fixedAmount: null,
			rows: apiTiersToRows(p.tiers),
			sections: [],
		};
	}

	if (p.calculation_type === "FLAT") {
		const firstRateRaw = p.tiers?.[0]?.rate_per_unit;
		const firstRate = firstRateRaw == null || firstRateRaw === "" ? null : Number(firstRateRaw);
		return {
			type: "fixed",
			fixedAmount: Number.isFinite(firstRate) ? firstRate : null,
			rows: defaultRows,
			sections: [],
		};
	}

	if (p.calculation_type === "TIER_MIXED") {
		return {
			type: "tier_blended",
			fixedAmount: null,
			rows: defaultRows,
			sections: [],
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
		return {
			calculation_type: "TIER_MIXED",
			tiers: rowsToApiTiers(v.rows),
		};
	}

	return null;
}
