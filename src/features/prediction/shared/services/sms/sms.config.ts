import type {
	PredictionMetricCode,
	PredictionShareSectionValue,
	SmsChannelCode,
	SmsChannelSharesValue,
	SmsManualSharesValue,
	SmsPredictionServiceFields,
} from "../../model/prediction.form.types";
import { getCompanyTypeToken } from "../../model/company-type.helpers";

export const SMS_CHANNEL_OPTIONS = [
	{ key: "IRANCELL_FA", titleKey: "prediction.smsChannels.IRANCELL_FA" },
	{ key: "IRANCELL_EN", titleKey: "prediction.smsChannels.IRANCELL_EN" },
	{ key: "MCI_FA", titleKey: "prediction.smsChannels.MCI_FA" },
	{ key: "MCI_EN", titleKey: "prediction.smsChannels.MCI_EN" },
	{ key: "OTHER_FA", titleKey: "prediction.smsChannels.OTHER_FA" },
	{ key: "OTHER_EN", titleKey: "prediction.smsChannels.OTHER_EN" },
] as const satisfies ReadonlyArray<{
	key: SmsChannelCode
	titleKey: string
}>;

function createEmptyShareSection(): PredictionShareSectionValue {
	return {
		mode: "auto",
		selectedCompanyIds: [],
		shares: {},
	};
}

export function createEmptySmsManualShares(): SmsManualSharesValue {
	return {
		value: createEmptyShareSection(),
		income: createEmptyShareSection(),
		expense: createEmptyShareSection(),
	};
}

export function createEmptySmsChannelMetricShares() {
	return Object.fromEntries(
		SMS_CHANNEL_OPTIONS.map(channel => [channel.key, null]),
	) as Record<SmsChannelCode, number | null>;
}

export function createEmptySmsChannelShares(): SmsChannelSharesValue {
	return {
		value: createEmptySmsChannelMetricShares(),
		income: createEmptySmsChannelMetricShares(),
		expense: createEmptySmsChannelMetricShares(),
	};
}

export const SMS_METRIC_KEYS = ["value", "income", "expense"] as const satisfies readonly PredictionMetricCode[];

export function createEmptySmsFields(
	previous?: Record<string, unknown>,
): SmsPredictionServiceFields {
	return {
		companyType: getCompanyTypeToken(previous?.companyType),
		q1Percent: null,
		q2Percent: null,
		q3Percent: null,
		q4Percent: null,
		valueYear: null,
		incomeYear: null,
		expenseYear: null,
		priceBuy: null,
		priceSell: null,
		manualShares: createEmptySmsManualShares(),
		channels: createEmptySmsChannelShares(),
	};
}
