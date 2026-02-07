import type { ContractServiceCode } from "./contract.form.types";
import { z } from "zod";
import { addendaRefineNoOverlapAndInsideContract } from "../../components/addenda/addenda.schema";
import { serviceRegistry } from "../services/registry";

const fixedStartSchema = z.object({
	serviceId: z.number().int().positive().nullable(),
	serviceCode: z.string().nullable(),
	companyId: z.number().int().positive().nullable(),
	counterpartyType: z.preprocess(
		v => (v === "" || v == null ? null : v),
		z.enum(["partners", "gov_ops"]).nullable().catch(null),
	),
	trafficCompanyType: z.enum(["CP", "IXP", "TCI", "PREMIUM"]).nullable().optional(),
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

	const fallbackSchema = z.record(z.string(), z.unknown());

	const moduleSchema = module?.schema ?? fallbackSchema;

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
			if (val.serviceCode === "sms") {
				if (val.counterpartyType == null) {
					ctx.addIssue({ code: "custom", path: ["counterpartyType"], message: "طرف قرارداد الزامی است" });
				}

				// if business partners => company required
				if (val.counterpartyType === "partners") {
					if (val.companyId == null) {
						ctx.addIssue({ code: "custom", path: ["companyId"], message: "شرکت الزامی است" });
					}
				}

				// If state/operators => company not required (and better null)
				if (val.counterpartyType === "gov_ops") {
					if (val.companyId != null)
						ctx.addIssue({ code: "custom", path: ["companyId"], message: "در این حالت نیازی به انتخاب شرکت نیست" });
				}
			}
			else if (val.serviceCode === "traffic") {
				if (val.trafficCompanyType == null) {
					ctx.addIssue({ code: "custom", path: ["trafficCompanyType"], message: "نوع شرکت (ترافیک) الزامی است" });
				}

				// When company type is selected → companyId required
				if (val.trafficCompanyType != null && val.companyId == null) {
					ctx.addIssue({ code: "custom", path: ["companyId"], message: "شرکت الزامی است" });
				}

				// ✅ New: Validate only if the contract is official
				const isOfficial = (val.serviceFields as any)?.isOfficial === true;

				if (isOfficial && val.trafficCompanyType === "PREMIUM") {
					const tehranPricing = (val.serviceFields as any)?.tehranPricing;
					const provincePricing = (val.serviceFields as any)?.provincePricing;

					if (tehranPricing != null) {
						const p = (val.serviceFields as any)?.tehranRevenuePercent;
						if (p == null) {
							ctx.addIssue({
								code: "custom",
								path: ["serviceFields", "tehranRevenuePercent"],
								message: "درصد سهم درآمد (تهران) الزامی است",
							});
						}
					}
					if (provincePricing != null) {
						const p = (val.serviceFields as any)?.provinceRevenuePercent;
						if (p == null) {
							ctx.addIssue({
								code: "custom",
								path: ["serviceFields", "provinceRevenuePercent"],
								message: "درصد سهم درآمد (مراکز استانی) الزامی است",
							});
						}
					}
				}

				// ✅ PREMIUM: Revenue share percentage only when official + PREMIUM
				if (isOfficial && val.trafficCompanyType === "PREMIUM") {
					const p = (val.serviceFields as any)?.premiumRevenuePercent;

					if (p == null) {
						ctx.addIssue({
							code: "custom",
							path: ["serviceFields", "premiumRevenuePercent"],
							message: "درصد سهم درآمد الزامی است",
						});
					}
					else if (typeof p !== "number" || !Number.isFinite(p) || p < 0 || p > 100) {
						ctx.addIssue({
							code: "custom",
							path: ["serviceFields", "premiumRevenuePercent"],
							message: "درصد باید بین 0 تا 100 باشد",
						});
					}
				}
			}

			else {
				if (val.companyId == null) {
					ctx.addIssue({ code: "custom", path: ["companyId"], message: "شرکت الزامی است" });
				}
			}
		});
}
