import type { ContractTypeValue } from "#src/features/contract/create/model/contract.form.types";
import type { ApiPricing } from "./contract.dto";
import { apiTiersToRows, rowsToApiTiers } from "./tiers.mapper";

export function apiPricingToContractType(p: ApiPricing | null | undefined): ContractTypeValue {
	if (!p) {
		return { type: null, fixedAmount: null, rows: [{ from: null, to: null, fee: null }], sections: [] };
	}

	if (p.calculation_type === "TIER_SINGLE") {
		return {
			type: "tier_fixed", // اگر لازم است دقیق‌تر کنی (fixed/variable) همینجا تصمیم می‌گیری
			fixedAmount: null,
			rows: apiTiersToRows(p.tiers),
			sections: [],
		};
	}

	if (p.calculation_type === "FIXED") {
		return {
			type: "fixed",
			fixedAmount: null, // اگر p.amount دارید اینجا بگذار
			rows: [{ from: null, to: null, fee: null }],
			sections: [],
		};
	}

	// TIER_BLENDED -> sections (اگر دارید)
	return { type: null, fixedAmount: null, rows: [{ from: null, to: null, fee: null }], sections: [] };
}

export function contractTypeToApiPricing(v: ContractTypeValue): ApiPricing | null {
	if (!v?.type)
		return null;

	if (v.type === "fixed") {
		return {
			calculation_type: "FIXED",
			// amount: n2s(v.fixedAmount) ?? "0",
		};
	}

	if (v.type === "tier_fixed" || v.type === "tier_variable") {
		return {
			calculation_type: "TIER_SINGLE",
			tiers: rowsToApiTiers(v.rows),
		};
	}

	if (v.type === "tier_blended") {
		return {
			calculation_type: "TIER_BLENDED",
			// tiers یا ساختار بخش‌بندی اگر بک‌اند این را پشتیبانی می‌کند
		};
	}

	return null;
}
