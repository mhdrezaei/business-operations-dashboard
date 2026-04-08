import type { OpenApiContractModel, PerformanceServiceCode } from "./performance.form.types";
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
			requireNotNull(value.serviceId, ["serviceId"], "انتخاب سرویس الزامی است", ctx);
			requireNotNull(value.serviceCode, ["serviceCode"], "کد سرویس الزامی است", ctx);
			requireNotNull(value.companyId, ["companyId"], "انتخاب شرکت الزامی است", ctx);
			requireNotNull(value.year, ["year"], "سال الزامی است", ctx);
			requireNotNull(value.month, ["month"], "ماه الزامی است", ctx);
			requireNotNull(value.contractId, ["contractId"], "برای ماه انتخاب‌شده قرارداد فعال پیدا نشد", ctx);

			const normalizedCode = (value.serviceCode ?? "").trim().toLowerCase();
			const serviceFields = (value.serviceFields ?? {}) as Record<string, unknown>;

			if (normalizedCode === "traffic" && value.trafficCompanyType == null) {
				ctx.addIssue({
					code: "custom",
					path: ["trafficCompanyType"],
					message: "نوع شرکت (ترافیک) الزامی است",
				});
			}

			if (isSmsCommissionCode(normalizedCode) && value.salesAgentId == null) {
				ctx.addIssue({
					code: "custom",
					path: ["salesAgentId"],
					message: "نماینده فروش الزامی است",
				});
			}

			if (normalizedCode === "openapi") {
				if (!contractModel) {
					ctx.addIssue({
						code: "custom",
						path: ["contractModel"],
						message: "مدل قرارداد OpenAPI مشخص نیست",
					});
					return;
				}

				if (contractModel === "legacy") {
					requireNotNull(
						serviceFields.billInquiryValue,
						["serviceFields", "billInquiryValue"],
						"مقدار عملکرد استعلام قبض الزامی است",
						ctx,
					);
					requireNotNull(
						serviceFields.receiptRegisterValue,
						["serviceFields", "receiptRegisterValue"],
						"مقدار عملکرد ثبت وصولی الزامی است",
						ctx,
					);
				}

				if (contractModel === "package") {
					requireNotNull(
						serviceFields.billInquiryValue,
						["serviceFields", "billInquiryValue"],
						"مقدار عملکرد استعلام قبض الزامی است",
						ctx,
					);
					requireNotNull(
						serviceFields.trafficRevenue,
						["serviceFields", "trafficRevenue"],
						"درآمد ترافیک الزامی است",
						ctx,
					);
					requireNotNull(
						serviceFields.trafficPackageCount,
						["serviceFields", "trafficPackageCount"],
						"تعداد بسته ترافیک الزامی است",
						ctx,
					);
					requireNotNull(
						serviceFields.irancellFa,
						["serviceFields", "irancellFa"],
						"مقدار عملکرد ایرانسل - فارسی الزامی است",
						ctx,
					);
					requireNotNull(
						serviceFields.irancellEn,
						["serviceFields", "irancellEn"],
						"مقدار عملکرد ایرانسل - انگلیسی الزامی است",
						ctx,
					);
					requireNotNull(
						serviceFields.mciFa,
						["serviceFields", "mciFa"],
						"مقدار عملکرد همراه اول - فارسی الزامی است",
						ctx,
					);
					requireNotNull(
						serviceFields.mciEn,
						["serviceFields", "mciEn"],
						"مقدار عملکرد همراه اول - انگلیسی الزامی است",
						ctx,
					);
					requireNotNull(
						serviceFields.otherFa,
						["serviceFields", "otherFa"],
						"مقدار عملکرد سایر - فارسی الزامی است",
						ctx,
					);
					requireNotNull(
						serviceFields.otherEn,
						["serviceFields", "otherEn"],
						"مقدار عملکرد سایر - انگلیسی الزامی است",
						ctx,
					);
				}
				return;
			}

			if (normalizedCode === "psp") {
				requireNotNull(
					serviceFields.performanceValue,
					["serviceFields", "performanceValue"],
					"مقدار عملکرد الزامی است",
					ctx,
				);
				requireNotNull(
					serviceFields.monthlyRevenue,
					["serviceFields", "monthlyRevenue"],
					"درآمد این ماه الزامی است",
					ctx,
				);
				return;
			}

			if (normalizedCode === "shahkar") {
				requireNotNull(
					serviceFields.performanceValue,
					["serviceFields", "performanceValue"],
					"مقدار عملکرد الزامی است",
					ctx,
				);
				return;
			}

			if (normalizedCode === "sms" || isSmsCommissionCode(normalizedCode)) {
				requireNotNull(serviceFields.irancellFa, ["serviceFields", "irancellFa"], "مقدار عملکرد ایرانسل - فارسی الزامی است", ctx);
				requireNotNull(serviceFields.irancellEn, ["serviceFields", "irancellEn"], "مقدار عملکرد ایرانسل - انگلیسی الزامی است", ctx);
				requireNotNull(serviceFields.mciFa, ["serviceFields", "mciFa"], "مقدار عملکرد همراه اول - فارسی الزامی است", ctx);
				requireNotNull(serviceFields.mciEn, ["serviceFields", "mciEn"], "مقدار عملکرد همراه اول - انگلیسی الزامی است", ctx);
				requireNotNull(serviceFields.otherFa, ["serviceFields", "otherFa"], "مقدار عملکرد سایر - فارسی الزامی است", ctx);
				requireNotNull(serviceFields.otherEn, ["serviceFields", "otherEn"], "مقدار عملکرد سایر - انگلیسی الزامی است", ctx);
				return;
			}

			if (normalizedCode === "commercial") {
				if (isUploadListEmpty(serviceFields.servicesFile)) {
					ctx.addIssue({
						code: "custom",
						path: ["serviceFields", "servicesFile"],
						message: "فایل سرویس‌ها الزامی است",
					});
				}
				if (isUploadListEmpty(serviceFields.provinceCodeFile)) {
					ctx.addIssue({
						code: "custom",
						path: ["serviceFields", "provinceCodeFile"],
						message: "فایل کد استانی الزامی است",
					});
				}
				if (isUploadListEmpty(serviceFields.monthlyPerformanceFile)) {
					ctx.addIssue({
						code: "custom",
						path: ["serviceFields", "monthlyPerformanceFile"],
						message: "فایل عملکرد ماهانه الزامی است",
					});
				}
			}
		});
}
