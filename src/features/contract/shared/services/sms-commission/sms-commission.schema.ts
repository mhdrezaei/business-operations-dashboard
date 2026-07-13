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
			ctx.addIssue({ code: "custom", path: ["expertPercent"], message: "درصد کارشناسی الزامی است" });
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
