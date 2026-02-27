import type { PerformanceServicePath } from "../../api/performances.api";
import type { PerformanceFormValues } from "../../shared/model/performance.form.types";
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

function withOperation(
	values: PerformanceFormValues,
	operationType: string,
	value: number | null | undefined,
	extra?: Record<string, unknown>,
): PerformanceOperation {
	return {
		payload: {
			...buildBasePayload(values),
			operation_type: operationType,
			value,
			...extra,
		},
	};
}

function buildManualOperations(values: PerformanceFormValues): PerformanceOperation[] {
	const code = (values.serviceCode ?? "").trim().toLowerCase();
	const fields = (values.serviceFields ?? {}) as Record<string, any>;

	if (code === "openapi") {
		if (values.contractModel === "legacy") {
			return [
				withOperation(values, "BILL_INQUIRY", fields.billInquiryValue),
				withOperation(values, "RECEIPT_REGISTER", fields.receiptRegisterValue),
			];
		}
		if (values.contractModel === "package") {
			return [
				withOperation(values, "BILL_INQUIRY", fields.billInquiryValue),
				withOperation(values, "TRAFFIC_REVENUE", fields.trafficRevenue),
				withOperation(values, "TRAFFIC_PACKAGE_COUNT", fields.trafficPackageCount),
				withOperation(values, "IRANCELL_FA", fields.irancellFa),
				withOperation(values, "IRANCELL_EN", fields.irancellEn),
				withOperation(values, "MCI_FA", fields.mciFa),
				withOperation(values, "MCI_EN", fields.mciEn),
				withOperation(values, "OTHER_FA", fields.otherFa),
				withOperation(values, "OTHER_EN", fields.otherEn),
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
					profit: fields.monthlyRevenue,
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

	if (code === "sms" || isSmsCommissionCode(code)) {
		const operations = [
			withOperation(values, "IRANCELL_FA", fields.irancellFa),
			withOperation(values, "IRANCELL_EN", fields.irancellEn),
			withOperation(values, "MCI_FA", fields.mciFa),
			withOperation(values, "MCI_EN", fields.mciEn),
			withOperation(values, "OTHER_FA", fields.otherFa),
			withOperation(values, "OTHER_EN", fields.otherEn),
		];

		if (isSmsCommissionCode(code)) {
			operations.forEach((operation) => {
				operation.payload.sales_agent = values.salesAgentId;
				operation.searchParams = {
					...(operation.searchParams ?? {}),
					sales_agent: values.salesAgentId,
				};
			});
		}

		return operations;
	}

	return [];
}

async function submitManualPerformance(values: PerformanceFormValues, servicePath: PerformanceServicePath) {
	if (!values.companyId || !values.year || !values.month) {
		throw new Error("اطلاعات پایه فرم کامل نیست");
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
		});
	}
}

async function submitTrafficFiles(values: PerformanceFormValues) {
	if (!values.companyId || !values.year || !values.month) {
		throw new Error("اطلاعات پایه فرم کامل نیست");
	}

	const monthlyPerformanceFile = getFirstFileFromUploadField((values.serviceFields as any)?.monthlyPerformanceFile);
	if (!monthlyPerformanceFile) {
		throw new Error("فایل عملکرد ماهانه الزامی است");
	}

	await uploadPerformanceFiles({
		service: "traffic",
		companyId: values.companyId,
		year: values.year,
		month: values.month,
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
	});
}

async function submitCommercialFiles(values: PerformanceFormValues) {
	if (!values.companyId || !values.year || !values.month) {
		throw new Error("اطلاعات پایه فرم کامل نیست");
	}

	const fields = (values.serviceFields ?? {}) as Record<string, unknown>;
	const servicesFile = getFirstFileFromUploadField(fields.servicesFile);
	const provinceCodeFile = getFirstFileFromUploadField(fields.provinceCodeFile);
	const monthlyPerformanceFile = getFirstFileFromUploadField(fields.monthlyPerformanceFile);

	if (!servicesFile || !provinceCodeFile || !monthlyPerformanceFile) {
		throw new Error("تمام فایل‌های سرویس تجاری باید انتخاب شوند");
	}

	await uploadPerformanceFiles({
		service: "commercial",
		companyId: values.companyId,
		year: values.year,
		month: values.month,
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
	});
}

export async function submitPerformance(values: PerformanceFormValues) {
	const servicePath = resolvePerformanceServicePath(values.serviceCode);
	if (!servicePath) {
		throw new Error("سرویس انتخاب نشده است");
	}

	if (servicePath === "traffic") {
		await submitTrafficFiles(values);
		return;
	}

	if (servicePath === "commercial") {
		await submitCommercialFiles(values);
		return;
	}

	await submitManualPerformance(values, servicePath);
}
