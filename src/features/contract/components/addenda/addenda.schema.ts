import type { z } from "zod";

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

export function addendaRefineNoOverlapAndInsideContract(opts: {
	// ✅ هر کدام باید دقیقاً [yearPath, monthPath] باشند
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

		// اگر تاریخ قرارداد کامل نیست، چیزی نگیم (خود fixedStart پیام می‌دهد)
		if (cStart == null || cEnd == null)
			return;

		const addenda: any[] = (getAtPath(val, opts.addendaPath) ?? []) as any[];
		const ranges: Array<{ i: number, s: number, e: number }> = [];

		for (let i = 0; i < addenda.length; i++) {
			const a = addenda[i];
			const s = ymKey(a?.startYear, a?.startMonth);
			const e = ymKey(a?.endYear, a?.endMonth);

			if (s == null || e == null)
				continue; // requiredها را addendumSchema می‌دهد

			if (s > e) {
				ctx.addIssue({
					code: "custom",
					path: [...opts.addendaPath, i, "startYear"],
					message: "بازه تاریخ الحاقیه نامعتبر است",
				});
				continue;
			}

			// داخل بازه قرارداد
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
