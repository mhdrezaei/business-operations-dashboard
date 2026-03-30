import type { ContractServicePath } from "#src/features/contract/api/contracts.api";
import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types";
import { contractTypeToApiPricing } from "#src/features/contract/api/pricing.mapper";
import React, { useState } from "react";
import { fetchCreateContract } from "../../api/contracts.api";
import { ContractForm } from "../../shared/ui/form/ContractForm";

function toNumberOrNull(value: unknown): number | null {
	if (value == null || value === "")
		return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

function toStringOrNull(value: unknown): string | null {
	if (value == null || value === "")
		return null;
	return String(value);
}

function normalizeOperationType(value: unknown): "BILL_INQUIRY" | "RECEIPT_REGISTER" | null {
	if (typeof value !== "string")
		return null;
	const normalized = value.trim().toUpperCase();
	if (normalized === "BILL_INQUIRY" || normalized === "RECEIPT_REGISTER")
		return normalized;
	return null;
}

function mapOpenApiLegacyDetails(pricingValue: unknown, operationTypeValue?: unknown) {
	const pricing = contractTypeToApiPricing((pricingValue ?? null) as any);
	const operationType = normalizeOperationType(operationTypeValue);

	if (operationType === "BILL_INQUIRY") {
		return {
			contract_model: "LEGACY",
			bill_inquiry: pricing,
			receipt_register: null,
		};
	}

	if (operationType === "RECEIPT_REGISTER") {
		return {
			contract_model: "LEGACY",
			bill_inquiry: null,
			receipt_register: pricing,
		};
	}

	return {
		contract_model: "LEGACY",
		bill_inquiry: pricing,
		receipt_register: pricing,
	};
}

function mapOpenApiPackageDetails(serviceFields: Record<string, any>) {
	const plans = Array.isArray(serviceFields.plans) ? serviceFields.plans : [];
	return {
		contract_model: "PACKAGE",
		package_model: {
			mode: serviceFields.packageMode ?? "OR",
			tiers: plans.map((plan: any) => ({
				sms_min_inclusive: toNumberOrNull(plan?.smsMin),
				sms_max_exclusive: toNumberOrNull(plan?.smsMax),
				bill_min_inclusive: toNumberOrNull(plan?.billMin),
				bill_max_exclusive: toNumberOrNull(plan?.billMax),
				partner_share_percent: toStringOrNull(plan?.billPartnerShare),
				karashab_share_percent: toStringOrNull(plan?.billKarashabShare),
				traffic_partner_share_percent: toStringOrNull(plan?.trafficCommissionPercent),
				bill_inquiry_rate: {
					calculation_type: "FLAT",
					tiers: [{ min_inclusive: null, max_exclusive: null, rate_per_unit: toStringOrNull(plan?.billFixedPrice) }],
				},
				sms_sale_rate: {
					calculation_type: "FLAT",
					tiers: [{ min_inclusive: null, max_exclusive: null, rate_per_unit: toStringOrNull(plan?.smsFixedPrice) }],
				},
			})),
		},
	};
}

function mapOpenApiAddenda(
	addenda: unknown,
	contractModel: "package" | "legacy" | null,
	serviceFields: Record<string, any>,
	mainOpenApiDetails: Record<string, any> | null,
) {
	const list = Array.isArray(addenda) ? addenda : [];

	return list.map((item) => {
		const row = (item ?? {}) as Record<string, any>;
		const operationType = normalizeOperationType(row.operationType);

		const mapped: Record<string, any> = {
			start_jy: toNumberOrNull(row.startYear),
			start_jm: toNumberOrNull(row.startMonth),
			end_jy: toNumberOrNull(row.endYear),
			end_jm: toNumberOrNull(row.endMonth),
			contract_number: row.contractNumber ?? "",
			note: row.description ?? "",
		};

		if (contractModel === "legacy") {
			mapped.contract_openapi_details = mapOpenApiLegacyDetails(row.contractPricing, operationType);
			if (operationType)
				mapped.operation_type = operationType;
		}
		else if (contractModel === "package") {
			mapped.contract_openapi_details = mainOpenApiDetails ?? mapOpenApiPackageDetails(serviceFields);
		}

		return mapped;
	});
}

function resolveCreateServicePath(values: ContractFormValues): ContractServicePath {
	const code = typeof values.serviceCode === "string" ? values.serviceCode.trim().toLowerCase() : "";

	if (code === "psp")
		return "psp";
	if (code === "traffic")
		return "traffic";
	if (code === "shahkar")
		return "shahkar";
	if (code === "commercial")
		return "commercial";
	if (code === "sms-commission" || code === "sms_commission")
		return "sms-commission";
	if (code === "sms") {
		return values.counterpartyType === "gov_ops" ? "sms/client" : "sms/vendor";
	}
	return "openapi";
}

function formValuesToApiPayload(values: ContractFormValues) {
	const serviceCode = typeof values.serviceCode === "string" ? values.serviceCode.trim().toLowerCase() : "";
	const serviceFields = (values.serviceFields ?? {}) as Record<string, any>;
	const contractNumber = values.contractNumber;
	const addenda = Array.isArray(serviceFields.addenda) ? serviceFields.addenda : [];

	const payload: Record<string, any> = {
		service: values.serviceId ?? null,
		company: values.companyId ?? null,
		start_jy: values.startYear ?? null,
		start_jm: values.startMonth ?? null,
		end_jy: values.endYear ?? null,
		end_jm: values.endMonth ?? null,
		contract_number: contractNumber ?? "",
		note: values.description ?? "",
		addenda,
	};

	if (values.trafficCompanyType != null)
		payload.company_type = values.trafficCompanyType;
	if (values.counterpartyType != null)
		payload.sms_party = values.counterpartyType;

	if (serviceCode === "openapi" || serviceCode === "commercial") {
		const contractModel = typeof serviceFields.contractModel === "string"
			? serviceFields.contractModel.trim().toLowerCase()
			: null;

		let openApiDetails: Record<string, any> | null = null;

		if (contractModel === "package") {
			openApiDetails = mapOpenApiPackageDetails(serviceFields);
		}
		else if (contractModel === "legacy") {
			openApiDetails = {
				contract_model: "LEGACY",
				receipt_register: contractTypeToApiPricing(serviceFields.legacyPricing?.paymentRegistration ?? null),
				bill_inquiry: contractTypeToApiPricing(serviceFields.legacyPricing?.billInquiry ?? null),
			};
		}

		if (openApiDetails)
			payload.contract_openapi_details = openApiDetails;

		if (serviceCode === "openapi" && contractModel) {
			payload.openapi_model = contractModel === "package" ? "PACKAGE" : "LEGACY";
		}

		payload.addenda = mapOpenApiAddenda(addenda, contractModel as any, serviceFields, openApiDetails);
		return payload;
	}

	const { addenda: _addenda, ...restServiceFields } = serviceFields;
	return {
		...payload,
		...restServiceFields,
	};
}

function CreateContract() {
	const [submitting, setSubmitting] = useState(false);

	return (
		<>
			<ContractForm
				submitText="ثبت قرارداد"
				submitting={submitting}
				onSubmit={async (values) => {
					setSubmitting(true);
					try {
						const service = resolveCreateServicePath(values);
						await fetchCreateContract(service, formValuesToApiPayload(values));
						window.$message?.success("قرارداد با موفقیت ثبت شد");
					}
					finally {
						setSubmitting(false);
					}
				}}
			/>
		</>
	);
}

export default CreateContract;
