import type { ContractServicePath } from "#src/features/contract/api/contracts.api";
import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types";
import type { ContractSubmitIntent } from "#src/features/contract/shared/ui/form/ContractForm";
import { contractTypeToApiPricing } from "#src/features/contract/api/pricing.mapper";
import { defaultContractFormValues } from "#src/features/contract/shared/ui/form/ContractForm";
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

function mapOpenApiLegacyDetails(pricingValue: unknown) {
	const pricing = contractTypeToApiPricing((pricingValue ?? null) as any);

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
				traffic_profit_percent: toStringOrNull(plan?.trafficProfitPercent),
				traffic_partner_share_percent: toStringOrNull(plan?.trafficPartnerSharePercent ?? plan?.trafficCommissionPercent),
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

		const mapped: Record<string, any> = {
			start_jy: toNumberOrNull(row.startYear),
			start_jm: toNumberOrNull(row.startMonth),
			end_jy: toNumberOrNull(row.endYear),
			end_jm: toNumberOrNull(row.endMonth),
			contract_number: row.contractNumber ?? "",
			note: row.description ?? "",
		};

		if (contractModel === "legacy") {
			mapped.contract_openapi_details = mapOpenApiLegacyDetails(row.contractPricing);
		}
		else if (contractModel === "package") {
			mapped.contract_openapi_details = mainOpenApiDetails ?? mapOpenApiPackageDetails(serviceFields);
		}

		return mapped;
	});
}

function mapCommercialAddenda(addenda: unknown) {
	const list = Array.isArray(addenda) ? addenda : [];

	return list.map((item) => {
		const row = (item ?? {}) as Record<string, any>;

		return {
			start_jy: toNumberOrNull(row.startYear),
			start_jm: toNumberOrNull(row.startMonth),
			end_jy: toNumberOrNull(row.endYear),
			end_jm: toNumberOrNull(row.endMonth),
			contract_number: row.contractNumber ?? "",
			note: row.description ?? "",
			contract_openapi_details: mapOpenApiLegacyDetails(row.contractPricing),
		};
	});
}

function mapShahkarPricingPayload(pricingValue: unknown) {
	const pricing = contractTypeToApiPricing((pricingValue ?? null) as any);

	return {
		calculation_type: pricing?.calculation_type ?? null,
		tiers: pricing?.tiers ?? [],
	};
}

function mapSmsPricingPayload(pricingValue: unknown) {
	const pricing = contractTypeToApiPricing((pricingValue ?? null) as any);
	return {
		calculation_type: pricing?.calculation_type ?? null,
		tiers: pricing?.tiers ?? [],
	};
}

function mapSmsOperatorRevenuePayload(operatorRevenueValue: unknown) {
	const operatorRevenue = (operatorRevenueValue ?? {}) as Record<string, unknown>;
	const mciEnSource = operatorRevenue.hamrahAvalEn ?? operatorRevenue.hamrahAvalFa;

	return [
		{
			operator: "IRANCELL",
			language: "FA",
			...mapSmsPricingPayload(operatorRevenue.irancellFa),
		},
		{
			operator: "IRANCELL",
			language: "EN",
			...mapSmsPricingPayload(operatorRevenue.irancellEn),
		},
		{
			operator: "MCI",
			language: "FA",
			...mapSmsPricingPayload(operatorRevenue.hamrahAvalFa),
		},
		{
			operator: "MCI",
			language: "EN",
			...mapSmsPricingPayload(mciEnSource),
		},
		{
			operator: "OTHER",
			language: "FA",
			...mapSmsPricingPayload(operatorRevenue.otherFa),
		},
		{
			operator: "OTHER",
			language: "EN",
			...mapSmsPricingPayload(operatorRevenue.otherEn),
		},
	];
}

function mapSmsPartnersAddenda(addenda: unknown) {
	const list = Array.isArray(addenda) ? addenda : [];

	return list.flatMap((item) => {
		const row = (item ?? {}) as Record<string, any>;
		const base = {
			start_jy: toNumberOrNull(row.startYear),
			start_jm: toNumberOrNull(row.startMonth),
			end_jy: toNumberOrNull(row.endYear),
			end_jm: toNumberOrNull(row.endMonth),
			note: row.description ?? "",
			contract_number: row.contractNumber ?? "",
		};

		const operatorEntries = mapSmsOperatorRevenuePayload(row.operatorRevenue).map(entry => ({
			...base,
			component: "OPERATOR",
			...entry,
		}));

		return [
			...operatorEntries,
			{
				...base,
				component: "GOVERNMENT",
				...mapSmsPricingPayload(row.governmentRevenue),
			},
			{
				...base,
				component: "PROFIT",
				...mapSmsPricingPayload(row.profit?.pricing),
				min_profit_amount: toStringOrNull(row.profit?.minProfit),
			},
		];
	});
}

function mapSmsCommissionAddenda(addenda: unknown) {
	const list = Array.isArray(addenda) ? addenda : [];

	return list.map((item) => {
		const row = (item ?? {}) as Record<string, any>;

		return {
			start_jy: toNumberOrNull(row.startYear),
			start_jm: toNumberOrNull(row.startMonth),
			end_jy: toNumberOrNull(row.endYear),
			end_jm: toNumberOrNull(row.endMonth),
			note: row.description ?? "",
			contract_number: row.contractNumber ?? "",
			initial_receive_fee: toStringOrNull(row.initialCommission),
			final_receive_fee: toStringOrNull(row.finalCommission),
			karashab_percent: toStringOrNull(row.expertPercent),
			mokhaberat_percent: toStringOrNull(row.telecomPercent),
			first_side_percent: toStringOrNull(row.firstPartySharePercent),
			area_percent: toStringOrNull(row.regionSharePercent),
			sales_agent_percent: toStringOrNull(row.salesAgentSharePercent),
		};
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
		return values.counterpartyType === "partners" ? "sms/client" : "sms/vendor";
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

	if (serviceCode === "sms" && values.counterpartyType === "partners") {
		payload.operator_revenue = mapSmsOperatorRevenuePayload(serviceFields.operatorRevenue);
		payload.government_revenue = mapSmsPricingPayload(serviceFields.governmentRevenue);
		payload.profit = {
			...mapSmsPricingPayload(serviceFields.profit?.pricing),
			min_profit_amount: toStringOrNull(serviceFields.profit?.minProfit),
		};
		payload.addenda = mapSmsPartnersAddenda(addenda);
		payload.is_official = serviceFields.isOfficial ?? true;
		return payload;
	}

	if (serviceCode === "sms-commission" || serviceCode === "sms_commission") {
		payload.sales_agent = toNumberOrNull(serviceFields.agent);
		payload.initial_receive_fee = toStringOrNull(serviceFields.initialCommission);
		payload.final_receive_fee = toStringOrNull(serviceFields.finalCommission);
		payload.karashab_percent = toStringOrNull(serviceFields.expertPercent);
		payload.mokhaberat_percent = toStringOrNull(serviceFields.telecomPercent);
		payload.first_side_percent = toStringOrNull(serviceFields.firstPartySharePercent);
		payload.area_percent = toStringOrNull(serviceFields.regionSharePercent);
		payload.sales_agent_percent = toStringOrNull(serviceFields.salesAgentSharePercent);
		payload.addenda = mapSmsCommissionAddenda(addenda);
		return payload;
	}

	if (serviceCode === "shahkar") {
		const shahkarPricing = mapShahkarPricingPayload(serviceFields.contractPricing);
		payload.calculation_type = shahkarPricing.calculation_type;
		payload.tiers = shahkarPricing.tiers;
		return payload;
	}

	if (serviceCode === "commercial") {
		payload.contract_openapi_details = mapOpenApiLegacyDetails(serviceFields.contractPricing);
		payload.addenda = mapCommercialAddenda(addenda);
		return payload;
	}

	if (serviceCode === "openapi") {
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

		payload.addenda = mapOpenApiAddenda(addenda, contractModel as any, serviceFields, openApiDetails);
		return payload;
	}

	const { addenda: _addenda, ...restServiceFields } = serviceFields;
	return {
		...payload,
		...restServiceFields,
	};
}

function applySubmitIntent(intent: ContractSubmitIntent, form: any) {
	window.$message?.success("قرارداد با موفقیت ثبت شد");

	if (intent === "submit_and_edit")
		return;

	form.reset(defaultContractFormValues);
}

function CreateContract() {
	const [submitting, setSubmitting] = useState(false);

	return (
		<>
			<ContractForm
				submitText="ثبت قرارداد"
				showExtendedActions
				submitting={submitting}
				onSubmit={async (values, intent, form) => {
					setSubmitting(true);
					try {
						const service = resolveCreateServicePath(values);
						await fetchCreateContract(service, formValuesToApiPayload(values));
						applySubmitIntent(intent, form);
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
