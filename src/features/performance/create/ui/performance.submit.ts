import type { PerformanceServicePath } from "../../api/performances.api";
import type { PerformanceFormValues } from "../../shared/model/performance.form.types";
import type { CollocationRow } from "../../shared/services/traffic/traffic-collocation";
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
import { buildCollocationRowsPayload, COLLOCATION_ROW_METRICS, isCollocationCompanyType } from "../../shared/services/traffic/traffic-collocation";

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
		if (values.contractModel === "legacy_2") {
			return [
				{
					payload: {
						...buildBasePayload(values),
						bill_inquiry_midterm_value: fields.billInquiryMidtermValue,
						bill_inquiry_endterm_value: fields.billInquiryEndtermValue,
						receipt_register_connected_value: fields.receiptRegisterConnectedValue,
						receipt_register_disconnected_value: fields.receiptRegisterDisconnectedValue,
						wallet_was_charged: Boolean(fields.walletWasCharged),
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

	if (code === "sales_agency") {
		const companyType = String(values.companyType ?? "").toUpperCase();
		if (companyType === "OUTBOUND") {
			return [{ payload: { ...buildBasePayload(values), company_type: companyType, total_sales: fields.total_sales } }];
		}
		if (companyType === "SALES_REP_MANAGEMENT") {
			return [{ payload: { ...buildBasePayload(values), company_type: companyType, credit_total: fields.credit_total, income: fields.income, cost_items: fields.cost_items } }];
		}
	}

	if (code === "shahkar") {
		const newCustomerCount = fields.hasNewCustomerRate === true
			? { new_customer_count: toNullableNumber(fields.newCustomerCount) }
			: {};
		return [
			{
				payload: {
					...buildBasePayload(values),
					value: fields.performanceValue,
					...newCustomerCount,
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
	if (isCollocationCompanyType(values.companyType)) {
		const rows = (fields.collocationRows ?? []) as CollocationRow[];
		if (!fields.collocationMode || rows.length < 1 || rows.some(row => COLLOCATION_ROW_METRICS.some(metric => toNullableNumber(row[metric]) == null))) {
			throw new Error(i18next.t("performance.validation.traffic.collocationFieldRequired"));
		}

		return await upsertPerformance({
			service: "traffic",
			companyId: values.companyId,
			year: values.year,
			month: values.month,
			payload: {
				...buildBasePayload(values),
				company_type: values.companyType,
				collocation_rows: buildCollocationRowsPayload(rows, fields.collocationMode),
			},
			suppressErrorNotification: true,
		});
	}

	const tehranEnabled = fields.tehranEnabled !== false;
	const tehranValue = toNullableNumber(fields.tehranValue);
	const tehranValueReceive = toNullableNumber(fields.tehranValueReceive);
	const tehranConversionRatio = toNullableNumber(fields.tehranConversionRatio);
	const countyEnabled = Boolean(fields.countyEnabled);
	const countyValue = toNullableNumber(fields.countyValue);
	const countyValueReceive = toNullableNumber(fields.countyValueReceive);
	const countyConversionRatio = toNullableNumber(fields.countyConversionRatio);
	const isCp = typeof values.companyType === "string" && values.companyType.toUpperCase() === "CP";

	if (!tehranEnabled && !countyEnabled) {
		throw new Error(i18next.t("performance.errors.trafficAtLeastOneLocation"));
	}

	const trafficPayload: Record<string, unknown> = {};

	if (tehranEnabled) {
		if (tehranValue == null || tehranValueReceive == null) {
			throw new Error(i18next.t("performance.errors.trafficTehranRequired"));
		}

		trafficPayload.tehran_value = tehranValue;
		trafficPayload.tehran_value_receive = tehranValueReceive;

		if (isCp) {
			trafficPayload.tehran_conversion_ratio = tehranConversionRatio;
		}
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

export async function submitPerformance(values: PerformanceFormValues): Promise<SubmitPerformanceResult> {
	const servicePath = resolvePerformanceServicePath(values.serviceCode, values.companyType);
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

	return {
		servicePath,
		record: await submitManualPerformance(values, servicePath),
	};
}
