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

function buildBasePayload(values: PerformanceFormValues) {
	return {
		company: values.companyId,
		service: values.serviceId,
		sh_year: values.year,
		sh_month: values.month,
	};
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

async function submitManualPerformance(values: PerformanceFormValues, servicePath: PerformanceServicePath) {
	if (!values.companyId || !values.year || !values.month) {
		throw new Error(i18next.t("performance.errors.baseFormIncomplete"));
	}

	const operations = buildManualOperations(values);
	for (const operation of operations) {
		await upsertPerformance({
			service: servicePath,
			companyId: values.companyId,
			year: values.year,
			month: values.month,
			payload: operation.payload,
			searchParams: operation.searchParams,
			suppressErrorNotification: true,
		});
	}
}

async function submitTrafficFiles(values: PerformanceFormValues) {
	if (!values.companyId || !values.year || !values.month) {
		throw new Error(i18next.t("performance.errors.baseFormIncomplete"));
	}

	const monthlyPerformanceFile = getFirstFileFromUploadField((values.serviceFields as any)?.monthlyPerformanceFile);
	if (!monthlyPerformanceFile) {
		throw new Error(i18next.t("performance.errors.monthlyPerformanceFileRequired"));
	}

	await uploadPerformanceFiles({
		service: "traffic",
		files: {
			file: monthlyPerformanceFile,
		},
		extraFields: {
			company_type: values.trafficCompanyType,
			service: values.serviceId,
			company: values.companyId,
			sh_year: values.year,
			sh_month: values.month,
		},
		suppressErrorNotification: true,
	});
}

async function submitTrafficSingle(values: PerformanceFormValues) {
	if (!values.companyId || !values.year || !values.month) {
		throw new Error(i18next.t("performance.errors.baseFormIncomplete"));
	}

	const fields = (values.serviceFields ?? {}) as Record<string, any>;
	const tehranValue = fields.tehranValue;
	const tehranValueReceive = fields.tehranValueReceive;
	const countyEnabled = Boolean(fields.countyEnabled);
	const countyValue = fields.countyValue;
	const countyValueReceive = fields.countyValueReceive;

	if (tehranValue == null || tehranValueReceive == null) {
		throw new Error(i18next.t("performance.errors.trafficTehranRequired"));
	}

	const locations: Array<Record<string, unknown>> = [
		{
			location: "TEHRAN",
			value: tehranValue,
			value_receive: tehranValueReceive,
		},
	];

	if (countyEnabled) {
		if (countyValue == null || countyValueReceive == null) {
			throw new Error(i18next.t("performance.errors.trafficCountyRequiredWhenEnabled"));
		}

		locations.push({
			location: "COUNTY",
			value: countyValue,
			value_receive: countyValueReceive,
		});
	}

	await upsertPerformance({
		service: "traffic",
		companyId: values.companyId,
		year: values.year,
		month: values.month,
		payload: {
			...buildBasePayload(values),
			company_type: values.trafficCompanyType,
			locations,
		},
		suppressErrorNotification: true,
	});
}

async function submitCommercialFiles(values: PerformanceFormValues) {
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

	await uploadPerformanceFiles({
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

export async function submitPerformance(values: PerformanceFormValues) {
	const servicePath = resolvePerformanceServicePath(values.serviceCode);
	if (!servicePath) {
		throw new Error(i18next.t("performance.errors.serviceNotSelected"));
	}

	if (servicePath === "traffic") {
		const mode = String((values.serviceFields as any)?.submitMode ?? "template");
		if (mode === "single") {
			await submitTrafficSingle(values);
		}
		else {
			await submitTrafficFiles(values);
		}
		return;
	}

	if (servicePath === "commercial") {
		await submitCommercialFiles(values);
		return;
	}

	await submitManualPerformance(values, servicePath);
}
