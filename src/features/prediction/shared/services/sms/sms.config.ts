import type {
	PredictionShareSectionValue,
	SmsManualSharesValue,
	SmsPredictionServiceFields,
} from "../../model/prediction.form.types";

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

export function createEmptySmsFields(): SmsPredictionServiceFields {
	return {
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
	};
}
