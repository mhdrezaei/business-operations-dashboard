import type { ContractServiceCode } from "./contract.form.types";
import { z } from "zod";
import { serviceRegistry } from "../services/registry";

const fixedStartSchema = z.object({
	serviceId: z.number().int().positive().nullable(),
	serviceCode: z.string().nullable(),
	companyId: z.number().int().positive().nullable(),
	startYear: z.number().int().min(1401).max(1410).nullable(),
	startMonth: z.number().int().min(1).max(12).nullable(),
	endYear: z.number().int().min(1401).max(1410).nullable(),
	endMonth: z.number().int().min(1).max(12).nullable(),
});

const fixedEndSchema = z.object({
	description: z.string().max(2000).optional(),
	documents: z.array(z.any()),
});

export function buildContractSchema(serviceCode: ContractServiceCode | null) {
	const module = serviceCode ? serviceRegistry[serviceCode] : undefined;

	// ✅ schema داینامیک سرویس‌ها
	const moduleSchema = module?.schema ?? z.object({}).passthrough();

	// ✅ این بخش کلیدی است:
	// اگر serviceFields در RHF undefined شد، آن را به {} تبدیل می‌کنیم
	const serviceFieldsSchema = z.preprocess(
		v => (v == null ? {} : v),
		moduleSchema,
	);

	return fixedStartSchema
		.and(fixedEndSchema)
		.and(
			z.object({
				serviceFields: serviceFieldsSchema,
			}),
		)
		.superRefine((val, ctx) => {
			// ✅ required ها (با string literal code، نه ZodIssueCode)
			if (val.serviceId == null) {
				ctx.addIssue({
					code: "custom",
					path: ["serviceId"],
					message: "نوع سرویس الزامی است",
				});
			}

			// serviceCode را بهتر است nullable باشد و وقتی سرویس انتخاب شد پر شود
			// پس اگر می‌خواهی همینجا required باشد:
			if (!val.serviceCode) {
				ctx.addIssue({
					code: "custom",
					path: ["serviceCode"],
					message: "کد سرویس الزامی است",
				});
			}

			if (val.companyId == null) {
				ctx.addIssue({
					code: "custom",
					path: ["companyId"],
					message: "شرکت الزامی است",
				});
			}

			if (val.startYear == null) {
				ctx.addIssue({
					code: "custom",
					path: ["startYear"],
					message: "سال شروع الزامی است",
				});
			}
			if (val.startMonth == null) {
				ctx.addIssue({
					code: "custom",
					path: ["startMonth"],
					message: "ماه شروع الزامی است",
				});
			}
			if (val.endYear == null) {
				ctx.addIssue({
					code: "custom",
					path: ["endYear"],
					message: "سال پایان الزامی است",
				});
			}
			if (val.endMonth == null) {
				ctx.addIssue({
					code: "custom",
					path: ["endMonth"],
					message: "ماه پایان الزامی است",
				});
			}
		});
}
