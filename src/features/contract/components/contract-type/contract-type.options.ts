import type { BlendedSectionMode, ContractType } from "./contract-type.types";

export const CONTRACT_TYPE_OPTIONS: { label: string, value: ContractType }[] = [
	{ label: "ثابت", value: "fixed" },
	{ label: "پلکانی ثابت", value: "tier_fixed" },
	{ label: "پلکانی متغیر", value: "tier_variable" },
	{ label: "پلکانی تلفیقی", value: "tier_blended" },
];

export const BLENDED_MODE_OPTIONS: { label: string, value: BlendedSectionMode }[] = [
	{ label: "پلکانی ثابت در این بخش", value: "fixed" },
	{ label: "پلکانی متغیر در این بخش", value: "variable" },
];
