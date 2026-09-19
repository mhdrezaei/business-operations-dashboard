import { addendumSchema } from "#src/features/contract/components/addenda/addenda.schema.js";
import { contractTypeSchema } from "#src/features/contract/components/contract-type/contract-type.schema";
import { z } from "zod";

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
	z.number().min(0, "درصد باید بین 0 تا 100 باشد").max(100, "درصد باید بین 0 تا 100 باشد").nullable(),
).optional();

export const trafficServiceFieldsSchema = z
	.object({
		isOfficial: isOfficialSchema,

		// These only matter when it's official
		tehranPricing: contractTypeSchema.optional(),
		provincePricing: contractTypeSchema.optional(),
		addenda: z.array(addendumSchema).default([]).optional(),
		collocationPartnerType: z.enum(["COLLOCATION", "CP"]).nullable().optional(),
		datacenter: z.preprocess(v => (v === "" || v == null ? null : v), z.string().nullable().optional()),
		datacenters: z.array(z.any()).optional(),
		datacenterBandwidthUnitRate: z.any().optional(),
		datacenterIpRate: z.any().optional(),
		datacenterPortItems: z.array(z.any()).optional(),
		datacenterRackItems: z.array(z.any()).optional(),
		datacenterElectricityAmpRate: z.any().optional(),
		datacenterElectricityExemptionThreshold: z.any().optional(),
		realStartYear: z.any().optional(),
		realStartMonth: z.any().optional(),
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
						message: "نوع قرارداد تهران در الحاقیه الزامی است",
					});
				}
				if (requiresProvince && addendum?.provincePricing == null) {
					ctx.addIssue({
						code: "custom",
						path: [...path, "provincePricing"],
						message: "نوع قرارداد مراکز استانی در الحاقیه الزامی است",
					});
				}
				if (Array.isArray(addendum?.children))
					validateLocations(addendum.children, [...path, "children"]);
			});
		};

		validateLocations(val.addenda ?? [], ["addenda"]);
	});
