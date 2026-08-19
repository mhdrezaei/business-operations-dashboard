import { addendumSchema } from "#src/features/contract/components/addenda/addenda.schema";
import { z } from "zod";

const nullableNumberSchema = z.preprocess(
	(v) => {
		if (v === "" || v == null)
			return null;
		if (typeof v === "string") {
			const trimmed = v.trim();
			if (!trimmed)
				return null;
			const n = Number(trimmed);
			return Number.isFinite(n) ? n : v;
		}
		return v;
	},
	z.number().nullable(),
);

const nullablePercentSchema = z.preprocess(
	(v) => {
		if (v === "" || v == null)
			return null;
		if (typeof v === "string") {
			const trimmed = v.trim();
			if (!trimmed)
				return null;
			const n = Number(trimmed);
			return Number.isFinite(n) ? n : v;
		}
		return v;
	},
	z.number().min(0, "درصد باید بین 0 تا 100 باشد").max(100, "درصد باید بین 0 تا 100 باشد").nullable(),
);

function numericPercent(value: unknown) {
	if (value == null || value === "")
		return null;
	const numberValue = Number(value);
	return Number.isFinite(numberValue) ? numberValue : null;
}

function validatePercentTotals(value: Record<string, unknown>, ctx: z.RefinementCtx, path: Array<string | number> = []) {
	const expertPercent = numericPercent(value.expertPercent);
	const telecomPercent = numericPercent(value.telecomPercent);
	if (expertPercent != null && telecomPercent != null && expertPercent + telecomPercent !== 100) {
		ctx.addIssue({
			code: "custom",
			path: [...path, "telecomPercent"],
			message: "مجموع درصد کاراشاب و درصد مخابرات باید ۱۰۰ باشد",
		});
	}

	const firstParty = numericPercent(value.firstPartySharePercent);
	const region = numericPercent(value.regionSharePercent);
	const salesAgent = numericPercent(value.salesAgentSharePercent);
	if (firstParty != null && region != null && salesAgent != null && firstParty + region + salesAgent !== 100) {
		ctx.addIssue({
			code: "custom",
			path: [...path, "salesAgentSharePercent"],
			message: "مجموع درصد سهم طرف اول، منطقه و نماینده فروش باید ۱۰۰ باشد",
		});
	}

	const addenda = Array.isArray(value.addenda) ? value.addenda : [];
	addenda.forEach((addendum, index) => {
		if (addendum && typeof addendum === "object")
			validatePercentTotals(addendum as Record<string, unknown>, ctx, [...path, "addenda", index]);
	});

	const children = Array.isArray(value.children) ? value.children : [];
	children.forEach((child, index) => {
		if (child && typeof child === "object")
			validatePercentTotals(child as Record<string, unknown>, ctx, [...path, "children", index]);
	});
}

export const smsCommissionServiceFieldsSchema = z
	.object({
		agent: z.number().int().positive().nullable(),
		initialCommission: nullableNumberSchema,
		finalCommission: nullableNumberSchema,
		expertPercent: nullablePercentSchema,
		telecomPercent: nullablePercentSchema,
		firstPartySharePercent: nullablePercentSchema,
		regionSharePercent: nullablePercentSchema,
		salesAgentSharePercent: nullablePercentSchema,
		addenda: z.array(addendumSchema).default([]).optional(),
	})
	.superRefine((val, ctx) => {
		validatePercentTotals(val, ctx);
		if (val.agent == null) {
			ctx.addIssue({ code: "custom", path: ["agent"], message: "نماینده فروش الزامی است" });
		}
		if (val.initialCommission == null) {
			ctx.addIssue({ code: "custom", path: ["initialCommission"], message: "کارمزد دریافت اولیه الزامی است" });
		}
		if (val.finalCommission == null) {
			ctx.addIssue({ code: "custom", path: ["finalCommission"], message: "کارمزد دریافت نهایی الزامی است" });
		}
		if (val.expertPercent == null) {
			ctx.addIssue({ code: "custom", path: ["expertPercent"], message: "درصد کاراشاب الزامی است" });
		}
		if (val.telecomPercent == null) {
			ctx.addIssue({ code: "custom", path: ["telecomPercent"], message: "درصد مخابرات الزامی است" });
		}
		if (val.firstPartySharePercent == null) {
			ctx.addIssue({ code: "custom", path: ["firstPartySharePercent"], message: "درصد سهم طرف اول الزامی است" });
		}
		if (val.regionSharePercent == null) {
			ctx.addIssue({ code: "custom", path: ["regionSharePercent"], message: "درصد سهم منطقه الزامی است" });
		}
		if (val.salesAgentSharePercent == null) {
			ctx.addIssue({ code: "custom", path: ["salesAgentSharePercent"], message: "درصد سهم نماینده فروش الزامی است" });
		}
	})
	.passthrough();
