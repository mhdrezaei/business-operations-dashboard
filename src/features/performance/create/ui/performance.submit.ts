import type { PerformanceServicePath } from "../../api/performances.api";
import type { PerformanceFormValues } from "../../shared/model/performance.form.types";
import i18next from "i18next";
import {
	uploadPerformanceFiles,
	upsertPerformance,
} from "../../api/performances.api";
import {
	getFirstFileFromUploadField,
	isSmsCommissionCode,
	resolvePerformanceServicePath,
} from "../../shared/model/performance.helpers";

interface PerformanceOperation {
	payload: Record<string, unknown>
	searchParams?: Record<string, string | number | boolean | null | undefined>
}

export interface SubmitPerformanceResult {
	servicePath: PerformanceServicePath
	record: Record<string, unknown> | null
}

function buildBasePayload(values: PerformanceFormValues) {
	return {
		company: values.companyId,
		service: values.serviceId,
		sh_year: values.year,
		sh_month: values.month,
	};
}

function toNullableNumber(value: unknown) {
	if (value == null || value === "")
		return null;

	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : null;
}

function buildManualOperations(values: PerformanceFormValues): PerformanceOperation[] {
	const code = (values.serviceCode ?? "").trim().toLowerCase();
	const fields = (values.serviceFields ?? {}) as Record<string, any>;

	if (code === "openapi") {
		if (values.contractModel === "legacy") {
			return [
				{
					payload: {
						...buildBasePayload(values),
						bill_inquiry_value: fields.billInquiryValue,
						receipt_register_value: fields.receiptRegisterValue,
					},
				},
			];
		}
		if (values.contractModel === "package") {
			return [
				{
					payload: {
						...buildBasePayload(values),
						sms_mci_fa: fields.mciFa,
						sms_mci_en: fields.mciEn,
						sms_irancell_fa: fields.irancellFa,
						sms_irancell_en: fields.irancellEn,
						sms_other_fa: fields.otherFa,
						sms_other_en: fields.otherEn,
						bill_inquiry_value: fields.billInquiryValue,
						traffic_income: fields.trafficRevenue,
						traffic_package_count: fields.trafficPackageCount,
					},
				},
			];
		}
		return [];
	}

	if (code === "psp") {
		return [
			{
				payload: {
					...buildBasePayload(values),
					company_type: values.companyType,
					value: fields.performanceValue,
					income: fields.monthlyRevenue,
				},
			},
		];
	}

	if (code === "shahkar") {
		return [
			{
				payload: {
					...buildBasePayload(values),
					value: fields.performanceValue,
				},
			},
		];
	}

	if (code === "sms") {
		return [
			{
				payload: {
					...buildBasePayload(values),
					company_type: values.companyType,
					items: [
						{ operator: "IRANCELL", language: "FA", value: String(fields.irancellFa ?? "") },
						{ operator: "IRANCELL", language: "EN", value: String(fields.irancellEn ?? "") },
						{ operator: "MCI", language: "FA", value: String(fields.mciFa ?? "") },
						{ operator: "MCI", language: "EN", value: String(fields.mciEn ?? "") },
						{ operator: "OTHER", language: "FA", value: String(fields.otherFa ?? "") },
						{ operator: "OTHER", language: "EN", value: String(fields.otherEn ?? "") },
					],
				},
			},
		];
	}

	if (isSmsCommissionCode(code)) {
		return [
			{
				payload: {
					...buildBasePayload(values),
					sales_agent: values.salesAgentId,
					items: [
						{ operator: "IRANCELL", language: "FA", value: String(fields.irancellFa ?? "") },
						{ operator: "IRANCELL", language: "EN", value: String(fields.irancellEn ?? "") },
						{ operator: "MCI", language: "FA", value: String(fields.mciFa ?? "") },
						{ operator: "MCI", language: "EN", value: String(fields.mciEn ?? "") },
						{ operator: "OTHER", language: "FA", value: String(fields.otherFa ?? "") },
						{ operator: "OTHER", language: "EN", value: String(fields.otherEn ?? "") },
					],
				},
			},
		];
	}

	return [];
}

async function submitManualPerformance(values: PerformanceFormValues, servicePath: PerformanceServicePath): Promise<Record<string, unknown> | null> {
	if (!values.companyId || !values.year || !values.month) {
		throw new Error(i18next.t("performance.errors.baseFormIncomplete"));
	}

	const operations = buildManualOperations(values);
	let lastResponse: Record<string, unknown> | null = null;
	for (const operation of operations) {
		lastResponse = await upsertPerformance({
			service: servicePath,
			companyId: values.companyId,
			year: values.year,
			month: values.month,
			payload: operation.payload,
			searchParams: operation.searchParams,
			suppressErrorNotification: true,
		});
	}

	return lastResponse;
}

async function submitTrafficFiles(values: PerformanceFormValues): Promise<Record<string, unknown> | null> {
	if (!values.year || !values.month || !values.companyType) {
		throw new Error(i18next.t("performance.errors.baseFormIncomplete"));
	}

	const monthlyPerformanceFile = getFirstFileFromUploadField((values.serviceFields as any)?.monthlyPerformanceFile);
	if (!monthlyPerformanceFile) {
		throw new Error(i18next.t("performance.errors.monthlyPerformanceFileRequired"));
	}

	return await uploadPerformanceFiles({
		service: "traffic",
		files: {
			file: monthlyPerformanceFile,
		},
		extraFields: {
			company_type: values.companyType,
			sh_year: values.year,
			sh_month: values.month,
		},
		suppressErrorNotification: true,
	});
}

async function submitTrafficSingle(values: PerformanceFormValues): Promise<Record<string, unknown> | null> {
	if (!values.companyId || !values.year || !values.month || !values.companyType) {
		throw new Error(i18next.t("performance.errors.baseFormIncomplete"));
	}

	const fields = (values.serviceFields ?? {}) as Record<string, any>;
	const tehranValue = toNullableNumber(fields.tehranValue);
	const tehranValueReceive = toNullableNumber(fields.tehranValueReceive);
	const tehranConversionRatio = toNullableNumber(fields.tehranConversionRatio);
	const countyEnabled = Boolean(fields.countyEnabled);
	const countyValue = toNullableNumber(fields.countyValue);
	const countyValueReceive = toNullableNumber(fields.countyValueReceive);
	const countyConversionRatio = toNullableNumber(fields.countyConversionRatio);
	const isCp = typeof values.companyType === "string" && values.companyType.toUpperCase() === "CP";

	if (tehranValue == null || tehranValueReceive == null) {
		throw new Error(i18next.t("performance.errors.trafficTehranRequired"));
	}

	const trafficPayload: Record<string, unknown> = {
		tehran_value: tehranValue,
		tehran_value_receive: tehranValueReceive,
	};

	if (isCp) {
		trafficPayload.tehran_conversion_ratio = tehranConversionRatio;
	}

	if (countyEnabled) {
		if (countyValue == null || countyValueReceive == null) {
			throw new Error(i18next.t("performance.errors.trafficCountyRequiredWhenEnabled"));
		}

		trafficPayload.county_value = countyValue;
		trafficPayload.county_value_receive = countyValueReceive;

		if (isCp) {
			trafficPayload.county_conversion_ratio = countyConversionRatio;
		}
	}

	return await upsertPerformance({
		service: "traffic",
		companyId: values.companyId,
		year: values.year,
		month: values.month,
		payload: {
			...buildBasePayload(values),
			company_type: values.companyType,
			...trafficPayload,
		},
		suppressErrorNotification: true,
	});
}

async function submitCommercialFiles(values: PerformanceFormValues): Promise<Record<string, unknown> | null> {
	if (!values.companyId || !values.year || !values.month) {
		throw new Error(i18next.t("performance.errors.baseFormIncomplete"));
	}

	const fields = (values.serviceFields ?? {}) as Record<string, unknown>;
	const servicesFile = getFirstFileFromUploadField(fields.servicesFile);
	const provinceCodeFile = getFirstFileFromUploadField(fields.provinceCodeFile);
	const monthlyPerformanceFile = getFirstFileFromUploadField(fields.monthlyPerformanceFile);

	if (!servicesFile || !provinceCodeFile || !monthlyPerformanceFile) {
		throw new Error(i18next.t("performance.errors.allCommercialFilesRequired"));
	}

	return await uploadPerformanceFiles({
		service: "commercial",
		files: {
			services_file: servicesFile,
			province_code_file: provinceCodeFile,
			monthly_file: monthlyPerformanceFile,
		},
		extraFields: {
			service: values.serviceId,
			company: values.companyId,
			sh_year: values.year,
			sh_month: values.month,
		},
		suppressErrorNotification: true,
	});
}

export async function submitPerformance(values: PerformanceFormValues): Promise<SubmitPerformanceResult> {
	const servicePath = resolvePerformanceServicePath(values.serviceCode);
	if (!servicePath) {
		throw new Error(i18next.t("performance.errors.serviceNotSelected"));
	}

	if (servicePath === "traffic") {
		const mode = String((values.serviceFields as any)?.submitMode ?? "template");
		if (mode === "single") {
			return {
				servicePath,
				record: await submitTrafficSingle(values),
			};
		}
		return {
			servicePath,
			record: await submitTrafficFiles(values),
		};
	}

	if (servicePath === "commercial") {
		return {
			servicePath,
			record: await submitCommercialFiles(values),
		};
	}

	return {
		servicePath,
		record: await submitManualPerformance(values, servicePath),
	};
}
