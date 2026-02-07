import type { ContractTypeValue } from "./contract-type.types";
import { z } from "zod";
import { zNullableArrayFa, zNullableNumberFa } from "./zod-fa-helpers";

const tierRowSchema = z.object({
	from: zNullableNumberFa(),
	to: zNullableNumberFa(),
	fee: zNullableNumberFa(),
});

const contractTypeEnum = z.preprocess(
	v => (v === "" || v == null ? null : v),
	z.enum(["fixed", "tier_fixed", "tier_variable", "tier_blended"]).nullable().catch(null),
);

const blendedModeEnum = z.preprocess(
	v => (v === "" || v == null ? null : v),
	z.enum(["fixed", "variable"]).nullable().catch(null),
);

export const contractTypeSchema: z.ZodType<ContractTypeValue> = z
	.object({
		type: contractTypeEnum,

		// ✅ مهم: این جلوی expected number received undefined را می‌گیرد
		fixedAmount: zNullableNumberFa(),

		// ✅ همیشه آرایه
		rows: zNullableArrayFa(tierRowSchema),

		sections: z.preprocess(
			v => (Array.isArray(v) ? v : []),
			z.array(
				z.object({
					mode: blendedModeEnum,
					rows: zNullableArrayFa(tierRowSchema),
				}),
			),
		),
	})
	.superRefine((val, ctx) => {
		if (val.type == null) {
			ctx.addIssue({ code: "custom", path: ["type"], message: "نوع قرارداد الزامی است" });
			return;
		}

		if (val.type === "fixed") {
			if (val.fixedAmount == null) {
				ctx.addIssue({ code: "custom", path: ["fixedAmount"], message: "مبلغ ثابت الزامی است" });
			}
			return;
		}

		if (val.type === "tier_fixed" || val.type === "tier_variable") {
			if (!val.rows.length) {
				ctx.addIssue({ code: "custom", path: ["rows"], message: "حداقل یک ردیف باید اضافه شود" });
				return;
			}

			val.rows.forEach((r, i) => {
				if (r.from == null)
					ctx.addIssue({ code: "custom", path: ["rows", i, "from"], message: "از الزامی است" });
				if (r.to == null)
					ctx.addIssue({ code: "custom", path: ["rows", i, "to"], message: "تا الزامی است" });
				if (r.fee == null)
					ctx.addIssue({ code: "custom", path: ["rows", i, "fee"], message: "مقدار فی الزامی است" });
				if (r.from != null && r.to != null && r.from > r.to) {
					ctx.addIssue({ code: "custom", path: ["rows", i, "to"], message: "مقدار «تا» باید بزرگتر از «از» باشد" });
				}
				// ✅ from ردیف جدید نباید کمتر از to ردیف قبلی باشد
				if (i > 0) {
					const prevTo = val.rows[i - 1]?.to;
					if (prevTo != null && r.from != null && r.from < prevTo) {
						ctx.addIssue({
							code: "custom",
							path: ["rows", i, "from"],
							message: "مقدار «از» باید از «تا» ردیف قبلی شروع شود",
						});
					}
				}
			});
			return;
		}

		if (val.type === "tier_blended") {
			if (!val.sections.length) {
				ctx.addIssue({ code: "custom", path: ["sections"], message: "حداقل یک بخش باید اضافه شود" });
				return;
			}

			val.sections.forEach((s, si) => {
				if (s.mode == null)
					ctx.addIssue({ code: "custom", path: ["sections", si, "mode"], message: "نوع این بخش الزامی است" });
				if (!s.rows.length)
					ctx.addIssue({ code: "custom", path: ["sections", si, "rows"], message: "حداقل یک ردیف برای این بخش لازم است" });

				s.rows.forEach((r, ri) => {
					if (r.from == null)
						ctx.addIssue({ code: "custom", path: ["sections", si, "rows", ri, "from"], message: "از الزامی است" });
					if (r.to == null)
						ctx.addIssue({ code: "custom", path: ["sections", si, "rows", ri, "to"], message: "تا الزامی است" });
					if (r.fee == null)
						ctx.addIssue({ code: "custom", path: ["sections", si, "rows", ri, "fee"], message: "مقدار فی الزامی است" });
					if (r.from != null && r.to != null && r.from > r.to) {
						ctx.addIssue({ code: "custom", path: ["sections", si, "rows", ri, "to"], message: "مقدار «تا» باید بزرگتر از «از» باشد" });
					}
					if (ri > 0) {
						const prevTo = s.rows[ri - 1]?.to;
						if (prevTo != null && r.from != null && r.from < prevTo) {
							ctx.addIssue({
								code: "custom",
								path: ["sections", si, "rows", ri, "from"],
								message: "مقدار «از» باید از «تا» ردیف قبلی شروع شود",
							});
						}
					}
				});
			});
		}
	});
