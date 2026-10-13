import type { ContractServicePath } from "#src/features/contract/api/contracts.api";
import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types";
import type { ContractFormActions, ContractSubmitIntent } from "#src/features/contract/shared/ui/form/ContractForm";
import type { UploadFile } from "antd";
import type { UseFormReturn } from "react-hook-form";
import { fetchCompaniesByService } from "#src/api/common/common.api";
import { createContractDocument } from "#src/features/contract/api/contract-documents.api";
import { contractTypeToApiPricing } from "#src/features/contract/api/pricing.mapper";
import { defaultContractFormValues } from "#src/features/contract/shared/ui/form/ContractForm";
import React, { useState } from "react";
import { useNavigate } from "react-router";
import { fetchCreateContract } from "../../api/contracts.api";
import { ContractForm } from "../../shared/ui/form/ContractForm";

async function uploadStagedDocuments(contractId: number, documents: unknown) {
	const stagedFiles = (Array.isArray(documents) ? documents : [])
		.map((doc: UploadFile) => doc?.originFileObj)
		.filter((file): file is NonNullable<UploadFile["originFileObj"]> => file instanceof File);

	for (const file of stagedFiles) {
		try {
			await createContractDocument(contractId, file);
		}
		catch {
			window.$message?.error(`آپلود فایل «${file.name}» ناموفق بود`);
		}
	}
}

const REAL_START_TRIGGER_YEAR = 1404;
const REAL_START_TRIGGER_MONTH = 4;
const BEHESHTI_DATACENTER_TAG = "DEFAULT_BEHESHTI";
const TELECOM_COLLOCATION_COMPANY_SEARCH = "TRAFFIC_COLLOCATION_COST_GLOBAL";

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

function toIdOrStringOrNull(value: unknown): number | string | null {
	if (value == null || value === "")
		return null;
	const n = Number(value);
	return Number.isInteger(n) ? n : String(value);
}

function mapCollocationMode(value: unknown) {
	const normalized = String(value ?? "").trim().toUpperCase();
	if (normalized === "COLLOCATION")
		return "COLO";
	if (normalized === "CP")
		return "CP";
	return null;
}

function mapRackType(value: unknown) {
	const normalized = String(value ?? "").trim().toUpperCase();
	if (normalized === "FULL_RACK" || normalized === "FULL")
		return "full";
	if (normalized === "HALF_RACK" || normalized === "HALF")
		return "half";
	if (normalized === "QUARTER_RACK" || normalized === "QUARTER")
		return "quarter";
	if (normalized === "UNIT")
		return "unit";
	return toStringOrNull(value);
}

function mapCollocationLocations(serviceFields: Record<string, any>) {
	const source = Array.isArray(serviceFields.datacenters) && serviceFields.datacenters.length > 0
		? serviceFields.datacenters
		: serviceFields.datacenter
			? [{
				datacenter: serviceFields.datacenter,
				bandwidthUnitRate: serviceFields.datacenterBandwidthUnitRate,
				ipRate: serviceFields.datacenterIpRate,
				portItems: serviceFields.datacenterPortItems,
				rackItems: serviceFields.datacenterRackItems,
				electricityAmpRate: serviceFields.datacenterElectricityAmpRate,
				electricityExemptionThreshold: serviceFields.datacenterElectricityExemptionThreshold,
			}]
			: [];

	const collocationMode = mapCollocationMode(serviceFields.collocationPartnerType);

	return source.flatMap((datacenter: any) => {
		const datacenterId = toIdOrStringOrNull(datacenter?.datacenter);
		if (datacenterId == null)
			return [];

		const base = {
			collocation_mode: collocationMode,
			calculation_type: "FLAT",
			datacenter: datacenterId,
		};
		const locations: Record<string, any>[] = [];

		const ipRate = toNumberOrNull(datacenter?.ipRate);
		if (ipRate != null) {
			locations.push({
				location: "GLOBAL_IP",
				...base,
				collocation_item: "ip",
				tiers: { rate_per_unit: ipRate },
			});
		}

		const portItems = (Array.isArray(datacenter?.portItems) ? datacenter.portItems : [])
			.map((item: any) => ({
				count: toNumberOrNull(item?.count),
				speed: toNumberOrNull(item?.speed),
				price: toStringOrNull(item?.unitPrice),
			}))
			.filter((item: any) => item.count != null || item.speed != null || item.price != null);
		if (portItems.length > 0) {
			locations.push({
				location: "GLOBAL_PORT",
				...base,
				collocation_item: "port",
				tiers: {},
				port_items: portItems,
			});
		}

		const bandwidthRate = toNumberOrNull(datacenter?.bandwidthUnitRate);
		if (bandwidthRate != null) {
			locations.push({
				location: "GLOBAL_BANDWIDTH",
				...base,
				collocation_item: "bandwidth",
				tiers: { rate_per_unit: bandwidthRate },
			});
		}

		const electricityAmpRate = toNumberOrNull(datacenter?.electricityAmpRate);
		const electricityExemptionThreshold = toNumberOrNull(datacenter?.electricityExemptionThreshold);
		if (electricityAmpRate != null || electricityExemptionThreshold != null) {
			locations.push({
				location: "GLOBAL_AMPERE",
				...base,
				collocation_item: "ampere",
				free_ampere_threshold: electricityExemptionThreshold,
				tiers: { rate_per_unit: electricityAmpRate },
			});
		}

		const rackItems = (Array.isArray(datacenter?.rackItems) ? datacenter.rackItems : [])
			.map((item: any) => ({
				rack_type: mapRackType(item?.rackType),
				count: toNumberOrNull(item?.count),
				price: toStringOrNull(item?.unitPrice),
			}))
			.filter((item: any) => item.rack_type != null || item.count != null || item.price != null);
		if (rackItems.length > 0) {
			const rackLocation: Record<string, any> = {
				location: "GLOBAL_RACK",
				...base,
				collocation_item: "rack",
				tiers: {},
				rack_items: rackItems,
			};
			const rackDiscountTiers = mapRackDiscountTiers(datacenter, serviceFields);
			if (rackDiscountTiers.length > 0) {
				rackLocation.calculation_type = "TIER_SINGLE";
				rackLocation.tiers = { tiers_persentage: rackDiscountTiers };
			}
			locations.push(rackLocation);
		}

		return locations;
	});
}

function mapRackDiscountTiers(datacenter: Record<string, any>, serviceFields: Record<string, any>) {
	if (serviceFields.collocationPartnerType !== "CP")
		return [];
	if (datacenter?.datacenterSystemTag !== BEHESHTI_DATACENTER_TAG)
		return [];

	return (Array.isArray(datacenter?.rackDiscountTiers) ? datacenter.rackDiscountTiers : [])
		.map((row: any) => ({
			min_inclusive: toStringOrNull(row?.from),
			max_exclusive: toStringOrNull(row?.to),
			persentage_per_unit: toStringOrNull(row?.discountPercent),
		}))
		.filter((row: any) => row.min_inclusive != null || row.max_exclusive != null || row.persentage_per_unit != null);
}

function mapCollocationRealStart(values: ContractFormValues, serviceFields: Record<string, any>) {
	const isEligible = (
		String(values.companyType ?? "").trim().toUpperCase() === "COLLOCATION"
		&& values.startYear === REAL_START_TRIGGER_YEAR
		&& values.startMonth === REAL_START_TRIGGER_MONTH
	);
	if (!isEligible)
		return null;

	const realStartYear = toNumberOrNull(serviceFields.realStartYear);
	const realStartMonth = toNumberOrNull(serviceFields.realStartMonth);
	if (realStartYear == null || realStartMonth == null)
		return null;

	return {
		real_start_jy: realStartYear,
		real_start_jm: realStartMonth,
	};
}

function mapTelecomCollocationLocations(serviceFields: Record<string, any>) {
	const rackCount = toStringOrNull(serviceFields.telecomRackCount);
	const unitsPerRack = toNumberOrNull(serviceFields.telecomUnitsPerRack);
	const monthlyRackRent = toStringOrNull(serviceFields.telecomMonthlyRackRent);

	if (rackCount == null && unitsPerRack == null && monthlyRackRent == null)
		return [];

	return [{
		location: "GLOBAL_COLLOCATION_COST",
		calculation_type: "FLAT",
		units_per_rack: unitsPerRack,
		rack_count: rackCount,
		tiers: {
			cost_per_month: monthlyRackRent,
		},
	}];
}

function mapOpenApiLegacyDetails(pricingValue: unknown) {
	const pricing = contractTypeToApiPricing((pricingValue ?? null) as any);

	return {
		openapi_model: "LEGACY",
		contract_model: "LEGACY",
		bill_inquiry: pricing,
		receipt_register: pricing,
	};
}

function mapOpenApiAddendumLegacyDetails(row: Record<string, any>) {
	const sharedLegacyPricing = row.contractPricing ?? null;
	return {
		openapi_model: "LEGACY",
		contract_model: "LEGACY",
		receipt_register: contractTypeToApiPricing(
			row.legacyPricing?.paymentRegistration ?? sharedLegacyPricing,
		),
		bill_inquiry: contractTypeToApiPricing(
			row.legacyPricing?.billInquiry ?? sharedLegacyPricing,
		),
	};
}

function mapOpenApiSeparatedDetails(serviceFields: Record<string, any>) {
	const pricing = serviceFields.separatedPricing ?? {};
	return {
		openapi_model: "SEPARATED",
		contract_model: "LEGACY_2",
		wallet_charge_discount_percent: toStringOrNull(pricing.walletChargeDiscountPercent),
		bill_inquiry_midterm: contractTypeToApiPricing(pricing.midPeriodBillInquiry ?? null),
		bill_inquiry_endterm: contractTypeToApiPricing(pricing.endPeriodBillInquiry ?? null),
		receipt_register_connected: {
			...contractTypeToApiPricing(pricing.connectedReceiptRegister ?? null),
			karashab_share_percent: toStringOrNull(pricing.connectedKarashabSharePercent),
			partner_share_percent: toStringOrNull(pricing.connectedPartnerSharePercent),
		},
		receipt_register_disconnected: {
			...contractTypeToApiPricing(pricing.disconnectedReceiptRegister ?? null),
			karashab_share_percent: toStringOrNull(pricing.disconnectedKarashabSharePercent),
			partner_share_percent: toStringOrNull(pricing.disconnectedPartnerSharePercent),
		},
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
				traffic_partner_share_percent: toStringOrNull(plan?.trafficPartnerSharePercent),
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
	contractModel: "package" | "separated" | "legacy" | null,
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
			mapped.contract_openapi_details = mapOpenApiAddendumLegacyDetails(row);
		}
		else if (contractModel === "separated") {
			mapped.contract_openapi_details = mainOpenApiDetails ?? mapOpenApiSeparatedDetails(serviceFields);
		}
		else if (contractModel === "package") {
			mapped.contract_openapi_details = mainOpenApiDetails ?? mapOpenApiPackageDetails(serviceFields);
		}
		mapped.children = mapOpenApiAddenda(row.children, contractModel, serviceFields, mainOpenApiDetails);

		return mapped;
	});
}

function mapCommercialAddenda(addenda: unknown): Array<Record<string, any>> {
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
			children: mapCommercialAddenda(row.children),
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

function normalizeTrafficLocation(location: unknown) {
	const normalized = String(location ?? "").trim().toUpperCase();
	if (normalized === "PROVINCE" || normalized === "COUNTY")
		return "COUNTY";
	if (normalized === "TEHRAN")
		return "TEHRAN";
	return null;
}

function mapTrafficLocationPayload(location: "TEHRAN" | "COUNTY", pricingValue: unknown, unit?: string | null, basedTire?: boolean, incomePercentage?: unknown, contractModel?: unknown) {
	const pricing = contractTypeToApiPricing((pricingValue ?? null) as any);
	if (!pricing)
		return null;
	const normalizedIncomePercentage = toNumberOrNull(incomePercentage);

	return {
		location,
		unit: unit ?? "GB/month",
		calculation_type: pricing.calculation_type,
		tiers: pricing.tiers ?? [],
		...(typeof basedTire === "boolean" ? { based_tire: !basedTire } : {}),
		...(normalizedIncomePercentage != null ? { income_percentage: normalizedIncomePercentage } : {}),
		...(contractModel != null ? { contract_model: contractModel } : {}),
	};
}

function mapShahkarAddenda(addenda: unknown): Array<Record<string, any>> {
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
			is_signed: row.isSigned ?? row.is_signed ?? false,
			...mapShahkarPricingPayload(row.contractPricing),
			children: mapShahkarAddenda(row.children),
		};
	});
}

function mapGenericAddenda(addenda: unknown): Array<Record<string, any>> {
	const list = Array.isArray(addenda) ? addenda : [];

	return list.map((item) => {
		const row = (item ?? {}) as Record<string, any>;
		const {
			startYear,
			startMonth,
			endYear,
			endMonth,
			contractNumber,
			description,
			contractPricing,
			isSigned,
			is_signed: _isSigned,
			children: _children,
			parentAddendumId: _parentAddendumId,
			parent_addendum_id: _parentAddendumIdSnake,
			displayAddendumNumber: _displayAddendumNumber,
			display_addendum_number: _displayAddendumNumberSnake,
			fieldArrayId: _fieldArrayId,
			...rest
		} = row;
		const pricing = contractTypeToApiPricing((contractPricing ?? null) as any);

		return {
			...rest,
			start_jy: toNumberOrNull(startYear),
			start_jm: toNumberOrNull(startMonth),
			end_jy: toNumberOrNull(endYear),
			end_jm: toNumberOrNull(endMonth),
			contract_number: contractNumber ?? "",
			note: description ?? "",
			is_signed: isSigned ?? _isSigned ?? false,
			...(pricing ?? {}),
			children: mapGenericAddenda(row.children),
		};
	});
}

function mapTrafficAddenda(
	addenda: unknown,
	companyType: unknown,
	mainLocations: { tehran: boolean, province: boolean },
): Array<Record<string, any>> {
	const list = Array.isArray(addenda) ? addenda : [];
	const normalizedCompanyType = String(companyType ?? "").trim().toUpperCase();
	const hasTrafficUnit = ["CP", "PREMIUM", "IXP", "TCI"].includes(normalizedCompanyType);
	const isPremium = normalizedCompanyType === "PREMIUM";
	const isIxp = normalizedCompanyType === "IXP";

	return list.map((item) => {
		const row = (item ?? {}) as Record<string, any>;
		if (normalizedCompanyType === "COLLOCATION") {
			const location = normalizeTrafficLocation(row.location);
			const pricing = location ? mapTrafficLocationPayload(location, row.contractPricing) : null;
			return {
				start_jy: toNumberOrNull(row.startYear),
				start_jm: toNumberOrNull(row.startMonth),
				end_jy: toNumberOrNull(row.endYear),
				end_jm: toNumberOrNull(row.endMonth),
				contract_number: row.contractNumber ?? "",
				note: row.description ?? "",
				...(pricing ?? {}),
				children: mapTrafficAddenda(row.children, companyType, mainLocations),
			};
		}
		const locations = [
			mainLocations.tehran
				? mapTrafficLocationPayload("TEHRAN", row.tehranPricing, hasTrafficUnit ? row.tehranUnit : null, isIxp ? row.tehranBasedTire ?? false : undefined, isPremium ? row.tehranRevenuePercent : null, isIxp ? row.tehranContractModel ?? "LEGACY" : undefined)
				: null,
			mainLocations.province
				? mapTrafficLocationPayload("COUNTY", row.provincePricing, hasTrafficUnit ? row.provinceUnit : null, isIxp ? row.provinceBasedTire ?? false : undefined, isPremium ? row.provinceRevenuePercent : null, isIxp ? row.provinceContractModel ?? "LEGACY" : undefined)
				: null,
		].filter(Boolean);

		return {
			start_jy: toNumberOrNull(row.startYear),
			start_jm: toNumberOrNull(row.startMonth),
			end_jy: toNumberOrNull(row.endYear),
			end_jm: toNumberOrNull(row.endMonth),
			contract_number: row.contractNumber ?? "",
			note: row.description ?? "",
			locations,
			children: mapTrafficAddenda(row.children, companyType, mainLocations),
		};
	});
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

function mapSmsAddenda(addenda: unknown, includeProfit: boolean): Array<Record<string, any>> {
	const list = Array.isArray(addenda) ? addenda : [];

	return list.flatMap((item) => {
		const row = (item ?? {}) as Record<string, any>;
		const children = mapSmsAddenda(row.children, includeProfit);
		const base = {
			start_jy: toNumberOrNull(row.startYear),
			start_jm: toNumberOrNull(row.startMonth),
			end_jy: toNumberOrNull(row.endYear),
			end_jm: toNumberOrNull(row.endMonth),
			note: row.description ?? "",
			contract_number: row.contractNumber ?? "",
			children,
		};

		const operatorEntries = mapSmsOperatorRevenuePayload(row.operatorRevenue).map(entry => ({
			...base,
			component: "OPERATOR",
			...entry,
		}));

		const governmentPricing = includeProfit ? row.governmentRevenue : row.governmentRate;
		const result: Array<Record<string, any>> = [
			...operatorEntries,
			{
				...base,
				component: "GOVERNMENT",
				...mapSmsPricingPayload(governmentPricing),
			},
		];

		if (includeProfit) {
			result.push({
				...base,
				component: "PROFIT",
				...mapSmsPricingPayload(row.profit?.pricing),
				min_profit_amount: toStringOrNull(row.profit?.minProfit),
			});
		}

		return result;
	});
}

function mapSmsCommissionAddenda(addenda: unknown): Array<Record<string, any>> {
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
			children: mapSmsCommissionAddenda(row.children),
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
	if (code === "sales_agency" || code === "sales-agency") {
		return String(values.companyType ?? "").trim().toUpperCase() === "SALES_REP_MANAGEMENT"
			? "sales-agency/rep-management"
			: "sales-agency/outbound";
	}
	if (code === "sms-commission" || code === "sms_commission")
		return "sms-commission";
	if (code === "sms") {
		return values.counterpartyType === "partners" ? "sms/client" : "sms/vendor";
	}
	return "openapi";
}

async function resolveTelecomCollocationCompanyId(values: ContractFormValues) {
	if (
		values.serviceCode !== "traffic"
		|| String(values.companyType ?? "").trim().toUpperCase() !== "COLLOCATION"
		|| values.counterpartyType !== "gov_ops"
	) {
		return values.companyId ?? null;
	}

	if (values.companyId != null) {
		return values.companyId;
	}

	if (values.serviceId == null) {
		return null;
	}

	const response = await fetchCompaniesByService(values.serviceId, {
		companyType: "COLLOCATION",
		search: TELECOM_COLLOCATION_COMPANY_SEARCH,
	});
	const resolvedCompanyId = response.results?.[0]?.id ?? null;

	if (resolvedCompanyId == null) {
		throw new Error("شناسه شرکت قرارداد شرکت مخابرات ایران یافت نشد.");
	}

	return resolvedCompanyId;
}

async function formValuesToApiPayload(values: ContractFormValues) {
	const serviceCode = typeof values.serviceCode === "string" ? values.serviceCode.trim().toLowerCase() : "";
	const serviceFields = (values.serviceFields ?? {}) as Record<string, any>;
	const contractNumber = values.contractNumber;
	const addenda = Array.isArray(serviceFields.addenda) ? serviceFields.addenda : [];
	const resolvedCompanyId = await resolveTelecomCollocationCompanyId({
		...values,
		serviceCode,
	});

	const payload: Record<string, any> = {
		service: values.serviceId ?? null,
		company: resolvedCompanyId,
		start_jy: values.startYear ?? null,
		start_jm: values.startMonth ?? null,
		end_jy: values.endYear ?? null,
		end_jm: values.endMonth ?? null,
		contract_number: contractNumber ?? "",
		note: values.description ?? "",
		addenda,
	};

	if (values.companyType != null)
		payload.company_type = values.companyType;
	if (values.counterpartyType != null && serviceCode === "sms")
		payload.sms_party = values.counterpartyType;

	if (serviceCode === "sms" && values.counterpartyType === "partners") {
		payload.operator_revenue = mapSmsOperatorRevenuePayload(serviceFields.operatorRevenue);
		payload.government_revenue = mapSmsPricingPayload(serviceFields.governmentRevenue);
		payload.profit = {
			...mapSmsPricingPayload(serviceFields.profit?.pricing),
			min_profit_amount: toStringOrNull(serviceFields.profit?.minProfit),
		};
		payload.addenda = mapSmsAddenda(addenda, true);
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
		const hasNewCustomerRate = serviceFields.hasNewCustomerRate === true;
		const newCustomerPricing = hasNewCustomerRate
			? mapShahkarPricingPayload(serviceFields.newCustomerPricing)
			: null;
		payload.is_signed = serviceFields.isSigned ?? false;
		payload.calculation_type = shahkarPricing.calculation_type;
		payload.tiers = shahkarPricing.tiers;
		payload.has_new_customer_rate = hasNewCustomerRate;
		if (newCustomerPricing) {
			payload.new_customer_calculation_type = newCustomerPricing.calculation_type;
			payload.new_customer_tiers = newCustomerPricing.tiers;
		}
		payload.addenda = mapShahkarAddenda(addenda);
		return payload;
	}

	if (serviceCode === "sms") {
		payload.operator_revenue = mapSmsOperatorRevenuePayload(serviceFields.operatorRevenue);
		payload.government_revenue = mapSmsPricingPayload(serviceFields.governmentRate);
		payload.addenda = mapSmsAddenda(addenda, false);
		payload.is_official = serviceFields.isOfficial ?? true;
		return payload;
	}

	if (serviceCode === "commercial") {
		payload.contract_openapi_details = mapOpenApiLegacyDetails(serviceFields.contractPricing);
		payload.addenda = mapCommercialAddenda(addenda);
		return payload;
	}

	if (serviceCode === "traffic") {
		const isOfficial = serviceFields.isOfficial ?? true;
		const normalizedCompanyType = String(values.companyType ?? "").trim().toUpperCase();
		const isUnitCompanyType = ["CP", "PREMIUM", "IXP", "TCI"].includes(normalizedCompanyType);
		const isPremiumCompanyType = normalizedCompanyType === "PREMIUM";
		const isIxp = normalizedCompanyType === "IXP";
		const locations = [
			mapTrafficLocationPayload("TEHRAN", serviceFields.tehranPricing, isUnitCompanyType ? serviceFields.tehranUnit : null, isIxp ? serviceFields.tehranBasedTire ?? false : undefined, isPremiumCompanyType ? serviceFields.tehranRevenuePercent : null, isIxp ? serviceFields.tehranContractModel ?? "LEGACY" : undefined),
			mapTrafficLocationPayload("COUNTY", serviceFields.provincePricing, isUnitCompanyType ? serviceFields.provinceUnit : null, isIxp ? serviceFields.provinceBasedTire ?? false : undefined, isPremiumCompanyType ? serviceFields.provinceRevenuePercent : null, isIxp ? serviceFields.provinceContractModel ?? "LEGACY" : undefined),
		].filter(Boolean);

		payload.is_signed = isOfficial;
		payload.is_official = isOfficial;
		payload.locations = locations;
		if (String(values.companyType ?? "").trim().toUpperCase() === "COLLOCATION") {
			payload.locations = values.counterpartyType === "gov_ops"
				? mapTelecomCollocationLocations(serviceFields)
				: mapCollocationLocations(serviceFields);
			const realStart = mapCollocationRealStart(values, serviceFields);
			if (realStart)
				payload.real_start = realStart;
		}
		payload.addenda = mapTrafficAddenda(addenda, values.companyType, {
			tehran: serviceFields.tehranPricing != null,
			province: serviceFields.provincePricing != null,
		});
		return payload;
	}

	if (serviceCode === "sales_agency" || serviceCode === "sales-agency") {
		const companyType = String(values.companyType ?? "").trim().toUpperCase();
		if (companyType === "OUTBOUND") {
			payload.revenue_percent = toStringOrNull(serviceFields.incomePercentage);
			payload.cost_percent = toStringOrNull(serviceFields.expensePercentage);
		}
		else if (companyType === "SALES_REP_MANAGEMENT") {
			payload.cost_title_names = (Array.isArray(serviceFields.costTitles) ? serviceFields.costTitles : [])
				.map((item: any) => String(item ?? "").trim())
				.filter(Boolean);
		}
		payload.addenda = mapGenericAddenda(addenda);
		return payload;
	}

	if (serviceCode === "openapi") {
		const contractModel = serviceFields.contractModel === "package"
			? "package"
			: serviceFields.contractModel === "separated" ? "separated" : "legacy";
		const apiContractModel = contractModel === "package" ? "PACKAGE" : contractModel === "separated" ? "SEPARATED" : "LEGACY";
		const openApiDetails = contractModel === "package"
			? mapOpenApiPackageDetails(serviceFields)
			: contractModel === "separated"
				? mapOpenApiSeparatedDetails(serviceFields)
				: {
					openapi_model: apiContractModel,
					contract_model: apiContractModel,
					receipt_register: contractTypeToApiPricing(serviceFields.legacyPricing?.paymentRegistration ?? null),
					bill_inquiry: contractTypeToApiPricing(serviceFields.legacyPricing?.billInquiry ?? null),
				};

		payload.openapi_model = apiContractModel;

		if (openApiDetails)
			payload.contract_openapi_details = openApiDetails;

		payload.addenda = mapOpenApiAddenda(addenda, contractModel as any, serviceFields, openApiDetails);
		return payload;
	}

	payload.is_signed = serviceFields.isSigned ?? serviceFields.is_signed ?? false;
	const {
		addenda: _addenda,
		isSigned: _isSigned,
		is_signed: _isSignedSnake,
		...restServiceFields
	} = serviceFields;
	return {
		...payload,
		addenda: mapGenericAddenda(addenda),
		...restServiceFields,
	};
}

function applySubmitIntent(
	intent: ContractSubmitIntent,
	form: UseFormReturn<ContractFormValues>,
	createdContract: { id?: number | null },
	service: ContractServicePath,
	navigate: ReturnType<typeof useNavigate>,
	actions: ContractFormActions,
) {
	window.$message?.success("قرارداد با موفقیت ثبت شد");

	switch (intent) {
		case "submit":
			form.reset(defaultContractFormValues);
			break;

		case "submit_and_create_another": {
			const { companyId: _companyId, ...retainedValues } = form.getValues();
			actions.resetForCreateAnother({
				...retainedValues,
				companyId: null,
			});
			break;
		}

		case "submit_and_edit": {
			const serviceId = form.getValues("serviceId");
			const companyType = form.getValues("companyType") ?? "";
			form.reset(defaultContractFormValues);
			if (createdContract.id != null && serviceId != null) {
				navigate(`/contracts/${createdContract.id}/edit?service=${encodeURIComponent(service)}&serviceId=${serviceId}&companyType=${encodeURIComponent(companyType)}`);
			}
			break;
		}
	}
}

function CreateContract() {
	const [submitting, setSubmitting] = useState(false);
	const navigate = useNavigate();

	return (
		<>
			<ContractForm
				submitText="ثبت قرارداد"
				showExtendedActions
				submitting={submitting}
				onSubmit={async (values, intent, form, actions) => {
					setSubmitting(true);
					try {
						const service = resolveCreateServicePath(values);
						const payload = await formValuesToApiPayload(values);
						const created = await fetchCreateContract(service, payload);
						if (created?.id != null)
							await uploadStagedDocuments(created.id, values.documents);
						applySubmitIntent(intent, form, created, service, navigate, actions);
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
