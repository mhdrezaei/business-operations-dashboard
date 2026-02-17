import type { ContractTypeValue } from "#src/features/contract/shared/model/contract.form.types.js";
import type { ApiPricing } from "./contract.dto";
import { apiTiersToRows, rowsToApiTiers } from "./tiers.mapper";

export function apiPricingToContractType(p: ApiPricing | null | undefined): ContractTypeValue {
	if (!p) {
		return { type: null, fixedAmount: null, rows: [{ from: null, to: null, fee: null }], sections: [] };
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
		return {
			type: "fixed",
			fixedAmount: null,
			rows: [{ from: null, to: null, fee: null }],
			sections: [],
		};
	}

	if (p.calculation_type === "TIER_MIXED") {
		return {
			type: "tier_blended",
			fixedAmount: null,
			rows: [{ from: null, to: null, fee: null }],
			sections: [],
		};
	}

	return { type: null, fixedAmount: null, rows: [{ from: null, to: null, fee: null }], sections: [] };
}

export function contractTypeToApiPricing(v: ContractTypeValue): ApiPricing | null {
	if (!v?.type)
		return null;

	if (v.type === "fixed") {
		return {
			calculation_type: "FLAT",
			tiers: rowsToApiTiers(v.rows),
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
