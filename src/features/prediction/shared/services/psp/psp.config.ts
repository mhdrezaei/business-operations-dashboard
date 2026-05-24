import type {
	PredictionShareSectionValue,
	PspManualSharesValue,
	PspPredictionServiceFields,
	YearlyValueIncomeManualSharesValue,
} from "../../model/prediction.form.types";
import { getCompanyTypeToken } from "../../model/company-type.helpers";

function createEmptyShareSection(): PredictionShareSectionValue {
	return {
		mode: "auto",
		selectedCompanyIds: [],
		shares: {},
	};
}

export function createEmptyYearlyValueIncomeManualShares(): YearlyValueIncomeManualSharesValue {
	return {
		value: createEmptyShareSection(),
		income: createEmptyShareSection(),
	};
}

export function createEmptyYearlyValueIncomeFields(
	previous?: Record<string, unknown>,
): PspPredictionServiceFields {
	return {
		companyType: getCompanyTypeToken(previous?.companyType),
		q1Percent: null,
		q2Percent: null,
		q3Percent: null,
		q4Percent: null,
		valueYear: null,
		incomeYear: null,
		manualShares: createEmptyYearlyValueIncomeManualShares(),
	};
}

export function createEmptyPspManualShares(): PspManualSharesValue {
	return createEmptyYearlyValueIncomeManualShares();
}

export function createEmptyPspFields(
	previous?: Record<string, unknown>,
): PspPredictionServiceFields {
	return createEmptyYearlyValueIncomeFields(previous);
}
