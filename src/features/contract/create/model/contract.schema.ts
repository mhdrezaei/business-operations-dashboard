import type { ContractServiceCode } from "./contract.form.types";
import { z } from "zod";
import { addendaRefineNoOverlapAndInsideContract } from "../../components/addenda/addenda.schema";
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

	// ✅ Zod v4: record باید valueType (و اینجا keyType هم) داشته باشد
	const fallbackSchema = z.record(z.string(), z.unknown());

	// ✅ schema داینامیک سرویس‌ها (اگر نبود، record)
	const moduleSchema = module?.schema ?? fallbackSchema;

	// ✅ اگر serviceFields در RHF undefined/null شد، آن را به {} تبدیل می‌کنیم
	const serviceFieldsSchema = serviceCode === "psp"
		? z
			.preprocess(v => (v == null ? null : v), moduleSchema.nullable())
			.optional()
		: z.preprocess(v => (v == null ? {} : v), moduleSchema);

	return fixedStartSchema
		.and(fixedEndSchema)
		.and(
			z.object({
				serviceFields: serviceFieldsSchema,
			}),
		)
		.superRefine(addendaRefineNoOverlapAndInsideContract({
			contractStartPath: ["startYear", "startMonth"],
			contractEndPath: ["endYear", "endMonth"],
			addendaPath: ["serviceFields", "addenda"],
		}))
		.superRefine((val, ctx) => {
			if (val.serviceId == null) {
				ctx.addIssue({
					code: "custom",
					path: ["serviceId"],
					message: "نوع سرویس الزامی است",
				});
			}

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
