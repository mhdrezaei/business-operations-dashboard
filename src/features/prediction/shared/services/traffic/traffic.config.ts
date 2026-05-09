import type {
	TrafficCompanyType,
	TrafficLocationCode,
	TrafficManualSharesValue,
	TrafficPredictionLocationFormValue,
	TrafficPredictionMetricCode,
	TrafficPredictionServiceFields,
} from "../../model/prediction.form.types";

export const TRAFFIC_COMPANY_TYPE_OPTIONS: Array<{ label: TrafficCompanyType, value: TrafficCompanyType }> = [
	{ label: "COLLOCATION", value: "COLLOCATION" },
	{ label: "CP", value: "CP" },
	{ label: "IXP", value: "IXP" },
	{ label: "TCI", value: "TCI" },
	{ label: "PREMIUM", value: "PREMIUM" },
];

export const TRAFFIC_LOCATION_OPTIONS = [
	{ labelKey: "prediction.locations.tehran", value: "TEHRAN" },
	{ labelKey: "prediction.locations.province", value: "COUNTY" },
] as const satisfies Array<{ labelKey: string, value: TrafficLocationCode }>;

export const TRAFFIC_METRICS = [
	{ key: "value", titleKey: "prediction.metrics.value" },
	{ key: "valueReceive", titleKey: "prediction.metrics.valueReceive" },
	{ key: "income", titleKey: "prediction.metrics.income" },
	{ key: "expense", titleKey: "prediction.metrics.expense" },
] as const satisfies Array<{ key: TrafficPredictionMetricCode, titleKey: string }>;

export function isTrafficCompanyType(value: unknown): value is TrafficCompanyType {
	return TRAFFIC_COMPANY_TYPE_OPTIONS.some(option => option.value === value);
}

export function isTrafficLocationCode(value: unknown): value is TrafficLocationCode {
	return TRAFFIC_LOCATION_OPTIONS.some(option => option.value === value);
}

export function normalizeTrafficLocationCode(value: unknown): TrafficLocationCode | null {
	if (value === "PROVINCE")
		return "COUNTY";

	return isTrafficLocationCode(value)
		? value
		: null;
}

export function createEmptyTrafficLocation(
	location: TrafficLocationCode | null = "TEHRAN",
): TrafficPredictionLocationFormValue {
	return {
		location,
		valueYear: null,
		valueReceiveYear: null,
		incomeYear: null,
		expenseYear: null,
	};
}

function createEmptyShareSection() {
	return {
		mode: "auto" as const,
		selectedCompanyIds: [],
		shares: {},
	};
}

export function createEmptyTrafficManualShares(): TrafficManualSharesValue {
	return {
		TEHRAN: {
			value: createEmptyShareSection(),
			valueReceive: createEmptyShareSection(),
			income: createEmptyShareSection(),
			expense: createEmptyShareSection(),
		},
		COUNTY: {
			value: createEmptyShareSection(),
			valueReceive: createEmptyShareSection(),
			income: createEmptyShareSection(),
			expense: createEmptyShareSection(),
		},
	};
}

export function createEmptyTrafficFields(
	previous?: Record<string, unknown>,
): TrafficPredictionServiceFields {
	const previousCompanyType = isTrafficCompanyType(previous?.companyType)
		? previous.companyType
		: null;

	return {
		companyType: previousCompanyType,
		q1Percent: null,
		q2Percent: null,
		q3Percent: null,
		q4Percent: null,
		locations: [createEmptyTrafficLocation()],
		manualShares: createEmptyTrafficManualShares(),
	};
}
