import type {
	PredictionShareSectionValue,
	SmsChannelCode,
	SmsChannelSharesValue,
	SmsManualSharesValue,
	SmsPredictionServiceFields,
} from "../../model/prediction.form.types";
import { getCompanyTypeToken } from "../../model/company-type.helpers";

export const SMS_CHANNEL_OPTIONS = [
	{ key: "IRANCELL_FA", title: "ایرانسل - فارسی" },
	{ key: "IRANCELL_EN", title: "ایرانسل - انگلیسی" },
	{ key: "MCI_FA", title: "همراه اول - فارسی" },
	{ key: "MCI_EN", title: "همراه اول - انگلیسی" },
	{ key: "OTHER_FA", title: "سایر - فارسی" },
	{ key: "OTHER_EN", title: "سایر - انگلیسی" },
] as const satisfies ReadonlyArray<{
	key: SmsChannelCode
	title: string
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

export function createEmptySmsChannelShares(): SmsChannelSharesValue {
	return {
		value: Object.fromEntries(
			SMS_CHANNEL_OPTIONS.map(channel => [channel.key, null]),
		) as Record<SmsChannelCode, number | null>,
	};
}

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
