import { z } from "zod";
import {
	zNullableNonNegative,
	zNullablePercent,
} from "../../model/zod-helpers";

/**
 * اسکیما هر پلن
 */
const openApiPlanSchema = z
	.object({
		// --- SMS ---
		smsMin: zNullableNonNegative("حداقل پیامک را وارد کنید"),
		smsMax: zNullableNonNegative("حداکثر پیامک را وارد کنید"),
		smsFixedPrice: zNullableNonNegative("نرخ فروش پیامک را وارد کنید"),

		// --- Bill Inquiry ---
		billPartnerShare: zNullablePercent("سهم شریک باید بین 0 تا 100 باشد"),
		billKarashabShare: zNullablePercent("سهم کاراشاب باید بین 0 تا 100 باشد"),
		billMin: zNullableNonNegative("حداقل استعلام قبض را وارد کنید"),
		billMax: zNullableNonNegative("حداکثر استعلام قبض را وارد کنید"),
		billFixedPrice: zNullableNonNegative("نرخ استعلام قبض را وارد کنید"),

		// --- Traffic commission ---
		trafficCommissionPercent: zNullablePercent("کارمزد باید بین 0 تا 100 باشد"),
	})
	.superRefine((val, ctx) => {
		// ✅ min/max پیامک
		if (val.smsMin != null && val.smsMax != null && val.smsMin > val.smsMax) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["smsMax"],
				message: "حداکثر پیامک باید بزرگ‌تر یا مساوی حداقل باشد",
			});
		}

		// ✅ min/max قبض
		if (val.billMin != null && val.billMax != null && val.billMin > val.billMax) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["billMax"],
				message: "حداکثر استعلام قبض باید بزرگ‌تر یا مساوی حداقل باشد",
			});
		}

		// ✅ جمع سهم‌ها باید 100 باشد (وقتی هر دو وارد شده‌اند)
		if (val.billPartnerShare != null && val.billKarashabShare != null) {
			const sum = val.billPartnerShare + val.billKarashabShare;
			if (sum !== 100) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["billKarashabShare"],
					message: "جمع سهم شریک و کاراشاب باید 100٪ باشد",
				});
			}
		}
	});

/**
 * serviceFields مخصوص openapi
 */
export const openApiServiceFieldsSchema = z.object({
	contractModel: z.enum(["package"]).nullable(),
	packageMode: z.enum(["OR", "AND"]).nullable(),
	plans: z.array(openApiPlanSchema).min(1, "حداقل یک پلن باید اضافه شود"),
});
