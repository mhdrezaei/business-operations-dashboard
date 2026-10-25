import { i18n } from "#src/locales";
import { z } from "zod";
import { emptyToNull } from "../../model/zod-helpers";

const SHARE_TOTAL = 100;

const optionalNumber = z.preprocess(emptyToNull, z.coerce.number().nullable());

export const packagePlanSchema = z
	.object({
		smsMin: optionalNumber,
		smsMax: optionalNumber,
		smsFixedPrice: optionalNumber,
		billMin: optionalNumber,
		billMax: optionalNumber,
		billFixedPrice: optionalNumber,
		billPartnerShare: optionalNumber,
		billKarashabShare: optionalNumber,
		trafficProfitPercent: optionalNumber,
		trafficPartnerSharePercent: optionalNumber,
	})
	.superRefine((plan, ctx) => {
		const issue = (path: string, key: string) => ctx.addIssue({ code: "custom", path: [path], message: i18n.t(`contract.openapi.package.errors.${key}`) });

		if (plan.billPartnerShare == null)
			issue("billPartnerShare", "partnerShareRequired");
		if (plan.billKarashabShare == null)
			issue("billKarashabShare", "karashabShareRequired");
		else if (plan.billPartnerShare != null && plan.billPartnerShare + plan.billKarashabShare !== SHARE_TOTAL)
			issue("billKarashabShare", "sharesTotal");

		if (plan.smsFixedPrice == null)
			issue("smsFixedPrice", "fixedPriceRequired");
		if (plan.billFixedPrice == null)
			issue("billFixedPrice", "fixedPriceRequired");

		if (plan.trafficProfitPercent == null || plan.trafficProfitPercent < 0 || plan.trafficProfitPercent > 100)
			issue("trafficProfitPercent", "trafficProfitRange");
		if (plan.trafficPartnerSharePercent == null || plan.trafficPartnerSharePercent < 0 || plan.trafficPartnerSharePercent > 100)
			issue("trafficPartnerSharePercent", "trafficShareRange");
	});

/** قاعده‌های بین‌پلنی old: min هر پلن باید برابر max پلن قبلی باشد (هر دو بخش پیامک و استعلام قبض). */
export function validatePackagePlans(mode: unknown, plans: Array<z.infer<typeof packagePlanSchema>>, ctx: z.RefinementCtx, path: Array<string | number> = []) {
	if (!mode)
		ctx.addIssue({ code: "custom", path: [...path, "packageMode"], message: i18n.t("contract.openapi.package.errors.modeRequired") });

	plans.forEach((plan, index) => {
		const previous = plans[index - 1];
		if (!previous)
			return;
		if (String(plan.smsMin ?? "") !== String(previous.smsMax ?? ""))
			ctx.addIssue({ code: "custom", path: [...path, "plans", index, "smsMin"], message: i18n.t("contract.openapi.package.errors.smsContinuity") });
		if (String(plan.billMin ?? "") !== String(previous.billMax ?? ""))
			ctx.addIssue({ code: "custom", path: [...path, "plans", index, "billMin"], message: i18n.t("contract.openapi.package.errors.billContinuity") });
	});
}
