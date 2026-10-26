import { addendumSchema } from "#src/features/contract/components/addenda/addenda.schema.js";
import { contractTypeSchema } from "#src/features/contract/components/contract-type/contract-type.schema";
import { i18n } from "#src/locales";
import { z } from "zod";
import { packagePlanSchema, validatePackagePlans } from "./openapi.package.schema";
import { separatedPricingSchema } from "./openapi.separated.schema";

const contractModelSchema = z.preprocess(
	(v) => {
		if (v === "" || v == null)
			return null;
		if (typeof v === "string")
			return v.trim().toLowerCase();
		return v;
	},
	z.enum(["separated", "legacy", "package"]).nullable().catch(null),
);

type IssuePath = Array<string | number>;

/** هر الحاقیه تفکیکی/بسته باید اطلاعات مدل خودش را کامل داشته باشد (فیلد خاص OpenAPI، پس اینجا بررسی می‌شود نه در schema عمومی الحاقیه). */
function validateModelAddenda(addenda: unknown, path: IssuePath, ctx: z.RefinementCtx) {
	(Array.isArray(addenda) ? addenda : []).forEach((addendum: Record<string, unknown>, index) => {
		const addendumPath = [...path, index];
		if (addendum?.contractModel === "separated") {
			const result = separatedPricingSchema.safeParse(addendum.separatedPricing);
			if (!result.success) {
				result.error.issues.forEach(issue => ctx.addIssue({ code: "custom", path: [...addendumPath, "separatedPricing", ...issue.path.map(String)], message: issue.message }));
			}
		}
		if (addendum?.contractModel === "package") {
			const plans = z.array(packagePlanSchema).safeParse(addendum.plans ?? []);
			if (!plans.success)
				plans.error.issues.forEach(issue => ctx.addIssue({ code: "custom", path: [...addendumPath, "plans", ...issue.path.map(String)], message: issue.message }));
			validatePackagePlans(addendum.packageMode, plans.success ? plans.data : [], ctx, addendumPath);
		}
		validateModelAddenda(addendum?.children, [...addendumPath, "children"], ctx);
	});
}

export const openApiServiceFieldsSchema = z
	.object({
		contractModel: contractModelSchema,
		addenda: z.array(addendumSchema).default([]).optional(),
		separatedPricing: separatedPricingSchema.optional(),
		// قرارداد «بسته»: فقط در ویرایش قابل مشاهده است (فرم ایجاد مدل بسته ندارد)
		packageMode: z.string().nullable().optional(),
		plans: z.array(packagePlanSchema).optional(),

		legacyPricing: z
			.object({
				paymentRegistration: contractTypeSchema,
				billInquiry: contractTypeSchema,
			})
			.optional(),
	})
	.superRefine((val, ctx) => {
		validateModelAddenda(val.addenda, ["addenda"], ctx);
		if (val.contractModel == null) {
			ctx.addIssue({
				code: "custom",
				path: ["contractModel"],
				message: i18n.t("contract.openapi.modelRequired"),
			});
			return;
		}

		if (val.contractModel === "package")
			validatePackagePlans(val.packageMode, val.plans ?? [], ctx);

		if (val.contractModel === "separated") {
			if (!val.separatedPricing) {
				ctx.addIssue({
					code: "custom",
					path: ["separatedPricing"],
					message: i18n.t("contract.openapi.separatedIncomplete"),
				});
			}
		}
	});
