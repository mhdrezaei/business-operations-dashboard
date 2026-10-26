import { addendumSchema } from "#src/features/contract/components/addenda/addenda.schema";
import { i18n } from "#src/locales";
import { z } from "zod";
import { toNumberOrNull } from "../../utils/value-coercion";

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
	z.number().min(0, { error: () => i18n.t("contract.validation.percentRange") }).max(100, { error: () => i18n.t("contract.validation.percentRange") }).nullable(),
);

function validateCommissionRules(value: Record<string, unknown>, ctx: z.RefinementCtx, path: Array<string | number> = []) {
	const initialCommission = toNumberOrNull(value.initialCommission);
	const finalCommission = toNumberOrNull(value.finalCommission);
	if (initialCommission != null && finalCommission != null && finalCommission < initialCommission) {
		ctx.addIssue({
			code: "custom",
			path: [...path, "finalCommission"],
			message: i18n.t("contract.smsCommission.finalBelowInitial"),
		});
	}

	const expertPercent = toNumberOrNull(value.expertPercent);
	const telecomPercent = toNumberOrNull(value.telecomPercent);
	if (expertPercent != null && telecomPercent != null && expertPercent + telecomPercent !== 100) {
		ctx.addIssue({
			code: "custom",
			path: [...path, "telecomPercent"],
			message: i18n.t("contract.smsCommission.validation.expertTelecomTotal"),
		});
	}

	const firstParty = toNumberOrNull(value.firstPartySharePercent);
	const region = toNumberOrNull(value.regionSharePercent);
	const salesAgent = toNumberOrNull(value.salesAgentSharePercent);
	if (firstParty != null && region != null && salesAgent != null && firstParty + region + salesAgent !== 100) {
		ctx.addIssue({
			code: "custom",
			path: [...path, "salesAgentSharePercent"],
			message: i18n.t("contract.smsCommission.validation.sharesTotal"),
		});
	}

	const addenda = Array.isArray(value.addenda) ? value.addenda : [];
	addenda.forEach((addendum, index) => {
		if (addendum && typeof addendum === "object")
			validateCommissionRules(addendum as Record<string, unknown>, ctx, [...path, "addenda", index]);
	});

	const children = Array.isArray(value.children) ? value.children : [];
	children.forEach((child, index) => {
		if (child && typeof child === "object")
			validateCommissionRules(child as Record<string, unknown>, ctx, [...path, "children", index]);
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
		validateCommissionRules(val, ctx);
		if (val.agent == null) {
			ctx.addIssue({ code: "custom", path: ["agent"], message: i18n.t("contract.smsCommission.validation.agent") });
		}
		if (val.initialCommission == null) {
			ctx.addIssue({ code: "custom", path: ["initialCommission"], message: i18n.t("contract.smsCommission.validation.initialCommission") });
		}
		if (val.finalCommission == null) {
			ctx.addIssue({ code: "custom", path: ["finalCommission"], message: i18n.t("contract.smsCommission.validation.finalCommission") });
		}
		if (val.expertPercent == null) {
			ctx.addIssue({ code: "custom", path: ["expertPercent"], message: i18n.t("contract.smsCommission.validation.expertPercent") });
		}
		if (val.telecomPercent == null) {
			ctx.addIssue({ code: "custom", path: ["telecomPercent"], message: i18n.t("contract.smsCommission.validation.telecomPercent") });
		}
		if (val.firstPartySharePercent == null) {
			ctx.addIssue({ code: "custom", path: ["firstPartySharePercent"], message: i18n.t("contract.smsCommission.validation.firstPartyShare") });
		}
		if (val.regionSharePercent == null) {
			ctx.addIssue({ code: "custom", path: ["regionSharePercent"], message: i18n.t("contract.smsCommission.validation.regionShare") });
		}
		if (val.salesAgentSharePercent == null) {
			ctx.addIssue({ code: "custom", path: ["salesAgentSharePercent"], message: i18n.t("contract.smsCommission.validation.salesAgentShare") });
		}
	})
	.passthrough();
