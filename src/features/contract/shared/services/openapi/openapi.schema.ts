import { addendumSchema } from "#src/features/contract/components/addenda/addenda.schema.js";
import { contractTypeSchema } from "#src/features/contract/components/contract-type/contract-type.schema";
import { z } from "zod";
import {
	zNullableNonNegative,
	zNullablePercent,
} from "../../../shared/model/zod-helpers";

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
		trafficProfitPercent: zNullablePercent("درصد سود ترافیک باید بین 0 تا 100 باشد"),
		trafficPartnerSharePercent: zNullablePercent("درصد سهم شریک ترافیک باید بین 0 تا 100 باشد"),

	})
	.superRefine((val, ctx) => {
		// ✅ min/max SMS
		if (val.smsMin != null && val.smsMax != null && val.smsMin > val.smsMax) {
			ctx.addIssue({
				code: "custom",
				path: ["smsMax"],
				message: "حداکثر پیامک باید بزرگ‌تر یا مساوی حداقل باشد",
			});
		}

		// ✅ min/max bill
		if (val.billMin != null && val.billMax != null && val.billMin > val.billMax) {
			ctx.addIssue({
				code: "custom",
				path: ["billMax"],
				message: "حداکثر استعلام قبض باید بزرگ‌تر یا مساوی حداقل باشد",
			});
		}

		// ✅ The sum of the shares must be 100 (when both are entered)
		if (val.billPartnerShare != null && val.billKarashabShare != null) {
			const sum = val.billPartnerShare + val.billKarashabShare;
			if (sum !== 100) {
				ctx.addIssue({
					code: "custom",
					path: ["billKarashabShare"],
					message: "جمع سهم شریک و کاراشاب باید 100٪ باشد",
				});
			}
		}
	});

const contractModelSchema = z.preprocess(
	(v) => {
		if (v === "" || v == null)
			return null;
		if (typeof v === "string")
			return v.trim().toLowerCase();
		return v;
	},
	z.enum(["package", "legacy"]).nullable().catch(null),
);

const packageModeSchema = z.preprocess(
	v => (v === "" || v == null ? null : v),
	z.enum(["OR", "AND"]).nullable().catch(null),
);

export const openApiServiceFieldsSchema = z
	.object({
		contractModel: contractModelSchema,
		packageMode: packageModeSchema,

		plans: z.array(openApiPlanSchema).optional(),
		addenda: z.array(addendumSchema).default([]).optional(),

		legacyPricing: z
			.object({
				paymentRegistration: contractTypeSchema,
				billInquiry: contractTypeSchema,
			})
			.optional(),
	})
	.superRefine((val, ctx) => {
		if (val.contractModel == null) {
			ctx.addIssue({
				code: "custom",
				path: ["contractModel"],
				message: "روش محاسبه قیمت الزامی است",
			});
			return;
		}

		if (val.contractModel === "package") {
			if (val.packageMode == null) {
				ctx.addIssue({
					code: "custom",
					path: ["packageMode"],
					message: "حالت بسته الزامی است",
				});
			}

			// ✅ Only required in package plan mode
			if (!val.plans || val.plans.length < 1) {
				ctx.addIssue({
					code: "custom",
					path: ["plans"],
					message: "حداقل یک پلن باید اضافه شود",
				});
				return;
			}

			for (let i = 1; i < val.plans.length; i++) {
				const prevPlan = val.plans[i - 1];
				const currentPlan = val.plans[i];
				if (!prevPlan || !currentPlan)
					continue;

				if (currentPlan.smsMin !== prevPlan.smsMax) {
					ctx.addIssue({
						code: "custom",
						path: ["plans", i, "smsMin"],
						message: "حداقل پیامک این پلن باید برابر حداکثر پیامک پلن قبلی باشد",
					});
				}

				if (currentPlan.billMin !== prevPlan.billMax) {
					ctx.addIssue({
						code: "custom",
						path: ["plans", i, "billMin"],
						message: "حداقل استعلام قبض این پلن باید برابر حداکثر استعلام قبض پلن قبلی باشد",
					});
				}
			}
		}
	});
