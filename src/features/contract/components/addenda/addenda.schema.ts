import { z } from "zod";
import { contractTypeSchema } from "../contract-type/contract-type.schema";

function ymKey(y: number | null | undefined, m: number | null | undefined) {
	if (!y || !m)
		return null;
	return y * 100 + m;
}

function overlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
	return aStart <= bEnd && aEnd >= bStart;
}

function getAtPath(obj: any, path: (string | number)[]) {
	return path.reduce((acc, key) => (acc == null ? acc : acc[key as any]), obj);
}

const optionalPercentSchema = z.preprocess(
	(value) => {
		if (value === "" || value == null)
			return null;
		const numberValue = Number(value);
		return Number.isFinite(numberValue) ? numberValue : value;
	},
	z.number().min(0).max(100).nullable(),
).optional();

export const addendumSchema: z.ZodType<any> = z.lazy(() => z
	.object({
		id: z.number().int().positive().optional(),
		startYear: z.number().int().min(1401).max(1410).nullable(),
		startMonth: z.number().int().min(1).max(12).nullable(),
		endYear: z.number().int().min(1401).max(1410).nullable(),
		endMonth: z.number().int().min(1).max(12).nullable(),

		contractPricing: contractTypeSchema.optional(),
		legacyPricing: z.object({
			paymentRegistration: contractTypeSchema,
			billInquiry: contractTypeSchema,
		}).optional(),
		tehranPricing: contractTypeSchema.optional(),
		provincePricing: contractTypeSchema.optional(),
		tehranUnit: z.enum(["GB/month", "Mbps"]).nullable().optional(),
		provinceUnit: z.enum(["GB/month", "Mbps"]).nullable().optional(),
		tehranRevenuePercent: optionalPercentSchema,
		provinceRevenuePercent: optionalPercentSchema,
		tehranBasedTire: z.boolean().optional(),
		provinceBasedTire: z.boolean().optional(),
		tehranContractModel: z.enum(["LEGACY", "VARIABLE_TABLE"]).optional(),
		provinceContractModel: z.enum(["LEGACY", "VARIABLE_TABLE"]).optional(),
		contractNumber: z.string().optional(),
		description: z.string().max(2000).optional(),
		children: z.array(addendumSchema).default([]).optional(),
	})
	.passthrough()
	.superRefine((v, ctx) => {
		if (v.startYear == null)
			ctx.addIssue({ code: "custom", path: ["startYear"], message: "سال شروع الحاقیه الزامی است" });
		if (v.startMonth == null)
			ctx.addIssue({ code: "custom", path: ["startMonth"], message: "ماه شروع الحاقیه الزامی است" });
		if (v.endYear == null)
			ctx.addIssue({ code: "custom", path: ["endYear"], message: "سال پایان الحاقیه الزامی است" });
		if (v.endMonth == null)
			ctx.addIssue({ code: "custom", path: ["endMonth"], message: "ماه پایان الحاقیه الزامی است" });
	}));

export function addendaRefineValidAndNoOverlap(opts: {
	addendaPath: (string | number)[]
}) {
	return (val: any, ctx: z.RefinementCtx) => {
		const addenda: any[] = (getAtPath(val, opts.addendaPath) ?? []) as any[];
		const ranges: Array<{ i: number, s: number, e: number }> = [];

		for (let i = 0; i < addenda.length; i++) {
			const a = addenda[i];
			const s = ymKey(a?.startYear, a?.startMonth);
			const e = ymKey(a?.endYear, a?.endMonth);

			if (s == null || e == null)
				continue;

			if (s > e) {
				ctx.addIssue({
					code: "custom",
					path: [...opts.addendaPath, i, "startYear"],
					message: "بازه تاریخ الحاقیه نامعتبر است",
				});
				continue;
			}

			ranges.push({ i, s, e });
		}

		// overlap check
		for (let i = 0; i < ranges.length; i++) {
			for (let j = i + 1; j < ranges.length; j++) {
				if (overlap(ranges[i].s, ranges[i].e, ranges[j].s, ranges[j].e)) {
					ctx.addIssue({
						code: "custom",
						path: [...opts.addendaPath, ranges[j].i, "startYear"],
						message: "این بازه با یکی از الحاقیه‌های قبلی هم‌پوشانی دارد",
					});
				}
			}
		}
	};
}
