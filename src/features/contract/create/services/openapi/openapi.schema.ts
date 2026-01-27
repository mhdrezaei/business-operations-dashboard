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
const contractModelSchema = z.preprocess(
	v => (v === "" || v == null ? null : v),
	z.enum(["package", "legacy"])
		.nullable()
		.catch(null),
);

const packageModeSchema = z.preprocess(
	v => (v === "" || v == null ? null : v),
	z.enum(["OR", "AND"])
		.nullable()
		.catch(null),
);

export const openApiServiceFieldsSchema = z
	.object({
		contractModel: contractModelSchema,
		packageMode: packageModeSchema,
		plans: z.array(openApiPlanSchema).min(1, "حداقل یک پلن باید اضافه شود"),
	})
	.superRefine((val, ctx) => {
		if (val.contractModel == null) {
			ctx.addIssue({
				code: "custom",
				path: ["contractModel"],
				message: "مدل قرارداد الزامی است",
			});
		}

		if (val.packageMode == null) {
			ctx.addIssue({
				code: "custom",
				path: ["packageMode"],
				message: "نحوه محاسبه بسته الزامی است",
			});
		}
	});
