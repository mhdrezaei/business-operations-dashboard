import { addendumSchema } from "#src/features/contract/components/addenda/addenda.schema.js";
import { contractTypeSchema } from "#src/features/contract/components/contract-type/contract-type.schema";
import { z } from "zod";
import { zNullablePercent } from "../../../shared/model/zod-helpers";

const contractModelSchema = z.preprocess(
	(v) => {
		if (v === "" || v == null)
			return null;
		if (typeof v === "string")
			return v.trim().toLowerCase();
		return v;
	},
	z.enum(["separated", "legacy"]).nullable().catch(null),
);

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
	});
