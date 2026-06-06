import type { BlendedSectionMode, ContractType } from "./contract-type.types";

export const CONTRACT_TYPE_OPTIONS: { label: string, value: ContractType }[] = [
	{ label: "ثابت", value: "fixed" },
	{ label: "پلکانی ثابت", value: "tier_fixed" },
	{ label: "پلکانی متغیر", value: "tier_variable" },
	{ label: "پلکانی تلفیقی", value: "tier_blended" },
];

export const BLENDED_MODE_OPTIONS: { label: string, value: BlendedSectionMode }[] = [
	{ label: "محاسبه به روش پلکانی ثابت", value: "fixed" },
	{ label: "محاسبه به روش پلکانی متغیر", value: "variable" },
];
