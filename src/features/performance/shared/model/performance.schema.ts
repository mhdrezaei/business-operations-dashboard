import type { OpenApiContractModel, PerformanceServiceCode } from "./performance.form.types";
import i18next from "i18next";
import { z } from "zod";
import { performanceServiceRegistry } from "../services/registry";
import { salesAgencyFieldsSchema } from "../services/sales-agency/sales-agency.schema";
import { isCollocationCompanyType } from "../services/traffic/traffic-collocation";
import { isSmsCommissionCode } from "./performance.helpers";

const baseSchema = z.object({
	serviceId: z.number().int().positive().nullable(),
	serviceCode: z.preprocess(v => (v === undefined ? null : v), z.string().nullable()),
	companyId: z.number().int().positive().nullable(),
	companyType: z.preprocess((value) => {
		if (value == null || value === "")
			return null;

		const normalized = String(value).trim().toUpperCase();
		return normalized || null;
	}, z.string().nullable()),
	salesAgentId: z.number().int().positive().nullable(),
	year: z.number().int().min(1401).max(1415).nullable(),
	month: z.number().int().min(1).max(12).nullable(),
	contractId: z.number().int().positive().nullable(),
	contractModel: z.preprocess(
		v => (v === "" || v == null ? null : v),
		z.enum(["legacy", "package", "legacy_2"]).nullable(),
	),
});

function requireNotNull(
	value: unknown,
	path: (string | number)[],
	message: string,
	ctx: z.RefinementCtx,
) {
	if (value != null)
		return;
	ctx.addIssue({
		code: "custom",
		path,
		message,
	});
}

export function buildPerformanceSchema(
	serviceCode: PerformanceServiceCode | null,
	contractModel: OpenApiContractModel | null,
) {
	const module = serviceCode ? performanceServiceRegistry[serviceCode] : undefined;
	const fallbackSchema = z.record(z.string(), z.unknown());
	const moduleSchema = module?.schema ?? fallbackSchema;

	return baseSchema
		.and(
			z.object({
				serviceFields: z.preprocess(v => (v == null ? {} : v), moduleSchema),
			}),
		)
		.superRefine((value, ctx) => {
			const normalizedCode = (value.serviceCode ?? "").trim().toLowerCase();
			const serviceFields = (value.serviceFields ?? {}) as Record<string, unknown>;
			const trafficSubmitMode = normalizedCode === "traffic"
				? String(serviceFields.submitMode ?? "").trim().toLowerCase()
				: "";
			const requiresCompanyType = normalizedCode === "traffic" || normalizedCode === "psp" || normalizedCode === "sms" || normalizedCode === "sales_agency";

			requireNotNull(value.serviceId, ["serviceId"], i18next.t("performance.validation.base.serviceRequired"), ctx);
			requireNotNull(value.serviceCode, ["serviceCode"], i18next.t("performance.validation.base.serviceCodeRequired"), ctx);
			requireNotNull(value.year, ["year"], i18next.t("performance.validation.base.yearRequired"), ctx);
			requireNotNull(value.month, ["month"], i18next.t("performance.validation.base.monthRequired"), ctx);

			if (!(normalizedCode === "traffic" && trafficSubmitMode === "template")) {
				requireNotNull(value.companyId, ["companyId"], i18next.t("performance.validation.base.companyRequired"), ctx);
			}

			if (!(normalizedCode === "traffic" && trafficSubmitMode === "template")) {
				requireNotNull(value.contractId, ["contractId"], i18next.t("performance.validation.base.contractForMonthNotFound"), ctx);
			}

			if (requiresCompanyType) {
				if (value.companyType == null || !String(value.companyType).trim()) {
					ctx.addIssue({
						code: "custom",
						path: ["companyType"],
						message: i18next.t("performance.validation.base.companyTypeRequired"),
					});
				}
			}

			if (normalizedCode === "traffic" && trafficSubmitMode === "single" && String(value.companyType ?? "").toUpperCase() === "CP") {
				const sections = [
					{ enabled: serviceFields.tehranEnabled !== false, field: "tehranConversionRatio", message: "performance.validation.traffic.tehranConversionRatioRequired" },
					{ enabled: serviceFields.countyEnabled === true, field: "countyConversionRatio", message: "performance.validation.traffic.countyConversionRatioRequired" },
				];
				sections.forEach(({ enabled, field, message }) => {
					requireNotNull(enabled ? serviceFields[field] : true, ["serviceFields", field], i18next.t(message), ctx);
				});
			}

			if (normalizedCode === "traffic" && trafficSubmitMode === "single" && isCollocationCompanyType(value.companyType)) {
				requireNotNull(serviceFields.collocationMode, ["serviceFields", "collocationMode"], i18next.t("performance.validation.traffic.collocationPartnerRequired"), ctx);
			}

			if (isSmsCommissionCode(normalizedCode) && value.salesAgentId == null) {
				ctx.addIssue({
					code: "custom",
					path: ["salesAgentId"],
					message: i18next.t("performance.validation.base.salesAgentRequired"),
				});
			}

			if (normalizedCode === "sales_agency" && value.companyType != null) {
				const parsed = salesAgencyFieldsSchema(value.companyType).safeParse(serviceFields);
				if (!parsed.success) {
					parsed.error.issues.forEach(issue => ctx.addIssue({
						code: "custom",
						path: ["serviceFields", ...issue.path],
						message: issue.message,
					}));
				}
				return;
			}

			if (normalizedCode === "openapi") {
				if (!contractModel) {
					ctx.addIssue({
						code: "custom",
						path: ["contractModel"],
						message: i18next.t("performance.validation.base.openapiContractModelUnknown"),
					});
					return;
				}

				if (contractModel === "legacy") {
					requireNotNull(
						serviceFields.billInquiryValue,
						["serviceFields", "billInquiryValue"],
						i18next.t("performance.validation.openapi.billInquiryValueRequired"),
						ctx,
					);
					requireNotNull(
						serviceFields.receiptRegisterValue,
						["serviceFields", "receiptRegisterValue"],
						i18next.t("performance.validation.openapi.receiptRegisterValueRequired"),
						ctx,
					);
				}

				if (contractModel === "legacy_2") {
					requireNotNull(serviceFields.billInquiryMidtermValue, ["serviceFields", "billInquiryMidtermValue"], i18next.t("performance.validation.openapi.billInquiryMidtermValueRequired"), ctx);
					requireNotNull(serviceFields.billInquiryEndtermValue, ["serviceFields", "billInquiryEndtermValue"], i18next.t("performance.validation.openapi.billInquiryEndtermValueRequired"), ctx);
					requireNotNull(serviceFields.receiptRegisterConnectedValue, ["serviceFields", "receiptRegisterConnectedValue"], i18next.t("performance.validation.openapi.receiptRegisterConnectedValueRequired"), ctx);
					requireNotNull(serviceFields.receiptRegisterDisconnectedValue, ["serviceFields", "receiptRegisterDisconnectedValue"], i18next.t("performance.validation.openapi.receiptRegisterDisconnectedValueRequired"), ctx);
				}

				if (contractModel === "package") {
					requireNotNull(
						serviceFields.billInquiryValue,
						["serviceFields", "billInquiryValue"],
						i18next.t("performance.validation.openapi.billInquiryValueRequired"),
						ctx,
					);
					requireNotNull(
						serviceFields.trafficRevenue,
						["serviceFields", "trafficRevenue"],
						i18next.t("performance.validation.openapi.trafficRevenueRequired"),
						ctx,
					);
					requireNotNull(
						serviceFields.trafficPackageCount,
						["serviceFields", "trafficPackageCount"],
						i18next.t("performance.validation.openapi.trafficPackageCountRequired"),
						ctx,
					);
					requireNotNull(serviceFields.irancellFa, ["serviceFields", "irancellFa"], i18next.t("performance.validation.sms.irancellFaRequired"), ctx);
					requireNotNull(serviceFields.irancellEn, ["serviceFields", "irancellEn"], i18next.t("performance.validation.sms.irancellEnRequired"), ctx);
					requireNotNull(serviceFields.mciFa, ["serviceFields", "mciFa"], i18next.t("performance.validation.sms.mciFaRequired"), ctx);
					requireNotNull(serviceFields.mciEn, ["serviceFields", "mciEn"], i18next.t("performance.validation.sms.mciEnRequired"), ctx);
					requireNotNull(serviceFields.otherFa, ["serviceFields", "otherFa"], i18next.t("performance.validation.sms.otherFaRequired"), ctx);
					requireNotNull(serviceFields.otherEn, ["serviceFields", "otherEn"], i18next.t("performance.validation.sms.otherEnRequired"), ctx);
				}
				return;
			}

			if (normalizedCode === "psp") {
				requireNotNull(
					serviceFields.performanceValue,
					["serviceFields", "performanceValue"],
					i18next.t("performance.validation.psp.performanceValueRequired"),
					ctx,
				);
				requireNotNull(
					serviceFields.monthlyRevenue,
					["serviceFields", "monthlyRevenue"],
					i18next.t("performance.validation.psp.monthlyRevenueRequired"),
					ctx,
				);
				return;
			}

			if (normalizedCode === "shahkar") {
				requireNotNull(
					serviceFields.performanceValue,
					["serviceFields", "performanceValue"],
					i18next.t("performance.validation.shahkar.performanceValueRequired"),
					ctx,
				);
				return;
			}

			if (normalizedCode === "sms" || isSmsCommissionCode(normalizedCode)) {
				requireNotNull(serviceFields.irancellFa, ["serviceFields", "irancellFa"], i18next.t("performance.validation.sms.irancellFaRequired"), ctx);
				requireNotNull(serviceFields.irancellEn, ["serviceFields", "irancellEn"], i18next.t("performance.validation.sms.irancellEnRequired"), ctx);
				requireNotNull(serviceFields.mciFa, ["serviceFields", "mciFa"], i18next.t("performance.validation.sms.mciFaRequired"), ctx);
				requireNotNull(serviceFields.mciEn, ["serviceFields", "mciEn"], i18next.t("performance.validation.sms.mciEnRequired"), ctx);
				requireNotNull(serviceFields.otherFa, ["serviceFields", "otherFa"], i18next.t("performance.validation.sms.otherFaRequired"), ctx);
				requireNotNull(serviceFields.otherEn, ["serviceFields", "otherEn"], i18next.t("performance.validation.sms.otherEnRequired"), ctx);
			}
		});
}
