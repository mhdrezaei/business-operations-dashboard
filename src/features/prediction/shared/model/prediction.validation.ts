import i18next from "i18next";
import { z } from "zod";

export function requiredNonNegativeNumber(message: string) {
	return z.number({ message }).refine(value => value >= 0, { message });
}

const quarterRangeMessage = i18next.t("prediction.validation.quarters.range");

export const quarterPercentSchema = z.number()
	.int({ message: quarterRangeMessage })
	.min(1, { message: quarterRangeMessage })
	.max(100, { message: quarterRangeMessage })
	.nullable();

/** Adds the quarter issues; returns false when the quarters are incomplete so callers can stop validating. */
export function addQuarterIssues(
	quarters: [number | null, number | null, number | null, number | null],
	ctx: z.RefinementCtx,
) {
	if (quarters.some(item => item == null)) {
		const firstThreeFilled = quarters.slice(0, 3).every(item => item != null);
		ctx.addIssue({
			code: "custom",
			path: ["q1Percent"],
			message: i18next.t(firstThreeFilled
				? "prediction.validation.quarters.sumOfThreeTooLarge"
				: "prediction.validation.quarters.allRequired"),
		});
		return false;
	}

	const quarterTotal = quarters.reduce<number>((total, item) => total + Number(item), 0);
	if (quarterTotal !== 100) {
		ctx.addIssue({
			code: "custom",
			path: ["q1Percent"],
			message: i18next.t("prediction.validation.quarters.sumMustBeHundred"),
		});
	}

	return true;
}
