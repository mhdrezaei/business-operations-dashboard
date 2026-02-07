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
export const addendumSchema = z
	.object({
		startYear: z.number().int().min(1401).max(1410).nullable(),
		startMonth: z.number().int().min(1).max(12).nullable(),
		endYear: z.number().int().min(1401).max(1410).nullable(),
		endMonth: z.number().int().min(1).max(12).nullable(),

		contractPricing: contractTypeSchema,

		description: z.string().max(2000).optional(),
	})
	.superRefine((v, ctx) => {
		if (v.startYear == null)
			ctx.addIssue({ code: "custom", path: ["startYear"], message: "سال شروع الحاقیه الزامی است" });
		if (v.startMonth == null)
			ctx.addIssue({ code: "custom", path: ["startMonth"], message: "ماه شروع الحاقیه الزامی است" });
		if (v.endYear == null)
			ctx.addIssue({ code: "custom", path: ["endYear"], message: "سال پایان الحاقیه الزامی است" });
		if (v.endMonth == null)
			ctx.addIssue({ code: "custom", path: ["endMonth"], message: "ماه پایان الحاقیه الزامی است" });
	});

export function addendaRefineNoOverlapAndInsideContract(opts: {
// ✅ Each must be exactly [yearPath, monthPath]
	contractStartPath: (string | number)[]
	contractEndPath: (string | number)[]
	addendaPath: (string | number)[]
}) {
	return (val: any, ctx: z.RefinementCtx) => {
		const cStartYear = getAtPath(val, [opts.contractStartPath[0]]);
		const cStartMonth = getAtPath(val, [opts.contractStartPath[1]]);
		const cEndYear = getAtPath(val, [opts.contractEndPath[0]]);
		const cEndMonth = getAtPath(val, [opts.contractEndPath[1]]);

		const cStart = ymKey(cStartYear, cStartMonth);
		const cEnd = ymKey(cEndYear, cEndMonth);

		// If the contract date is not complete, say nothing (fixedStart itself will send a message)
		if (cStart == null || cEnd == null)
			return;

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

			if (s < cStart || e > cEnd) {
				ctx.addIssue({
					code: "custom",
					path: [...opts.addendaPath, i, "startYear"],
					message: "بازه تاریخ الحاقیه باید داخل بازه تاریخ قرارداد باشد",
				});
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
