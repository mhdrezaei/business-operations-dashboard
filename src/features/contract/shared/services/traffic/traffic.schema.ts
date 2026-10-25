import { addendumSchema } from "#src/features/contract/components/addenda/addenda.schema.js";
import { contractTypeSchema } from "#src/features/contract/components/contract-type/contract-type.schema";
import { i18n } from "#src/locales";
import { z } from "zod";
import { TRAFFIC_COLLOCATION_SLAS } from "./traffic.sla";

const isOfficialSchema = z.preprocess(
	v => (v === "" || v == null ? true : v),
	z.boolean(),
).default(true);

const premiumRevenuePercentSchema = z.preprocess(
	(v) => {
		if (v === "" || v == null)
			return null;
		if (typeof v === "string") {
			const t = v.trim();
			if (!t)
				return null;
			const n = Number(t);
			return Number.isFinite(n) ? n : v;
		}
		return v;
	},
	z.number().min(0, { error: () => i18n.t("contract.validation.percentRange") }).max(100, { error: () => i18n.t("contract.validation.percentRange") }).nullable(),
).optional();

export const trafficServiceFieldsSchema = z
	.object({
		isOfficial: isOfficialSchema,

		// These only matter when it's official
		tehranPricing: contractTypeSchema.optional(),
		provincePricing: contractTypeSchema.optional(),
		addenda: z.array(addendumSchema).default([]).optional(),
		sla: z.preprocess(v => (v === "" || v == null ? null : v), z.enum(TRAFFIC_COLLOCATION_SLAS).nullable()).optional(),
		collocationPartnerType: z.enum(["COLLOCATION", "CP"]).nullable().optional(),
		datacenter: z.preprocess(v => (v === "" || v == null ? null : v), z.string().nullable().optional()),
		datacenters: z.array(z.any()).optional(),
		telecomRackCount: z.any().optional(),
		telecomUnitsPerRack: z.any().optional(),
		telecomMonthlyRackRent: z.any().optional(),

		// PREMIUM conpany type
		tehranRevenuePercent: premiumRevenuePercentSchema,
		provinceRevenuePercent: premiumRevenuePercentSchema,
		tehranBasedTire: z.boolean().optional(),
		provinceBasedTire: z.boolean().optional(),
		tehranContractModel: z.enum(["LEGACY", "VARIABLE_TABLE"]).optional(),
		provinceContractModel: z.enum(["LEGACY", "VARIABLE_TABLE"]).optional(),

		tehranEnabled: z.boolean().optional(),
		provinceEnabled: z.boolean().optional(),

		tehranUnit: z.enum(["GB/month", "Mbps"]).nullable().optional(),
		provinceUnit: z.enum(["GB/month", "Mbps"]).nullable().optional(),
	})
	.superRefine((val, ctx) => {
		// ✅ If informal: nothing is validated
		if (!val.isOfficial)
			return;

		const requiresTehran = val.tehranPricing != null;
		const requiresProvince = val.provincePricing != null;
		const validateLocations = (addenda: any[], basePath: (string | number)[]) => {
			addenda.forEach((addendum, index) => {
				const path = [...basePath, index];
				if (requiresTehran && addendum?.tehranPricing == null) {
					ctx.addIssue({
						code: "custom",
						path: [...path, "tehranPricing"],
						message: i18n.t("contract.traffic.validation.tehranModelRequired"),
					});
				}
				if (requiresProvince && addendum?.provincePricing == null) {
					ctx.addIssue({
						code: "custom",
						path: [...path, "provincePricing"],
						message: i18n.t("contract.traffic.validation.provinceModelRequired"),
					});
				}
				if (Array.isArray(addendum?.children))
					validateLocations(addendum.children, [...path, "children"]);
			});
		};

		validateLocations(val.addenda ?? [], ["addenda"]);
	});
