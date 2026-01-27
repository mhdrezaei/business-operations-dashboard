import type { ContractTypeValue } from "./contract-type.types";
import { z } from "zod";

const tierRowSchema = z.object({
	from: z.number().nullable(),
	to: z.number().nullable(),
	fee: z.number().nullable(),
});

const contractTypeEnum = z.preprocess(
	v => (v === "" || v == null ? null : v),
	z.enum(["fixed", "tier_fixed", "tier_variable", "tier_blended"])
		.nullable()
		.catch(null),
);

const blendedModeEnum = z.preprocess(
	v => (v === "" || v == null ? null : v),
	z.enum(["fixed", "variable"])
		.nullable()
		.catch(null),
);

export const contractTypeSchema: z.ZodType<ContractTypeValue> = z
	.object({
		type: contractTypeEnum,
		fixedAmount: z.number().nullable(),
		rows: z.array(tierRowSchema),
		sections: z.array(
			z.object({
				mode: blendedModeEnum,
				rows: z.array(tierRowSchema),
			}),
		),
	})
	.superRefine((val, ctx) => {
		// نوع قرارداد
		if (val.type == null) {
			ctx.addIssue({
				code: "custom",
				path: ["type"],
				message: "نوع قرارداد الزامی است",
			});
			return;
		}

		// ثابت
		if (val.type === "fixed") {
			if (val.fixedAmount == null) {
				ctx.addIssue({
					code: "custom",
					path: ["fixedAmount"],
					message: "مبلغ ثابت الزامی است",
				});
			}
			return;
		}

		// پلکانی ثابت/متغیر
		if (val.type === "tier_fixed" || val.type === "tier_variable") {
			if (!val.rows?.length) {
				ctx.addIssue({
					code: "custom",
					path: ["rows"],
					message: "حداقل یک ردیف باید اضافه شود",
				});
				return;
			}

			val.rows.forEach((r, i) => {
				if (r.from == null) {
					ctx.addIssue({ code: "custom", path: ["rows", i, "from"], message: "از الزامی است" });
				}
				if (r.to == null) {
					ctx.addIssue({ code: "custom", path: ["rows", i, "to"], message: "تا الزامی است" });
				}
				if (r.fee == null) {
					ctx.addIssue({ code: "custom", path: ["rows", i, "fee"], message: "مقدار فی الزامی است" });
				}
				if (r.from != null && r.to != null && r.from > r.to) {
					ctx.addIssue({ code: "custom", path: ["rows", i, "to"], message: "مقدار «تا» باید بزرگتر از «از» باشد" });
				}
			});
			return;
		}

		// پلکانی تلفیقی
		if (val.type === "tier_blended") {
			if (!val.sections?.length) {
				ctx.addIssue({
					code: "custom",
					path: ["sections"],
					message: "حداقل یک بخش باید اضافه شود",
				});
				return;
			}

			val.sections.forEach((s, si) => {
				if (s.mode == null) {
					ctx.addIssue({
						code: "custom",
						path: ["sections", si, "mode"],
						message: "نوع این بخش الزامی است",
					});
				}
				if (!s.rows?.length) {
					ctx.addIssue({
						code: "custom",
						path: ["sections", si, "rows"],
						message: "حداقل یک ردیف برای این بخش لازم است",
					});
				}
				s.rows?.forEach((r, ri) => {
					if (r.from == null)
						ctx.addIssue({ code: "custom", path: ["sections", si, "rows", ri, "from"], message: "از الزامی است" });
					if (r.to == null)
						ctx.addIssue({ code: "custom", path: ["sections", si, "rows", ri, "to"], message: "تا الزامی است" });
					if (r.fee == null)
						ctx.addIssue({ code: "custom", path: ["sections", si, "rows", ri, "fee"], message: "مقدار فی الزامی است" });
					if (r.from != null && r.to != null && r.from > r.to) {
						ctx.addIssue({ code: "custom", path: ["sections", si, "rows", ri, "to"], message: "مقدار «تا» باید بزرگتر از «از» باشد" });
					}
				});
			});
		}
	});
