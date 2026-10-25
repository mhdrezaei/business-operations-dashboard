import type { ContractFormValues, ContractServiceCode } from "./contract.form.types";
import { i18n } from "#src/locales";
import { z } from "zod";
import { addendaRefineValidAndNoOverlap } from "../../components/addenda/addenda.schema";
import { serviceRegistry } from "../services/registry";
import { isTelecomFrameCode } from "../services/telecom-frame/telecom-frame.types";
import { validateCollocationAddenda, validateCollocationDatacenter } from "../services/traffic/traffic.collocation.schema";
import { isBlankValue, toNumberOrNull } from "../utils/value-coercion";
import { realStartFieldsSchema, validateRealStart } from "./contract-dates";

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
	documents: z.preprocess(
		value => (Array.isArray(value) ? value : []),
		z.array(z.any()),
	),
});

export function buildContractSchema(serviceCode: ContractServiceCode | null) {
	const module = serviceCode ? serviceRegistry[serviceCode] : undefined;

	const fallbackSchema = z.record(z.string(), z.unknown());

	const moduleSchema = module?.schema ?? fallbackSchema;

	const serviceFieldsSchema = serviceCode === "psp"
		? z
			.preprocess(v => (v == null ? null : v), moduleSchema.and(realStartFieldsSchema).nullable())
			.optional()
		: z.preprocess(v => (v == null ? {} : v), moduleSchema.and(realStartFieldsSchema));

	return fixedStartSchema
		.and(fixedEndSchema)
		.and(
			z.object({
				serviceFields: serviceFieldsSchema,
			}),
		)
		.superRefine(addendaRefineValidAndNoOverlap({
			addendaPath: ["serviceFields", "addenda"],
		}))
		.superRefine((val, ctx) => {
			if (val.serviceId == null) {
				ctx.addIssue({
					code: "custom",
					path: ["serviceId"],
					message: i18n.t("contract.schema.serviceType"),
				});
			}

			if (!val.serviceCode) {
				ctx.addIssue({
					code: "custom",
					path: ["serviceCode"],
					message: i18n.t("contract.schema.serviceCode"),
				});
			}

			if (val.startYear == null) {
				ctx.addIssue({
					code: "custom",
					path: ["startYear"],
					message: i18n.t("contract.schema.startYear"),
				});
			}
			if (val.startMonth == null) {
				ctx.addIssue({
					code: "custom",
					path: ["startMonth"],
					message: i18n.t("contract.schema.startMonth"),
				});
			}
			if (val.endYear == null) {
				ctx.addIssue({
					code: "custom",
					path: ["endYear"],
					message: i18n.t("contract.schema.endYear"),
				});
			}
			if (val.endMonth == null) {
				ctx.addIssue({
					code: "custom",
					path: ["endMonth"],
					message: i18n.t("contract.schema.endMonth"),
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
						message: i18n.t("contract.schema.endBeforeStart"),
					});
					ctx.addIssue({
						code: "custom",
						path: ["endMonth"],
						message: i18n.t("contract.schema.endBeforeStart"),
					});
				}
			}
			const realStartSource = (val.serviceFields ?? {}) as Record<string, unknown>;
			const realStartIssue = validateRealStart(
				{ startYear: val.startYear, startMonth: val.startMonth },
				{ year: toNumberOrNull(realStartSource.realStartYear), month: toNumberOrNull(realStartSource.realStartMonth) },
			);
			if (realStartIssue) {
				ctx.addIssue({
					code: "custom",
					path: ["serviceFields", realStartIssue === "max-month" ? "realStartMonth" : "realStartYear"],
					message: i18n.t(`contract.realStart.${realStartIssue}`),
				});
			}
			if (val.serviceCode === "sms") {
				if (val.counterpartyType == null) {
					ctx.addIssue({ code: "custom", path: ["counterpartyType"], message: i18n.t("contract.schema.counterparty") });
				}

				// if business partners => company type and company required
				if (val.counterpartyType === "partners") {
					if (val.companyType == null) {
						ctx.addIssue({ code: "custom", path: ["companyType"], message: i18n.t("contract.schema.smsCompanyType") });
					}
					if (val.companyId == null) {
						ctx.addIssue({ code: "custom", path: ["companyId"], message: i18n.t("contract.schema.company") });
					}
				}

				// If state/operators => company and company type are not needed
				if (val.counterpartyType === "gov_ops") {
					if (val.companyId != null) {
						ctx.addIssue({ code: "custom", path: ["companyId"], message: i18n.t("contract.schema.companyNotNeeded") });
						if (val.companyType != null)
							ctx.addIssue({ code: "custom", path: ["companyType"], message: i18n.t("contract.schema.companyTypeNotNeeded") });
					}
				}
			}
			else if (
				val.serviceCode === "traffic"
				|| val.serviceCode === "psp"
				|| val.serviceCode === "sales_agency"
				|| val.serviceCode === "sales-agency"
				|| isTelecomFrameCode(val.serviceCode)
			) {
				const isSalesAgency = val.serviceCode === "sales_agency" || val.serviceCode === "sales-agency";
				if (val.companyType == null) {
					ctx.addIssue({
						code: "custom",
						path: ["companyType"],
						message: isSalesAgency
							? i18n.t("contract.schema.salesAgencyCompanyType")
							: val.serviceCode === "traffic" ? i18n.t("contract.schema.trafficCompanyType") : i18n.t("contract.schema.companyType"),
					});
				}

				const isTelecomCollocation = (
					val.serviceCode === "traffic"
					&& String(val.companyType ?? "").trim().toUpperCase() === "COLLOCATION"
					&& val.counterpartyType === "gov_ops"
				);

				// When company type is selected → companyId required
				if (val.companyType != null && val.companyId == null && !isTelecomCollocation) {
					ctx.addIssue({ code: "custom", path: ["companyId"], message: i18n.t("contract.schema.company") });
				}

				if (isSalesAgency) {
					const serviceFields = (val.serviceFields ?? {}) as Record<string, any>;
					const selectedType = String(val.companyType ?? "").trim().toUpperCase();
					if (selectedType === "OUTBOUND") {
						const validateOutboundAddenda = (items: unknown, path: Array<string | number>) => {
							(Array.isArray(items) ? items : []).forEach((addendum: any, index: number) => {
								const addendumPath = [...path, index];
								(["incomePercentage", "expensePercentage"] as const).forEach((key) => {
									const percent = toNumberOrNull(addendum?.[key]);
									if (percent == null || percent < 0 || percent > 100) {
										ctx.addIssue({
											code: "custom",
											path: [...addendumPath, key],
											message: i18n.t("contract.salesAgency.addendumPercentRange"),
										});
									}
								});
								validateOutboundAddenda(addendum?.children, [...addendumPath, "children"]);
							});
						};
						validateOutboundAddenda(serviceFields.addenda, ["serviceFields", "addenda"]);
						if (serviceFields.incomePercentage == null) {
							ctx.addIssue({ code: "custom", path: ["serviceFields", "incomePercentage"], message: i18n.t("contract.schema.incomePercentage") });
						}
						if (serviceFields.expensePercentage == null) {
							ctx.addIssue({ code: "custom", path: ["serviceFields", "expensePercentage"], message: i18n.t("contract.schema.expensePercentage") });
						}
					}
					else if (selectedType === "SALES_REP_MANAGEMENT") {
						const titles = Array.isArray(serviceFields.costTitles) ? serviceFields.costTitles : [];
						if (titles.length === 0 || titles.some((item: any) => !String(item ?? "").trim())) {
							ctx.addIssue({ code: "custom", path: ["serviceFields", "costTitles"], message: i18n.t("contract.schema.costTitles") });
						}
					}
				}

				if (val.serviceCode === "traffic") {
					const trafficCompanyType = String(val.companyType ?? "").trim().toUpperCase();
					if (trafficCompanyType === "COLLOCATION") {
						if (val.counterpartyType == null) {
							ctx.addIssue({
								code: "custom",
								path: ["counterpartyType"],
								message: i18n.t("contract.schema.counterparty"),
							});
						}

						if (val.counterpartyType !== "gov_ops" && (val.serviceFields as any)?.collocationPartnerType == null) {
							ctx.addIssue({
								code: "custom",
								path: ["serviceFields", "collocationPartnerType"],
								message: i18n.t("contract.schema.partnerType"),
							});
						}

						if (val.counterpartyType !== "gov_ops" && isBlankValue((val.serviceFields as any)?.sla)) {
							ctx.addIssue({
								code: "custom",
								path: ["serviceFields", "sla"],
								message: i18n.t("contract.collocation.slaRequired"),
							});
						}

						if (val.counterpartyType === "gov_ops") {
							if (isBlankValue((val.serviceFields as any)?.telecomRackCount)) {
								ctx.addIssue({
									code: "custom",
									path: ["serviceFields", "telecomRackCount"],
									message: i18n.t("contract.schema.rackCount"),
								});
							}
							if (isBlankValue((val.serviceFields as any)?.telecomUnitsPerRack)) {
								ctx.addIssue({
									code: "custom",
									path: ["serviceFields", "telecomUnitsPerRack"],
									message: i18n.t("contract.schema.unitsPerRack"),
								});
							}
							if (isBlankValue((val.serviceFields as any)?.telecomMonthlyRackRent)) {
								ctx.addIssue({
									code: "custom",
									path: ["serviceFields", "telecomMonthlyRackRent"],
									message: i18n.t("contract.schema.monthlyRent"),
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
									message: i18n.t("contract.schema.datacenters"),
								});
							}

							datacenters.forEach((datacenter: any, datacenterIndex: number) =>
								validateCollocationDatacenter(
									datacenter,
									["serviceFields", "datacenters", datacenterIndex],
									ctx,
									(val.serviceFields as any)?.collocationPartnerType,
								),
							);
						}
					}

					if (trafficCompanyType === "COLLOCATION") {
						const collocationFields = (val.serviceFields ?? {}) as Record<string, any>;
						validateCollocationAddenda(collocationFields.addenda, ["serviceFields", "addenda"], ctx, {
							partnerType: collocationFields.collocationPartnerType,
							isTelecom: val.counterpartyType === "gov_ops",
							baseDatacenterIds: new Set((Array.isArray(collocationFields.datacenters) ? collocationFields.datacenters : []).map((item: any) => String(item?.datacenter))),
						});
					}
					else {
						const trafficFields = (val.serviceFields ?? {}) as Record<string, any>;
						const hasLocation = trafficFields.isOfficial === false
							? trafficFields.tehranEnabled !== false || trafficFields.provinceEnabled === true
							: trafficFields.tehranPricing != null || trafficFields.provincePricing != null;
						if (!hasLocation) {
							ctx.addIssue({
								code: "custom",
								path: ["serviceFields", "tehranPricing"],
								message: i18n.t("contract.traffic.minLocation"),
							});
						}
					}

					// ✅ New: Validate only if the contract is official
					const isOfficial = (val.serviceFields as any)?.isOfficial === true;

					if (isOfficial && ["CP", "PREMIUM", "IXP", "TCI"].includes(trafficCompanyType)) {
						// واحد در قرارداد اصلی و هر الحاقیه (old: «واحد الحاقیه را انتخاب کنید»)
						const validateUnits = (fields: any, path: Array<string | number>) => {
							if (fields?.tehranPricing != null && isBlankValue(fields?.tehranUnit)) {
								ctx.addIssue({
									code: "custom",
									path: [...path, "tehranUnit"],
									message: i18n.t("contract.schema.tehranUnit"),
								});
							}
							if (fields?.provincePricing != null && isBlankValue(fields?.provinceUnit)) {
								ctx.addIssue({
									code: "custom",
									path: [...path, "provinceUnit"],
									message: i18n.t("contract.schema.provinceUnit"),
								});
							}
							(fields?.addenda ?? fields?.children ?? []).forEach((addendum: any, index: number) =>
								validateUnits(addendum, [...path, fields?.addenda ? "addenda" : "children", index]),
							);
						};

						validateUnits(val.serviceFields, ["serviceFields"]);
					}

					if (isOfficial && trafficCompanyType === "IXP") {
						const validateRatePercentages = (pricing: any, contractModel: unknown, path: Array<string | number>) => {
							if (contractModel !== "VARIABLE_TABLE")
								return;
							if (pricing?.type === "fixed") {
								if (isBlankValue(pricing.ratePercentage)) {
									ctx.addIssue({
										code: "custom",
										path: [...path, "ratePercentage"],
										message: i18n.t("contract.schema.ratePercent"),
									});
								}
								return;
							}

							const validateRows = (rows: any[], rowsPath: Array<string | number>) => {
								rows.forEach((row, index) => {
									if (isBlankValue(row?.ratePercentage)) {
										ctx.addIssue({
											code: "custom",
											path: [...rowsPath, index, "ratePercentage"],
											message: i18n.t("contract.schema.ratePercent"),
										});
									}
								});
							};

							if (pricing?.type === "tier_blended") {
								(pricing.sections ?? []).forEach((section: any, index: number) =>
									validateRows(section?.rows ?? [], [...path, "sections", index, "rows"]),
								);
							}
							else if (["tier_fixed", "tier_variable"].includes(pricing?.type)) {
								validateRows(pricing.rows ?? [], [...path, "rows"]);
							}
						};

						const validateLocations = (fields: any, path: Array<string | number>) => {
							validateRatePercentages(fields?.tehranPricing, fields?.tehranContractModel, [...path, "tehranPricing"]);
							validateRatePercentages(fields?.provincePricing, fields?.provinceContractModel, [...path, "provincePricing"]);
							(fields?.addenda ?? []).forEach((addendum: any, index: number) =>
								validateLocations(addendum, [...path, "addenda", index]),
							);
							(fields?.children ?? []).forEach((child: any, index: number) =>
								validateLocations(child, [...path, "children", index]),
							);
						};

						validateLocations(val.serviceFields, ["serviceFields"]);
					}

					if (isOfficial && val.companyType === "PREMIUM") {
						// درصد سهم درآمد در قرارداد اصلی و هر الحاقیه الزامی است
						const validateRevenuePercents = (fields: any, path: Array<string | number>) => {
							if (fields?.tehranPricing != null && fields?.tehranRevenuePercent == null) {
								ctx.addIssue({
									code: "custom",
									path: [...path, "tehranRevenuePercent"],
									message: i18n.t("contract.schema.tehranRevenueShare"),
								});
							}
							if (fields?.provincePricing != null && fields?.provinceRevenuePercent == null) {
								ctx.addIssue({
									code: "custom",
									path: [...path, "provinceRevenuePercent"],
									message: i18n.t("contract.schema.provinceRevenueShare"),
								});
							}
							(fields?.addenda ?? []).forEach((addendum: any, index: number) => validateRevenuePercents(addendum, [...path, "addenda", index]));
							(fields?.children ?? []).forEach((child: any, index: number) => validateRevenuePercents(child, [...path, "children", index]));
						};

						validateRevenuePercents(val.serviceFields, ["serviceFields"]);
					}
				}
			}

			else {
				if (val.companyId == null) {
					ctx.addIssue({ code: "custom", path: ["companyId"], message: i18n.t("contract.schema.company") });
				}
			}
		});
}
