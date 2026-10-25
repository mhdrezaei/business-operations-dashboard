import type { ContractTypeValue } from "./contract-type.types";
import { i18n } from "#src/locales";
import { z } from "zod";
import { zNullableArrayFa, zNullableNumberFa } from "./zod-fa-helpers";

const tierRowSchema = z.object({
	from: zNullableNumberFa(),
	to: zNullableNumberFa(),
	fee: zNullableNumberFa(),
	ratePercentage: zNullableNumberFa(),
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
		ratePercentage: zNullableNumberFa(),

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
			ctx.addIssue({ code: "custom", path: ["type"], message: i18n.t("contract.type.required") });
			return;
		}

		if (val.type === "fixed") {
			if (val.fixedAmount == null) {
				ctx.addIssue({ code: "custom", path: ["fixedAmount"], message: i18n.t("contract.type.validation.amountRequired") });
			}
			return;
		}

		if (val.type === "tier_fixed" || val.type === "tier_variable") {
			if (!val.rows.length) {
				ctx.addIssue({ code: "custom", path: ["rows"], message: i18n.t("contract.type.validation.rowsRequired") });
				return;
			}

			val.rows.forEach((r, i) => {
				const isLastRow = i === val.rows.length - 1;
				if (r.from == null)
					ctx.addIssue({ code: "custom", path: ["rows", i, "from"], message: i18n.t("contract.type.validation.fromRequired") });
				if (!isLastRow && r.to == null)
					ctx.addIssue({ code: "custom", path: ["rows", i, "to"], message: i18n.t("contract.type.validation.toRequired") });
				if (r.fee == null)
					ctx.addIssue({ code: "custom", path: ["rows", i, "fee"], message: i18n.t("contract.type.validation.amountRequired") });
				if (r.from != null && r.to != null && r.from > r.to) {
					ctx.addIssue({ code: "custom", path: ["rows", i, "to"], message: i18n.t("contract.type.validation.toGreaterThanFrom") });
				}
				// ✅ from ردیف جدید نباید کمتر از to ردیف قبلی باشد
				if (i > 0) {
					const prevTo = val.rows[i - 1]?.to;
					if (prevTo != null && r.from != null && r.from < prevTo) {
						ctx.addIssue({
							code: "custom",
							path: ["rows", i, "from"],
							message: i18n.t("contract.type.validation.fromAfterPrevious"),
						});
					}
				}
			});
			return;
		}

		if (val.type === "tier_blended") {
			if (!val.sections.length) {
				ctx.addIssue({ code: "custom", path: ["sections"], message: i18n.t("contract.type.validation.sectionsRequired") });
				return;
			}

			val.sections.forEach((s, si) => {
				if (s.mode == null)
					ctx.addIssue({ code: "custom", path: ["sections", si, "mode"], message: i18n.t("contract.type.validation.modeRequired") });
				if (!s.rows.length)
					ctx.addIssue({ code: "custom", path: ["sections", si, "rows"], message: i18n.t("contract.type.validation.sectionRowsRequired") });

				s.rows.forEach((r, ri) => {
					const isLastRow = ri === s.rows.length - 1;
					if (r.from == null)
						ctx.addIssue({ code: "custom", path: ["sections", si, "rows", ri, "from"], message: i18n.t("contract.type.validation.fromRequired") });
					if (!isLastRow && r.to == null)
						ctx.addIssue({ code: "custom", path: ["sections", si, "rows", ri, "to"], message: i18n.t("contract.type.validation.toRequired") });
					if (r.fee == null)
						ctx.addIssue({ code: "custom", path: ["sections", si, "rows", ri, "fee"], message: i18n.t("contract.type.validation.amountRequired") });
					if (r.from != null && r.to != null && r.from > r.to) {
						ctx.addIssue({ code: "custom", path: ["sections", si, "rows", ri, "to"], message: i18n.t("contract.type.validation.toGreaterThanFrom") });
					}
					if (ri > 0) {
						const prevTo = s.rows[ri - 1]?.to;
						if (prevTo != null && r.from != null && r.from < prevTo) {
							ctx.addIssue({
								code: "custom",
								path: ["sections", si, "rows", ri, "from"],
								message: i18n.t("contract.type.validation.fromAfterPrevious"),
							});
						}
					}
				});

				if (si > 0) {
					const prevSection = val.sections[si - 1];
					const prevLastRow = prevSection?.rows?.[prevSection.rows.length - 1];
					const currentFirstRow = s.rows?.[0];
					const prevMaxExclusive = prevLastRow?.to ?? null;
					const currentMinInclusive = currentFirstRow?.from ?? null;

					if (
						prevMaxExclusive != null
						&& currentMinInclusive != null
						&& currentMinInclusive !== prevMaxExclusive
					) {
						ctx.addIssue({
							code: "custom",
							path: ["sections", si, "rows", 0, "from"],
							message: i18n.t("contract.type.validation.sectionFromMatchesPrevious"),
						});
					}
				}
			});
		}
	});
