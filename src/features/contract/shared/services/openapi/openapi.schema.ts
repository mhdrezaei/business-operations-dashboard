import { addendumSchema } from "#src/features/contract/components/addenda/addenda.schema.js";
import { contractTypeSchema } from "#src/features/contract/components/contract-type/contract-type.schema";
import { z } from "zod";
import { zNullableNonNegative, zNullablePercent } from "../../../shared/model/zod-helpers";

const contractModelSchema = z.preprocess(
	(v) => {
		if (v === "" || v == null)
			return null;
		if (typeof v === "string")
			return v.trim().toLowerCase();
		return v;
	},
	z.enum(["package", "separated", "legacy"]).nullable().catch(null),
);

const packageModeSchema = z.preprocess(
	v => (v === "" || v == null ? null : v),
	z.enum(["OR", "AND"]).nullable().catch(null),
);

const openApiPlanSchema = z.object({
	smsMin: zNullableNonNegative("حداقل پیامک را وارد کنید"),
	smsMax: zNullableNonNegative("حداکثر پیامک را وارد کنید"),
	smsFixedPrice: zNullableNonNegative("نرخ فروش پیامک را وارد کنید"),
	billPartnerShare: zNullablePercent("سهم شریک باید بین 0 تا 100 باشد"),
	billKarashabShare: zNullablePercent("سهم کاراشاب باید بین 0 تا 100 باشد"),
	billMin: zNullableNonNegative("حداقل استعلام قبض را وارد کنید"),
	billMax: zNullableNonNegative("حداکثر استعلام قبض را وارد کنید"),
	billFixedPrice: zNullableNonNegative("نرخ استعلام قبض را وارد کنید"),
	trafficProfitPercent: zNullablePercent("درصد سود ترافیک باید بین 0 تا 100 باشد"),
	trafficPartnerSharePercent: zNullablePercent("درصد سهم شریک ترافیک باید بین 0 تا 100 باشد"),
}).superRefine((plan, ctx) => {
	if (plan.smsMin != null && plan.smsMax != null && plan.smsMin > plan.smsMax)
		ctx.addIssue({ code: "custom", path: ["smsMax"], message: "حداکثر پیامک باید بزرگ‌تر یا مساوی حداقل باشد" });
	if (plan.billMin != null && plan.billMax != null && plan.billMin > plan.billMax)
		ctx.addIssue({ code: "custom", path: ["billMax"], message: "حداکثر استعلام قبض باید بزرگ‌تر یا مساوی حداقل باشد" });
	if (plan.billPartnerShare != null && plan.billKarashabShare != null && plan.billPartnerShare + plan.billKarashabShare !== 100)
		ctx.addIssue({ code: "custom", path: ["billKarashabShare"], message: "جمع سهم شریک و کاراشاب باید 100٪ باشد" });
});

const separatedPricingSchema = z.object({
	walletChargeDiscountPercent: zNullablePercent("درصد تخفیف باید بین 0 تا 100 باشد"),
	midPeriodBillInquiry: contractTypeSchema,
	endPeriodBillInquiry: contractTypeSchema,
	connectedReceiptRegister: contractTypeSchema,
	connectedKarashabSharePercent: zNullablePercent("درصد سهم کاراشاب باید بین 0 تا 100 باشد"),
	connectedPartnerSharePercent: zNullablePercent("درصد سهم طرف قرارداد باید بین 0 تا 100 باشد"),
	disconnectedReceiptRegister: contractTypeSchema,
	disconnectedKarashabSharePercent: zNullablePercent("درصد سهم کاراشاب باید بین 0 تا 100 باشد"),
	disconnectedPartnerSharePercent: zNullablePercent("درصد سهم طرف قرارداد باید بین 0 تا 100 باشد"),
});

export const openApiServiceFieldsSchema = z
	.object({
		contractModel: contractModelSchema,
		packageMode: packageModeSchema,
		plans: z.array(openApiPlanSchema).optional(),
		addenda: z.array(addendumSchema).default([]).optional(),
		separatedPricing: separatedPricingSchema.optional(),

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
				message: "نوع قرارداد الزامی است",
			});
			return;
		}

		if (val.contractModel === "separated") {
			if (!val.separatedPricing) {
				ctx.addIssue({
					code: "custom",
					path: ["separatedPricing"],
					message: "اطلاعات مدل تفکیکی را تکمیل کنید",
				});
			}
		}

		if (val.contractModel === "package") {
			if (val.packageMode == null)
				ctx.addIssue({ code: "custom", path: ["packageMode"], message: "حالت بسته الزامی است" });
			if (!val.plans || val.plans.length < 1) {
				ctx.addIssue({ code: "custom", path: ["plans"], message: "حداقل یک پلن باید اضافه شود" });
				return;
			}
			for (let i = 1; i < val.plans.length; i++) {
				const previous = val.plans[i - 1];
				const current = val.plans[i];
				if (previous && current && current.smsMin !== previous.smsMax)
					ctx.addIssue({ code: "custom", path: ["plans", i, "smsMin"], message: "حداقل پیامک این پلن باید برابر حداکثر پیامک پلن قبلی باشد" });
				if (previous && current && current.billMin !== previous.billMax)
					ctx.addIssue({ code: "custom", path: ["plans", i, "billMin"], message: "حداقل استعلام قبض این پلن باید برابر حداکثر استعلام قبض پلن قبلی باشد" });
			}
		}
	});
