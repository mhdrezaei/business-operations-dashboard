import type { OpenApiContractModel, PerformanceServiceCode } from "./performance.form.types";
import i18next from "i18next";
import { z } from "zod";
import { performanceServiceRegistry } from "../services/registry";
import { isSmsCommissionCode } from "./performance.helpers";

const baseSchema = z.object({
	serviceId: z.number().int().positive().nullable(),
	serviceCode: z.preprocess(v => (v === undefined ? null : v), z.string().nullable()),
	companyId: z.number().int().positive().nullable(),
	trafficCompanyType: z.enum(["CP", "IXP", "TCI", "PREMIUM"]).nullable(),
	salesAgentId: z.number().int().positive().nullable(),
	year: z.number().int().min(1401).max(1415).nullable(),
	month: z.number().int().min(1).max(12).nullable(),
	contractId: z.number().int().positive().nullable(),
	contractModel: z.preprocess(
		v => (v === "" || v == null ? null : v),
		z.enum(["legacy", "package"]).nullable(),
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

function isUploadListEmpty(value: unknown) {
	return !Array.isArray(value) || value.length < 1;
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
			requireNotNull(value.serviceId, ["serviceId"], i18next.t("performance.validation.base.serviceRequired"), ctx);
			requireNotNull(value.serviceCode, ["serviceCode"], i18next.t("performance.validation.base.serviceCodeRequired"), ctx);
			requireNotNull(value.companyId, ["companyId"], i18next.t("performance.validation.base.companyRequired"), ctx);
			requireNotNull(value.year, ["year"], i18next.t("performance.validation.base.yearRequired"), ctx);
			requireNotNull(value.month, ["month"], i18next.t("performance.validation.base.monthRequired"), ctx);
			requireNotNull(value.contractId, ["contractId"], i18next.t("performance.validation.base.contractForMonthNotFound"), ctx);

			const normalizedCode = (value.serviceCode ?? "").trim().toLowerCase();
			const serviceFields = (value.serviceFields ?? {}) as Record<string, unknown>;

			if (normalizedCode === "traffic" && value.trafficCompanyType == null) {
				ctx.addIssue({
					code: "custom",
					path: ["trafficCompanyType"],
					message: i18next.t("performance.validation.base.trafficCompanyTypeRequired"),
				});
			}

			if (isSmsCommissionCode(normalizedCode) && value.salesAgentId == null) {
				ctx.addIssue({
					code: "custom",
					path: ["salesAgentId"],
					message: i18next.t("performance.validation.base.salesAgentRequired"),
				});
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
				return;
			}

			if (normalizedCode === "commercial") {
				if (isUploadListEmpty(serviceFields.servicesFile)) {
					ctx.addIssue({
						code: "custom",
						path: ["serviceFields", "servicesFile"],
						message: i18next.t("performance.validation.commercial.servicesFileRequired"),
					});
				}
				if (isUploadListEmpty(serviceFields.provinceCodeFile)) {
					ctx.addIssue({
						code: "custom",
						path: ["serviceFields", "provinceCodeFile"],
						message: i18next.t("performance.validation.commercial.provinceCodeFileRequired"),
					});
				}
				if (isUploadListEmpty(serviceFields.monthlyPerformanceFile)) {
					ctx.addIssue({
						code: "custom",
						path: ["serviceFields", "monthlyPerformanceFile"],
						message: i18next.t("performance.validation.commercial.monthlyPerformanceFileRequired"),
					});
				}
			}
		});
}
