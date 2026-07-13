import type { ContractFormValues, ContractServiceCode } from "./contract.form.types";
import { z } from "zod";
import { addendaRefineNoOverlapAndInsideContract } from "../../components/addenda/addenda.schema";
import { serviceRegistry } from "../services/registry";

function isBlankContractValue(value: unknown) {
	return value == null || (typeof value === "string" && value.trim() === "");
}

export function normalizeContractValue(value: unknown): any {
	if (value === undefined || value === null)
		return null;
	if (typeof value === "string")
		return value.trim();
	if (typeof value === "number" || typeof value === "boolean")
		return value;
	if (Array.isArray(value))
		return value.map(normalizeContractValue);
	if (value instanceof Date)
		return value.toISOString();
	if (typeof value === "object") {
		return Object.keys(value as Record<string, unknown>)
			.sort()
			.reduce<Record<string, any>>((result, key) => {
				result[key] = normalizeContractValue((value as Record<string, unknown>)[key]);
				return result;
			}, {});
	}
	return String(value).trim();
}

export function mergeContractValues(
	initial: ContractFormValues,
	current: Partial<ContractFormValues> | undefined,
): ContractFormValues {
	const definedCurrentValues = Object.fromEntries(
		Object.entries(current ?? {}).filter(([, value]) => value !== undefined),
	) as Partial<ContractFormValues>;

	const definedServiceFields = Object.fromEntries(
		Object.entries((current?.serviceFields as Record<string, unknown> | undefined) ?? {})
			.filter(([, value]) => value !== undefined),
	);

	return {
		...initial,
		...definedCurrentValues,
		serviceFields: {
			...(initial.serviceFields ?? {}),
			...definedServiceFields,
		},
	};
}

export function getComparableContractString(values: ContractFormValues): string {
	return JSON.stringify(normalizeContractValue(values));
}

const fixedStartSchema = z.object({
	serviceId: z.number().int().positive().nullable(),
	serviceCode: z.preprocess(
		v => (typeof v === "string" ? v.trim() || null : v ?? null),
		z.string().nullable(),
	),
	companyId: z.number().int().positive().nullable(),
	counterpartyType: z.preprocess(
		v => (v === "" || v == null ? null : v),
		z.enum(["partners", "gov_ops"]).nullable().catch(null),
	),
	companyType: z.preprocess(
		(value) => {
			if (value == null)
				return null;
			const normalized = String(value).trim().toUpperCase();
			return normalized || null;
		},
		z.string().nullable(),
	).optional(),
	startYear: z.number().int().min(1401).max(1410).nullable(),
	startMonth: z.number().int().min(1).max(12).nullable(),
	endYear: z.number().int().min(1401).max(1410).nullable(),
	endMonth: z.number().int().min(1).max(12).nullable(),
	contractNumber: z.string().optional(),
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
			if (
				val.startYear != null
				&& val.startMonth != null
				&& val.endYear != null
				&& val.endMonth != null
			) {
				const startKey = val.startYear * 100 + val.startMonth;
				const endKey = val.endYear * 100 + val.endMonth;
				if (endKey < startKey) {
					ctx.addIssue({
						code: "custom",
						path: ["endYear"],
						message: "سال/ماه پایان قرارداد نمی‌تواند قبل از سال/ماه شروع باشد",
					});
					ctx.addIssue({
						code: "custom",
						path: ["endMonth"],
						message: "سال/ماه پایان قرارداد نمی‌تواند قبل از سال/ماه شروع باشد",
					});
				}
			}
			if (val.serviceCode === "sms") {
				if (val.counterpartyType == null) {
					ctx.addIssue({ code: "custom", path: ["counterpartyType"], message: "طرف قرارداد الزامی است" });
				}

				// if business partners => company type and company required
				if (val.counterpartyType === "partners") {
					if (val.companyType == null) {
						ctx.addIssue({ code: "custom", path: ["companyType"], message: "نوع شرکت الزامی است" });
					}
					if (val.companyId == null) {
						ctx.addIssue({ code: "custom", path: ["companyId"], message: "شرکت الزامی است" });
					}
				}

				// If state/operators => company and company type are not needed
				if (val.counterpartyType === "gov_ops") {
					if (val.companyId != null) {
						ctx.addIssue({ code: "custom", path: ["companyId"], message: "در این حالت نیازی به انتخاب شرکت نیست" });
						if (val.companyType != null)
							ctx.addIssue({ code: "custom", path: ["companyType"], message: "در این حالت نیازی به انتخاب نوع شرکت نیست" });
					}
				}
			}
			else if (val.serviceCode === "traffic" || val.serviceCode === "psp") {
				if (val.companyType == null) {
					ctx.addIssue({
						code: "custom",
						path: ["companyType"],
						message: val.serviceCode === "traffic" ? "نوع شرکت (ترافیک) الزامی است" : "نوع شرکت الزامی است",
					});
				}

				const isTelecomCollocation = (
					val.serviceCode === "traffic"
					&& String(val.companyType ?? "").trim().toUpperCase() === "COLLOCATION"
					&& val.counterpartyType === "gov_ops"
				);

				// When company type is selected → companyId required
				if (val.companyType != null && val.companyId == null && !isTelecomCollocation) {
					ctx.addIssue({ code: "custom", path: ["companyId"], message: "شرکت الزامی است" });
				}

				if (val.serviceCode === "traffic") {
					const trafficCompanyType = String(val.companyType ?? "").trim().toUpperCase();
					if (trafficCompanyType === "COLLOCATION") {
						if (val.counterpartyType == null) {
							ctx.addIssue({
								code: "custom",
								path: ["counterpartyType"],
								message: "طرف قرارداد الزامی است",
							});
						}

						if (val.counterpartyType !== "gov_ops" && (val.serviceFields as any)?.collocationPartnerType == null) {
							ctx.addIssue({
								code: "custom",
								path: ["serviceFields", "collocationPartnerType"],
								message: "نوع شریک الزامی است",
							});
						}

						if (val.counterpartyType === "gov_ops") {
							if (isBlankContractValue((val.serviceFields as any)?.telecomRackCount)) {
								ctx.addIssue({
									code: "custom",
									path: ["serviceFields", "telecomRackCount"],
									message: "تعداد رک الزامی است",
								});
							}
							if (isBlankContractValue((val.serviceFields as any)?.telecomUnitsPerRack)) {
								ctx.addIssue({
									code: "custom",
									path: ["serviceFields", "telecomUnitsPerRack"],
									message: "تعداد یونیت هر رک الزامی است",
								});
							}
							if (isBlankContractValue((val.serviceFields as any)?.telecomMonthlyRackRent)) {
								ctx.addIssue({
									code: "custom",
									path: ["serviceFields", "telecomMonthlyRackRent"],
									message: "اجاره ماهیانه تمامی رک‌ها الزامی است",
								});
							}
						}
						else {
							const datacenters = Array.isArray((val.serviceFields as any)?.datacenters)
								? (val.serviceFields as any).datacenters
								: [];

							if (datacenters.length === 0) {
								ctx.addIssue({
									code: "custom",
									path: ["serviceFields", "datacenter"],
									message: "حداقل یک دیتاسنتر باید انتخاب شود",
								});
							}

							datacenters.forEach((datacenter: any, datacenterIndex: number) => {
								if (isBlankContractValue(datacenter?.bandwidthUnitRate)) {
									ctx.addIssue({
										code: "custom",
										path: ["serviceFields", "datacenters", datacenterIndex, "bandwidthUnitRate"],
										message: "نرخ هر واحد پهنای باند الزامی است",
									});
								}
								if (isBlankContractValue(datacenter?.ipRate)) {
									ctx.addIssue({
										code: "custom",
										path: ["serviceFields", "datacenters", datacenterIndex, "ipRate"],
										message: "نرخ هر IP الزامی است",
									});
								}
								if (isBlankContractValue(datacenter?.electricityAmpRate)) {
									ctx.addIssue({
										code: "custom",
										path: ["serviceFields", "datacenters", datacenterIndex, "electricityAmpRate"],
										message: "نرخ هر آمپر الزامی است",
									});
								}
								if (isBlankContractValue(datacenter?.electricityExemptionThreshold)) {
									ctx.addIssue({
										code: "custom",
										path: ["serviceFields", "datacenters", datacenterIndex, "electricityExemptionThreshold"],
										message: "آستانه معافیت آمپر الزامی است",
									});
								}

								const portItems = Array.isArray(datacenter?.portItems) ? datacenter.portItems : [];
								portItems.forEach((item: any, itemIndex: number) => {
									if (isBlankContractValue(item?.count)) {
										ctx.addIssue({
											code: "custom",
											path: ["serviceFields", "datacenters", datacenterIndex, "portItems", itemIndex, "count"],
											message: "تعداد الزامی است",
										});
									}
									if (isBlankContractValue(item?.speed)) {
										ctx.addIssue({
											code: "custom",
											path: ["serviceFields", "datacenters", datacenterIndex, "portItems", itemIndex, "speed"],
											message: "سرعت الزامی است",
										});
									}
									if (isBlankContractValue(item?.unitPrice)) {
										ctx.addIssue({
											code: "custom",
											path: ["serviceFields", "datacenters", datacenterIndex, "portItems", itemIndex, "unitPrice"],
											message: "قیمت هر واحد الزامی است",
										});
									}
								});

								const rackItems = Array.isArray(datacenter?.rackItems) ? datacenter.rackItems : [];
								rackItems.forEach((item: any, itemIndex: number) => {
									if (isBlankContractValue(item?.rackType)) {
										ctx.addIssue({
											code: "custom",
											path: ["serviceFields", "datacenters", datacenterIndex, "rackItems", itemIndex, "rackType"],
											message: "نوع رک الزامی است",
										});
									}
									if (isBlankContractValue(item?.count)) {
										ctx.addIssue({
											code: "custom",
											path: ["serviceFields", "datacenters", datacenterIndex, "rackItems", itemIndex, "count"],
											message: "تعداد الزامی است",
										});
									}
									if (isBlankContractValue(item?.unitPrice)) {
										ctx.addIssue({
											code: "custom",
											path: ["serviceFields", "datacenters", datacenterIndex, "rackItems", itemIndex, "unitPrice"],
											message: "قیمت هر واحد الزامی است",
										});
									}
								});

								const shouldValidateRackDiscountTiers = (
									(val.serviceFields as any)?.collocationPartnerType === "CP"
									&& datacenter?.datacenterSystemTag === "DEFAULT_BEHESHTI"
								);
								if (shouldValidateRackDiscountTiers) {
									const rackDiscountTiers = Array.isArray(datacenter?.rackDiscountTiers) ? datacenter.rackDiscountTiers : [];
									rackDiscountTiers.forEach((tier: any, tierIndex: number) => {
										if (isBlankContractValue(tier?.from)) {
											ctx.addIssue({
												code: "custom",
												path: ["serviceFields", "datacenters", datacenterIndex, "rackDiscountTiers", tierIndex, "from"],
												message: "از الزامی است",
											});
										}
										if (tierIndex < rackDiscountTiers.length - 1 && isBlankContractValue(tier?.to)) {
											ctx.addIssue({
												code: "custom",
												path: ["serviceFields", "datacenters", datacenterIndex, "rackDiscountTiers", tierIndex, "to"],
												message: "تا الزامی است",
											});
										}
										if (isBlankContractValue(tier?.discountPercent)) {
											ctx.addIssue({
												code: "custom",
												path: ["serviceFields", "datacenters", datacenterIndex, "rackDiscountTiers", tierIndex, "discountPercent"],
												message: "درصد تخفیف الزامی است",
											});
										}
										else {
											const discountPercent = Number(tier?.discountPercent);
											if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
												ctx.addIssue({
													code: "custom",
													path: ["serviceFields", "datacenters", datacenterIndex, "rackDiscountTiers", tierIndex, "discountPercent"],
													message: "درصد تخفیف باید بین 0 تا 100 باشد",
												});
											}
										}
									});
								}
							});
						}
					}

					// ✅ New: Validate only if the contract is official
					const isOfficial = (val.serviceFields as any)?.isOfficial === true;

					if (isOfficial && ["CP", "PREMIUM", "IXP", "TCI"].includes(trafficCompanyType)) {
						const tehranPricing = (val.serviceFields as any)?.tehranPricing;
						const provincePricing = (val.serviceFields as any)?.provincePricing;
						if (tehranPricing != null && isBlankContractValue((val.serviceFields as any)?.tehranUnit)) {
							ctx.addIssue({
								code: "custom",
								path: ["serviceFields", "tehranUnit"],
								message: "واحد (تهران) الزامی است",
							});
						}
						if (provincePricing != null && isBlankContractValue((val.serviceFields as any)?.provinceUnit)) {
							ctx.addIssue({
								code: "custom",
								path: ["serviceFields", "provinceUnit"],
								message: "واحد (مراکز استانی) الزامی است",
							});
						}
					}

					if (isOfficial && val.companyType === "PREMIUM") {
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
					if (isOfficial && val.companyType === "PREMIUM") {
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
			}

			else {
				if (val.companyId == null) {
					ctx.addIssue({ code: "custom", path: ["companyId"], message: "شرکت الزامی است" });
				}
			}
		});
}
