import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types";
import type { ContractFormSelectionContext } from "#src/features/contract/shared/ui/form/ContractForm";
import type { UploadFile } from "antd";
import type { ContractServicePath } from "../../../api/contracts.api";
import { fetchCompaniesByService } from "#src/api/common/common.api";
import { listContractDocuments } from "#src/features/contract/api/contract-documents.api";
import { apiPricingToContractType, contractTypeToApiPricing } from "#src/features/contract/api/pricing.mapper";
import { ContractReadOnlyDetails } from "#src/features/contract/preview/ui/ContractReadOnlyDetails";
import { ContractForm } from "#src/features/contract/shared/ui/form/ContractForm";
import { pickCompanyTypeToken } from "#src/features/contract/shared/utils";
import { Alert, Empty, Spin } from "antd";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { fetchContractDetail, fetchUpdateContract } from "../../../api/contracts.api";
import { CompanyContractsPanel } from "./CompanyContractsPanel";
import { ContractApprovalHistoryPanel } from "./ContractApprovalHistoryPanel";
import { ContractDocumentsPanel } from "./ContractDocumentsPanel";

function contractDocumentToUploadFile(doc: { id: number, original_filename: string, size: number, mime_type: string }): UploadFile {
	return {
		uid: String(doc.id),
		documentId: doc.id,
		name: doc.original_filename,
		size: doc.size,
		type: doc.mime_type,
		status: "done",
	} as UploadFile;
}

const REAL_START_TRIGGER_YEAR = 1404;
const REAL_START_TRIGGER_MONTH = 4;
const BEHESHTI_DATACENTER_TAG = "DEFAULT_BEHESHTI";
const TELECOM_COLLOCATION_COMPANY_SEARCH = "TRAFFIC_COLLOCATION_COST_GLOBAL";

interface Props {
	contractId: number
	service: ContractServicePath
	onUpdated?: () => void
	onSaved?: () => void
	onContractSelect?: (contractId: number, serviceId: number, companyType: string | null, service: ContractServicePath) => void
	readOnly?: boolean
}

function servicePathToServiceCode(service: ContractServicePath): string {
	if (service === "sales-agency/outbound" || service === "sales-agency/rep-management")
		return "sales_agency";
	const raw = service.startsWith("sms/") ? "sms" : service;
	return raw.trim().toLowerCase();
}

function normalizeSmsCounterpartyType(value: unknown): "partners" | "gov_ops" | null {
	const normalized = String(value ?? "").trim().toLowerCase();
	if (normalized === "partners" || normalized === "client")
		return "partners";
	if (normalized === "gov_ops" || normalized === "vendor")
		return "gov_ops";
	return null;
}

function toNumberOrNull(value: unknown): number | null {
	if (value == null || value === "")
		return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

function toNumberOrStringNumber(value: unknown): number | null {
	return toNumberOrNull(value);
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
			...mapAddendumIdentity(row),
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
			...mapAddendumIdentity(row),
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

function mapSmsCommissionAddenda(addenda: unknown): Array<Record<string, any>> {
	const list = Array.isArray(addenda) ? addenda : [];

	return list.map((item) => {
		const row = (item ?? {}) as Record<string, any>;

		return {
			...mapAddendumIdentity(row),
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

function mapShahkarAddenda(addenda: unknown): Array<Record<string, any>> {
	const list = Array.isArray(addenda) ? addenda : [];

	return list.map((item) => {
		const row = (item ?? {}) as Record<string, any>;
		const pricing = contractTypeToApiPricing((row.contractPricing ?? null) as any);

		return {
			...mapAddendumIdentity(row),
			start_jy: toNumberOrNull(row.startYear),
			start_jm: toNumberOrNull(row.startMonth),
			end_jy: toNumberOrNull(row.endYear),
			end_jm: toNumberOrNull(row.endMonth),
			contract_number: row.contractNumber ?? "",
			note: row.description ?? "",
			is_signed: row.isSigned ?? row.is_signed ?? false,
			calculation_type: pricing?.calculation_type ?? null,
			tiers: pricing?.tiers ?? [],
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
			...mapAddendumIdentity(row),
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

function normalizeAddendumIdentity(row: Record<string, any>) {
	return {
		id: toNumberOrNull(row.id) ?? undefined,
		parentAddendumId: toNumberOrNull(row.parent_addendum_id ?? row.parentAddendumId),
		displayAddendumNumber: row.display_addendum_number ?? row.displayAddendumNumber ?? undefined,
	};
}

function mapAddendumIdentity(row: Record<string, any>) {
	const id = toNumberOrNull(row.id);

	return {
		...(id != null ? { id } : {}),
	};
}

function normalizeAddendumBase(row: Record<string, any>) {
	return {
		...normalizeAddendumIdentity(row),
		startYear: toNumberOrNull(row.start_jy ?? row.startYear),
		startMonth: toNumberOrNull(row.start_jm ?? row.startMonth),
		endYear: toNumberOrNull(row.end_jy ?? row.endYear),
		endMonth: toNumberOrNull(row.end_jm ?? row.endMonth),
		contractNumber: row.contract_number ?? row.contractNumber ?? "",
		description: row.note ?? row.description ?? "",
		isSigned: row.is_signed ?? row.isSigned ?? false,
	};
}

function buildAddendaTree(addenda: unknown): Array<Record<string, any>> {
	const list = Array.isArray(addenda) ? addenda : [];
	let anonymousId = 0;
	let order = 0;
	const nodes = new Map<string, {
		key: string
		parentKey: string | null
		order: number
		row: Record<string, any>
	}>();

	const collect = (items: unknown, inferredParentKey: string | null = null) => {
		if (!Array.isArray(items))
			return;

		for (const item of items) {
			const source = (item ?? {}) as Record<string, any>;
			const id = toNumberOrNull(source.id);
			const key = id != null ? `id:${id}` : `anonymous:${anonymousId++}`;
			const explicitParentId = toNumberOrNull(source.parentAddendumId ?? source.parent_addendum_id);
			const parentKey = explicitParentId != null ? `id:${explicitParentId}` : inferredParentKey;
			const existing = nodes.get(key);
			const node = existing ?? {
				key,
				parentKey,
				order: order++,
				row: {},
			};

			node.parentKey = node.parentKey ?? parentKey;
			node.row = {
				...node.row,
				...source,
				children: [],
			};
			nodes.set(key, node);
			collect(source.children, key);
		}
	};

	collect(list);

	const roots: Array<(typeof nodes extends Map<any, infer V> ? V : never)> = [];
	for (const node of nodes.values()) {
		const parent = node.parentKey ? nodes.get(node.parentKey) : undefined;
		if (parent && parent.key !== node.key)
			(parent.row.children as Array<Record<string, any>>).push(node.row);
		else
			roots.push(node);
	}

	const collator = new Intl.Collator("fa", { numeric: true, sensitivity: "base" });
	const sortRows = (rows: Array<Record<string, any>>) => {
		rows.sort((left, right) => {
			const leftNumber = left.displayAddendumNumber ?? left.display_addendum_number;
			const rightNumber = right.displayAddendumNumber ?? right.display_addendum_number;
			if (leftNumber == null || rightNumber == null)
				return 0;
			return collator.compare(String(leftNumber), String(rightNumber));
		});
		rows.forEach(row => sortRows(Array.isArray(row.children) ? row.children : []));
	};

	const result = roots
		.sort((left, right) => left.order - right.order)
		.map(node => node.row);
	sortRows(result);
	return result;
}

function normalizeGenericAddendaFromDto(addenda: unknown): Array<Record<string, any>> {
	const list = Array.isArray(addenda) ? addenda : [];

	return list.map((item) => {
		const row = (item ?? {}) as Record<string, any>;
		return {
			...row,
			...normalizeAddendumBase(row),
			children: normalizeGenericAddendaFromDto(row.children),
		};
	});
}

function normalizeTrafficLocation(location: unknown) {
	const normalized = String(location ?? "").trim().toUpperCase();
	if (normalized === "PROVINCE" || normalized === "COUNTY")
		return "COUNTY";
	if (normalized === "TEHRAN")
		return "TEHRAN";
	return null;
}

function normalizeTrafficUnit(unit: unknown): "GB/month" | "Mbps" | null {
	const normalized = String(unit ?? "").trim().toLowerCase();
	if (normalized === "gb/month")
		return "GB/month";
	if (normalized === "mbps")
		return "Mbps";
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
		...(typeof basedTire === "boolean" ? { based_tire: basedTire } : {}),
		...(normalizedIncomePercentage != null ? { income_percentage: normalizedIncomePercentage } : {}),
		...(contractModel != null ? { contract_model: contractModel } : {}),
	};
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
				...mapAddendumIdentity(row),
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
				? mapTrafficLocationPayload("TEHRAN", row.tehranPricing, hasTrafficUnit ? row.tehranUnit : null, isIxp ? row.tehranBasedTire ?? true : undefined, isPremium ? row.tehranRevenuePercent : null, isIxp ? row.tehranContractModel ?? "LEGACY" : undefined)
				: null,
			mainLocations.province
				? mapTrafficLocationPayload("COUNTY", row.provincePricing, hasTrafficUnit ? row.provinceUnit : null, isIxp ? row.provinceBasedTire ?? true : undefined, isPremium ? row.provinceRevenuePercent : null, isIxp ? row.provinceContractModel ?? "LEGACY" : undefined)
				: null,
		].filter(Boolean);

		return {
			...mapAddendumIdentity(row),
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

function normalizeCommercialAddendaFromDto(addenda: unknown): Array<Record<string, any>> {
	const list = Array.isArray(addenda) ? addenda : [];

	return list.map((item) => {
		const row = (item ?? {}) as Record<string, any>;
		const details = (row.contract_openapi_details ?? row.contractOpenapiDetails ?? null) as Record<string, any> | null;
		const pricing = apiPricingToContractType(
			details?.bill_inquiry
			?? details?.billInquiry
			?? details?.receipt_register
			?? details?.receiptRegister
			?? row.bill_inquiry
			?? row.receipt_register
			?? null,
		);

		return {
			...normalizeAddendumBase(row),
			contractPricing: pricing ?? undefined,
			children: normalizeCommercialAddendaFromDto(row.children),
		};
	});
}

function normalizeOpenApiServiceFields(dto: any) {
	// ✅ ساختار جدید
	const details = dto?.contract_openapi_details ?? dto?.contractOpenapiDetails ?? null;

	// ✅ سازگاری با ساختار قدیمی (اگر هنوز بعضی جاها میاد)
	if (!details) {
		const legacyBill = dto?.bill_inquiry ?? null;
		const legacyReceipt = dto?.receipt_register ?? null;
		const packageModel = dto?.package_model ?? null;

		if (packageModel) {
			return {
				contractModel: "package",
				packageMode: packageModel?.mode ?? null,
				plans: (packageModel?.tiers ?? []).map((tier: any) => ({
					smsMin: toNumberOrStringNumber(tier?.sms_min_inclusive),
					smsMax: toNumberOrStringNumber(tier?.sms_max_exclusive),
					smsFixedPrice: toNumberOrStringNumber(tier?.sms_sale_rate?.tiers?.[0]?.rate_per_unit),

					billMin: toNumberOrStringNumber(tier?.bill_min_inclusive),
					billMax: toNumberOrStringNumber(tier?.bill_max_exclusive),
					billFixedPrice: toNumberOrStringNumber(tier?.bill_inquiry_rate?.tiers?.[0]?.rate_per_unit),

					billPartnerShare: toNumberOrStringNumber(tier?.partner_share_percent),
					billKarashabShare: toNumberOrStringNumber(tier?.karashab_share_percent),

					trafficProfitPercent: toNumberOrStringNumber(tier?.traffic_profit_percent),
					trafficPartnerSharePercent: toNumberOrStringNumber(tier?.traffic_partner_share_percent),
				})),
			};
		}

		if (legacyBill || legacyReceipt) {
			return {
				contractModel: "legacy",
				legacyPricing: {
					paymentRegistration: apiPricingToContractType(legacyReceipt),
					billInquiry: apiPricingToContractType(legacyBill),
				},
			};
		}

		return {};
	}

	// ✅ ساختار جدید: contract_openapi_details
	const cmRaw = details?.contract_model ?? details?.contractModel ?? details?.openapi_model ?? details?.openapiModel ?? dto?.openapi_model ?? null;
	const contractModel = typeof cmRaw === "string" ? cmRaw.trim().toLowerCase() : null; // "legacy" | "package"

	if (contractModel === "legacy") {
		return {
			contractModel: "legacy",
			legacyPricing: {
				paymentRegistration: apiPricingToContractType(details?.receipt_register ?? details?.receiptRegister ?? null),
				billInquiry: apiPricingToContractType(details?.bill_inquiry ?? details?.billInquiry ?? null),
			},
		};
	}

	if (contractModel === "package") {
		const packageModel = details?.package_model ?? details?.packageModel ?? dto?.package_model ?? null;

		return {
			contractModel: "package",
			packageMode: packageModel?.mode ?? null,
			plans: (packageModel?.tiers ?? []).map((tier: any) => ({
				smsMin: toNumberOrStringNumber(tier?.sms_min_inclusive),
				smsMax: toNumberOrStringNumber(tier?.sms_max_exclusive),
				smsFixedPrice: toNumberOrStringNumber(tier?.sms_sale_rate?.tiers?.[0]?.rate_per_unit),

				billMin: toNumberOrStringNumber(tier?.bill_min_inclusive),
				billMax: toNumberOrStringNumber(tier?.bill_max_exclusive),
				billFixedPrice: toNumberOrStringNumber(tier?.bill_inquiry_rate?.tiers?.[0]?.rate_per_unit),

				billPartnerShare: toNumberOrStringNumber(tier?.partner_share_percent),
				billKarashabShare: toNumberOrStringNumber(tier?.karashab_share_percent),

				trafficProfitPercent: toNumberOrStringNumber(tier?.traffic_profit_percent),
				trafficPartnerSharePercent: toNumberOrStringNumber(tier?.traffic_partner_share_percent),
			})),
		};
	}

	return {};
}

function normalizeOpenApiAddendaFromDto(addenda: unknown): Array<Record<string, any>> {
	const list = Array.isArray(addenda) ? addenda : [];

	return list.map((item) => {
		const row = (item ?? {}) as Record<string, any>;
		const details = row.contract_openapi_details ?? row.contractOpenapiDetails ?? null;
		const sharedLegacyPricing = (
			details?.bill_inquiry
			?? details?.billInquiry
			?? details?.receipt_register
			?? details?.receiptRegister
			?? row.bill_inquiry
			?? row.receipt_register
			?? row
		);
		const paymentRegistration = apiPricingToContractType(
			details?.receipt_register
			?? details?.receiptRegister
			?? row.receipt_register
			?? sharedLegacyPricing,
		);
		const billInquiry = apiPricingToContractType(
			details?.bill_inquiry
			?? details?.billInquiry
			?? row.bill_inquiry
			?? sharedLegacyPricing,
		);

		return {
			...normalizeAddendumBase(row),
			legacyPricing: {
				paymentRegistration,
				billInquiry,
			},
			children: normalizeOpenApiAddendaFromDto(row.children),
		};
	});
}

function normalizeSmsOperatorRevenue(operatorRevenue: unknown) {
	const rows = Array.isArray(operatorRevenue) ? operatorRevenue : [];
	const normalized: Record<string, ReturnType<typeof apiPricingToContractType>> = {};

	for (const row of rows) {
		const operator = String(row?.operator ?? "").trim().toUpperCase();
		const language = String(row?.language ?? "").trim().toUpperCase();
		const field = operator === "IRANCELL"
			? language === "EN" ? "irancellEn" : "irancellFa"
			: operator === "MCI"
				? language === "EN" ? "hamrahAvalEn" : "hamrahAvalFa"
				: operator === "OTHER"
					? language === "EN" ? "otherEn" : "otherFa"
					: null;

		if (field)
			normalized[field] = apiPricingToContractType(row);
	}

	return normalized;
}

function normalizeSmsServiceFields(dto: any) {
	const profit = dto?.profit ?? null;
	const governmentRevenue = dto?.government_revenue ?? dto?.governmentRevenue ?? null;

	return {
		isOfficial: dto?.is_official ?? dto?.isOfficial ?? dto?.is_signed ?? true,
		operatorRevenue: normalizeSmsOperatorRevenue(dto?.operator_revenue ?? dto?.operatorRevenue),
		governmentRevenue: apiPricingToContractType(governmentRevenue),
		governmentRate: apiPricingToContractType(dto?.government_rate ?? dto?.governmentRate ?? governmentRevenue),
		profit: profit
			? {
				pricing: apiPricingToContractType(profit),
				minProfit: toNumberOrStringNumber(profit?.min_profit_amount ?? profit?.minProfit),
			}
			: undefined,
		addenda: normalizeSmsAddendaFromDto(dto?.addenda),
	};
}

function normalizeSmsAddendaFromDto(addenda: unknown): Array<Record<string, any>> {
	const list = Array.isArray(addenda) ? addenda : [];
	const hasComponentRows = list.some(item => typeof item?.component === "string");

	if (hasComponentRows) {
		const groups = new Map<string, Record<string, any>[]>();
		for (const item of list) {
			const row = (item ?? {}) as Record<string, any>;
			const key = String(
				row.display_addendum_number
				?? row.displayAddendumNumber
				?? `${row.start_jy ?? row.startYear}-${row.start_jm ?? row.startMonth}-${row.end_jy ?? row.endYear}-${row.end_jm ?? row.endMonth}-${row.contract_number ?? row.contractNumber ?? ""}`,
			);
			groups.set(key, [...(groups.get(key) ?? []), row]);
		}

		return [...groups.values()].map((rows) => {
			const first = rows[0];
			const operatorRows = rows.filter(row => String(row.component ?? "").toUpperCase() === "OPERATOR");
			const government = rows.find(row => String(row.component ?? "").toUpperCase() === "GOVERNMENT");
			const profit = rows.find(row => String(row.component ?? "").toUpperCase() === "PROFIT");
			const children = rows.flatMap(row => Array.isArray(row.children) ? row.children : []);

			return {
				...normalizeAddendumBase(first),
				operatorRevenue: normalizeSmsOperatorRevenue(operatorRows),
				governmentRevenue: apiPricingToContractType(government as any),
				governmentRate: apiPricingToContractType(government as any),
				profit: profit
					? {
						pricing: apiPricingToContractType(profit as any),
						minProfit: toNumberOrStringNumber(profit.min_profit_amount ?? profit.minProfit),
					}
					: undefined,
				children: normalizeSmsAddendaFromDto(children),
			};
		});
	}

	return list.map((item) => {
		const row = (item ?? {}) as Record<string, any>;
		const profit = row.profit ?? null;
		const governmentRevenue = row.government_revenue ?? row.governmentRevenue ?? row.government_rate ?? row.governmentRate ?? null;

		return {
			...normalizeAddendumBase(row),
			operatorRevenue: normalizeSmsOperatorRevenue(row.operator_revenue ?? row.operatorRevenue),
			governmentRevenue: apiPricingToContractType(governmentRevenue),
			governmentRate: apiPricingToContractType(governmentRevenue),
			profit: profit
				? {
					pricing: apiPricingToContractType(profit),
					minProfit: toNumberOrStringNumber(profit?.min_profit_amount ?? profit?.minProfit),
				}
				: undefined,
			children: normalizeSmsAddendaFromDto(row.children),
		};
	});
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
		{ operator: "IRANCELL", language: "FA", ...mapSmsPricingPayload(operatorRevenue.irancellFa) },
		{ operator: "IRANCELL", language: "EN", ...mapSmsPricingPayload(operatorRevenue.irancellEn) },
		{ operator: "MCI", language: "FA", ...mapSmsPricingPayload(operatorRevenue.hamrahAvalFa) },
		{ operator: "MCI", language: "EN", ...mapSmsPricingPayload(mciEnSource) },
		{ operator: "OTHER", language: "FA", ...mapSmsPricingPayload(operatorRevenue.otherFa) },
		{ operator: "OTHER", language: "EN", ...mapSmsPricingPayload(operatorRevenue.otherEn) },
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

function normalizeCommercialServiceFields(dto: any) {
	const details = dto?.contract_openapi_details ?? dto?.contractOpenapiDetails ?? null;
	const pricing = apiPricingToContractType(
		details?.bill_inquiry
		?? details?.billInquiry
		?? details?.receipt_register
		?? details?.receiptRegister
		?? dto?.bill_inquiry
		?? dto?.receipt_register
		?? null,
	);

	return {
		contractPricing: pricing ?? null,
		addenda: normalizeCommercialAddendaFromDto(dto?.addenda),
	};
}

function normalizeShahkarAddendaFromDto(addenda: unknown): Array<Record<string, any>> {
	const list = Array.isArray(addenda) ? addenda : [];

	return list.map((item) => {
		const row = (item ?? {}) as Record<string, any>;

		return {
			...normalizeAddendumBase(row),
			contractPricing: apiPricingToContractType({
				calculation_type: row.calculation_type ?? row.calculationType ?? null,
				tiers: row.tiers ?? null,
			} as any),
			children: normalizeShahkarAddendaFromDto(row.children),
		};
	});
}

function normalizeShahkarServiceFields(dto: any) {
	const pricing = apiPricingToContractType({
		calculation_type: dto?.calculation_type ?? dto?.calculationType ?? null,
		tiers: dto?.tiers ?? null,
	} as any);
	const hasNewCustomerRate = dto?.has_new_customer_rate ?? dto?.hasNewCustomerRate ?? false;
	const newCustomerPricing = hasNewCustomerRate
		? apiPricingToContractType({
			calculation_type: dto?.new_customer_calculation_type ?? dto?.newCustomerCalculationType ?? null,
			tiers: dto?.new_customer_tiers ?? dto?.newCustomerTiers ?? null,
		} as any)
		: undefined;

	return {
		isSigned: dto?.is_signed ?? dto?.isSigned ?? false,
		contractPricing: pricing ?? null,
		hasNewCustomerRate,
		newCustomerPricing,
		addenda: normalizeShahkarAddendaFromDto(dto?.addenda),
	};
}

function normalizeSmsCommissionAddendaFromDto(addenda: unknown): Array<Record<string, any>> {
	const list = Array.isArray(addenda) ? addenda : [];

	return list.map((item) => {
		const row = (item ?? {}) as Record<string, any>;

		return {
			...normalizeAddendumBase(row),
			initialCommission: toNumberOrStringNumber(row.initial_receive_fee ?? row.initialReceiveFee),
			finalCommission: toNumberOrStringNumber(row.final_receive_fee ?? row.finalReceiveFee),
			expertPercent: toNumberOrStringNumber(row.karashab_percent ?? row.karashabPercent),
			telecomPercent: toNumberOrStringNumber(row.mokhaberat_percent ?? row.mokhaberatPercent),
			firstPartySharePercent: toNumberOrStringNumber(row.first_side_percent ?? row.firstSidePercent),
			regionSharePercent: toNumberOrStringNumber(row.area_percent ?? row.areaPercent),
			salesAgentSharePercent: toNumberOrStringNumber(row.sales_agent_percent ?? row.salesAgentPercent),
			children: normalizeSmsCommissionAddendaFromDto(row.children),
		};
	});
}

function normalizeSmsCommissionServiceFields(dto: any) {
	return {
		agent: toNumberOrNull(dto?.sales_agent ?? dto?.salesAgent ?? dto?.agent),
		initialCommission: toNumberOrStringNumber(dto?.initial_receive_fee ?? dto?.initialReceiveFee),
		finalCommission: toNumberOrStringNumber(dto?.final_receive_fee ?? dto?.finalReceiveFee),
		expertPercent: toNumberOrStringNumber(dto?.karashab_percent ?? dto?.karashabPercent),
		telecomPercent: toNumberOrStringNumber(dto?.mokhaberat_percent ?? dto?.mokhaberatPercent),
		firstPartySharePercent: toNumberOrStringNumber(dto?.first_side_percent ?? dto?.firstSidePercent),
		regionSharePercent: toNumberOrStringNumber(dto?.area_percent ?? dto?.areaPercent),
		salesAgentSharePercent: toNumberOrStringNumber(dto?.sales_agent_percent ?? dto?.salesAgentPercent),
		addenda: normalizeSmsCommissionAddendaFromDto(dto?.addenda),
	};
}

function normalizeTrafficAddendaFromDto(addenda: unknown, companyType?: unknown): Array<Record<string, any>> {
	const list = Array.isArray(addenda) ? addenda : [];
	const normalizedCompanyType = pickCompanyTypeToken(companyType);

	return list.map((item) => {
		const row = (item ?? {}) as Record<string, any>;
		if (normalizedCompanyType === "COLLOCATION") {
			const location = normalizeTrafficLocation(row.location);
			return {
				...normalizeAddendumBase(row),
				location: location === "COUNTY" ? "PROVINCE" : location,
				contractPricing: apiPricingToContractType({
					calculation_type: row.calculation_type ?? row.calculationType ?? null,
					tiers: row.tiers ?? null,
				} as any),
				children: normalizeTrafficAddendaFromDto(row.children, companyType),
			};
		}
		const locations = Array.isArray(row.locations) && row.locations.length > 0
			? row.locations
			: [row];
		const tehranLocation = locations.find((location: any) => normalizeTrafficLocation(location?.location) === "TEHRAN");
		const provinceLocation = locations.find((location: any) => normalizeTrafficLocation(location?.location) === "COUNTY");
		const normalizePricing = (location: any) => location
			? apiPricingToContractType({
				calculation_type: location.calculation_type ?? location.calculationType ?? null,
				tiers: location.tiers ?? null,
			} as any)
			: undefined;

		return {
			...normalizeAddendumBase(row),
			tehranPricing: normalizePricing(tehranLocation),
			tehranUnit: normalizeTrafficUnit(tehranLocation?.unit),
			tehranBasedTire: tehranLocation?.based_tire ?? tehranLocation?.basedTire ?? true,
			tehranContractModel: tehranLocation?.contract_model ?? tehranLocation?.contractModel ?? "LEGACY",
			tehranRevenuePercent: toNumberOrStringNumber(tehranLocation?.income_percentage ?? tehranLocation?.incomePercentage),
			provincePricing: normalizePricing(provinceLocation),
			provinceUnit: normalizeTrafficUnit(provinceLocation?.unit),
			provinceBasedTire: provinceLocation?.based_tire ?? provinceLocation?.basedTire ?? true,
			provinceContractModel: provinceLocation?.contract_model ?? provinceLocation?.contractModel ?? "LEGACY",
			provinceRevenuePercent: toNumberOrStringNumber(provinceLocation?.income_percentage ?? provinceLocation?.incomePercentage),
			children: normalizeTrafficAddendaFromDto(row.children, companyType),
		};
	});
}

function normalizeTrafficServiceFields(dto: any) {
	const locations = Array.isArray(dto?.locations) ? dto.locations : [];
	const tehranLocation = locations.find((item: any) => normalizeTrafficLocation(item?.location) === "TEHRAN");
	const countyLocation = locations.find((item: any) => normalizeTrafficLocation(item?.location) === "COUNTY");
	const telecomCollocationLocation = locations.find((item: any) => String(item?.location ?? "").trim().toUpperCase() === "GLOBAL_COLLOCATION_COST");

	return {
		isOfficial: dto?.is_official ?? dto?.isOfficial ?? dto?.is_signed ?? true,
		collocationPartnerType: dto?.collocation_partner_type ?? dto?.collocationPartnerType ?? null,
		realStartYear: toNumberOrNull(dto?.real_start?.real_start_jy ?? dto?.realStart?.realStartJy),
		realStartMonth: toNumberOrNull(dto?.real_start?.real_start_jm ?? dto?.realStart?.realStartJm),
		telecomRackCount: toNumberOrStringNumber(telecomCollocationLocation?.rack_count ?? telecomCollocationLocation?.rackCount),
		telecomUnitsPerRack: toNumberOrStringNumber(telecomCollocationLocation?.units_per_rack ?? telecomCollocationLocation?.unitsPerRack),
		telecomMonthlyRackRent: toNumberOrStringNumber(
			telecomCollocationLocation?.tiers?.cost_per_month
			?? telecomCollocationLocation?.tiers?.costPerMonth,
		),
		tehranUnit: normalizeTrafficUnit(tehranLocation?.unit),
		tehranBasedTire: tehranLocation?.based_tire ?? tehranLocation?.basedTire ?? true,
		tehranContractModel: tehranLocation?.contract_model ?? tehranLocation?.contractModel ?? "LEGACY",
		provinceUnit: normalizeTrafficUnit(countyLocation?.unit),
		provinceBasedTire: countyLocation?.based_tire ?? countyLocation?.basedTire ?? true,
		provinceContractModel: countyLocation?.contract_model ?? countyLocation?.contractModel ?? "LEGACY",
		tehranRevenuePercent: toNumberOrStringNumber(tehranLocation?.income_percentage ?? tehranLocation?.incomePercentage),
		provinceRevenuePercent: toNumberOrStringNumber(countyLocation?.income_percentage ?? countyLocation?.incomePercentage),
		tehranPricing: tehranLocation
			? apiPricingToContractType({
				calculation_type: tehranLocation.calculation_type ?? tehranLocation.calculationType ?? null,
				tiers: tehranLocation.tiers ?? null,
			} as any)
			: undefined,
		provincePricing: countyLocation
			? apiPricingToContractType({
				calculation_type: countyLocation.calculation_type ?? countyLocation.calculationType ?? null,
				tiers: countyLocation.tiers ?? null,
			} as any)
			: undefined,
		addenda: normalizeTrafficAddendaFromDto(dto?.addenda, dto?.company_type ?? dto?.traffic_company_type),
	};
}

function normalizeSalesAgencyServiceFields(dto: any, companyType: string | null) {
	if (companyType === "SALES_REP_MANAGEMENT") {
		const titles = dto?.cost_titles ?? dto?.costTitles ?? [];
		return {
			costTitles: Array.isArray(titles)
				? titles.map((title: unknown) => String(title ?? ""))
				: [],
		};
	}

	return {
		incomePercentage: toNumberOrStringNumber(dto?.income_percentage ?? dto?.incomePercentage),
		expensePercentage: toNumberOrStringNumber(dto?.expense_percentage ?? dto?.expensePercentage),
	};
}

function dtoToFormValues(dto: any, service: ContractServicePath): ContractFormValues {
	const serviceId = toNumberOrNull(dto?.service_id ?? dto?.serviceId ?? dto?.service?.id ?? dto?.service);
	const companyId = toNumberOrNull(dto?.company_id ?? dto?.companyId ?? dto?.company?.id ?? dto?.company);

	const description = dto?.note ?? dto?.description ?? "";

	const companyType = pickCompanyTypeToken(dto?.company_type ?? dto?.traffic_company_type);
	const counterpartyType = normalizeSmsCounterpartyType(dto?.sms_party ?? dto?.counterparty_type ?? dto?.counterpartyType) ?? (service === "sms/client" ? "partners" : service === "sms/vendor" ? "gov_ops" : null);

	const serviceCodeRaw = dto?.service_code ?? dto?.service?.code ?? servicePathToServiceCode(service);
	const serviceCode = typeof serviceCodeRaw === "string" ? serviceCodeRaw.trim().toLowerCase() : null;

	let serviceFields: any = {};

	if (serviceCode === "openapi") {
		serviceFields = {
			...normalizeOpenApiServiceFields(dto),
			addenda: normalizeOpenApiAddendaFromDto(dto?.addenda),
		};
	}
	else if (serviceCode === "sms") {
		serviceFields = normalizeSmsServiceFields(dto);
	}
	else if (serviceCode === "sms-commission" || serviceCode === "sms_commission") {
		serviceFields = normalizeSmsCommissionServiceFields(dto);
	}
	else if (serviceCode === "shahkar") {
		serviceFields = normalizeShahkarServiceFields(dto);
	}
	else if (serviceCode === "commercial") {
		serviceFields = normalizeCommercialServiceFields(dto);
	}
	else if (serviceCode === "traffic") {
		serviceFields = normalizeTrafficServiceFields(dto);
	}
	else if (serviceCode === "sales_agency" || serviceCode === "sales-agency") {
		serviceFields = normalizeSalesAgencyServiceFields(dto, companyType);
	}
	else {
		// ✅ سایر سرویس‌ها: هر فیلدی غیر از پایه‌ها => serviceFields
		const {
			id,
			company,
			company_id,
			company_type,
			traffic_company_type,
			service: _service,
			service_id,
			sms_party,
			is_official,
			is_signed,
			start_jy,
			start_jm,
			end_jy,
			end_jm,
			contract_number,
			start_date,
			end_date_exclusive,
			end_date,
			active_period,
			created_at,
			created_by_user,
			updated_at,
			updated_by_user,
			note,
			description: _desc,
			addenda,
			...rest
		} = dto ?? {};

		serviceFields = {
			...(rest ?? {}),
			...(typeof dto?.is_official === "boolean" ? { isOfficial: dto.is_official } : {}),
			isSigned: dto?.is_signed ?? dto?.isSigned ?? false,
			addenda: normalizeGenericAddendaFromDto(dto?.addenda),
		};
	}

	if (Array.isArray(serviceFields.addenda)) {
		serviceFields = {
			...serviceFields,
			addenda: buildAddendaTree(serviceFields.addenda),
		};
	}

	return {
		serviceId,
		serviceCode: serviceCode as any,
		companyId,
		companyType,
		counterpartyType,

		startYear: toNumberOrNull(dto?.start_jy ?? dto?.startYear),
		startMonth: toNumberOrNull(dto?.start_jm ?? dto?.startMonth),
		endYear: toNumberOrNull(dto?.end_jy ?? dto?.endYear),
		endMonth: toNumberOrNull(dto?.end_jm ?? dto?.endMonth),
		contractNumber: dto?.contract_number ?? dto?.contractNumber ?? dto?.contract_no ?? "",

		description,
		documents: dto?.documents ?? [],
		serviceFields,
	};
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

	if (serviceCode === "sms") {
		payload.operator_revenue = mapSmsOperatorRevenuePayload(serviceFields.operatorRevenue);
		payload.is_official = serviceFields.isOfficial ?? true;
		payload.addenda = mapSmsAddenda(addenda, values.counterpartyType === "partners");

		if (values.counterpartyType === "partners") {
			payload.government_revenue = mapSmsPricingPayload(serviceFields.governmentRevenue);
			payload.profit = {
				...mapSmsPricingPayload(serviceFields.profit?.pricing),
				min_profit_amount: toStringOrNull(serviceFields.profit?.minProfit),
			};
		}
		else {
			payload.government_revenue = mapSmsPricingPayload(serviceFields.governmentRate);
		}

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
		const pricing = contractTypeToApiPricing((serviceFields.contractPricing ?? null) as any);
		const hasNewCustomerRate = serviceFields.hasNewCustomerRate === true;
		const newCustomerPricing = hasNewCustomerRate
			? contractTypeToApiPricing((serviceFields.newCustomerPricing ?? null) as any)
			: null;
		payload.is_signed = serviceFields.isSigned ?? false;
		payload.calculation_type = pricing?.calculation_type ?? null;
		payload.tiers = pricing?.tiers ?? [];
		payload.has_new_customer_rate = hasNewCustomerRate;
		if (newCustomerPricing) {
			payload.new_customer_calculation_type = newCustomerPricing.calculation_type;
			payload.new_customer_tiers = newCustomerPricing.tiers;
		}
		payload.addenda = mapShahkarAddenda(addenda);
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
			mapTrafficLocationPayload("TEHRAN", serviceFields.tehranPricing, isUnitCompanyType ? serviceFields.tehranUnit : null, isIxp ? serviceFields.tehranBasedTire ?? true : undefined, isPremiumCompanyType ? serviceFields.tehranRevenuePercent : null, isIxp ? serviceFields.tehranContractModel ?? "LEGACY" : undefined),
			mapTrafficLocationPayload("COUNTY", serviceFields.provincePricing, isUnitCompanyType ? serviceFields.provinceUnit : null, isIxp ? serviceFields.provinceBasedTire ?? true : undefined, isPremiumCompanyType ? serviceFields.provinceRevenuePercent : null, isIxp ? serviceFields.provinceContractModel ?? "LEGACY" : undefined),
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

	if (serviceCode === "openapi") {
		const contractModel = "legacy" as "package" | "legacy";

		let openApiDetails: Record<string, any> | null = null;
		payload.openapi_model = "LEGACY";

		if (contractModel === "package") {
			openApiDetails = mapOpenApiPackageDetails(serviceFields);
		}
		else if (contractModel === "legacy") {
			openApiDetails = {
				openapi_model: "LEGACY",
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

	// For non-openapi services backend fields usually live at root level.
	payload.addenda = mapGenericAddenda(addenda);
	payload.is_signed = serviceFields.isSigned ?? serviceFields.is_signed ?? false;
	const {
		addenda: _addenda,
		isSigned: _isSigned,
		is_signed: _isSignedSnake,
		...restServiceFields
	} = serviceFields;
	return {
		...payload,
		...restServiceFields,
	};
}

function isValidContractDetailResponse(dto: unknown, contractId: number) {
	if (!dto || typeof dto !== "object")
		return false;

	const record = dto as Record<string, unknown>;
	return Number(record.id) === contractId;
}

function getSmsFallbackService(service: ContractServicePath) {
	if (service === "sms/client")
		return "sms/vendor" as const;
	if (service === "sms/vendor")
		return "sms/client" as const;
	return null;
}

function resolveSelectionService(context: ContractFormSelectionContext): ContractServicePath | null {
	const code = context.serviceCode?.trim().toLowerCase();
	if (!code)
		return null;

	if (code === "sms") {
		if (context.counterpartyType === "partners")
			return "sms/client";
		if (context.counterpartyType === "gov_ops")
			return "sms/vendor";
		return null;
	}
	if (code === "sms_commission" || code === "sms-commission")
		return "sms-commission";
	if (code === "sales_agency" || code === "sales-agency") {
		return String(context.companyType ?? "").trim().toUpperCase() === "SALES_REP_MANAGEMENT"
			? "sales-agency/rep-management"
			: "sales-agency/outbound";
	}
	if (["openapi", "traffic", "psp", "commercial", "shahkar"].includes(code))
		return code as ContractServicePath;
	return null;
}

interface ContractListScope {
	serviceId: number | null
	service: ContractServicePath | null
	companyId: number | null
	companyType: string | null
}

export function ContractEditForm({ contractId, service, onUpdated, onSaved, onContractSelect, readOnly = false }: Props) {
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [initialValues, setInitialValues] = useState<ContractFormValues | null>(null);
	const [contractDetail, setContractDetail] = useState<Record<string, unknown> | null>(null);
	const [resolvedService, setResolvedService] = useState<ContractServicePath | null>(null);
	const [loadedContractId, setLoadedContractId] = useState<number | null>(null);
	const [loadError, setLoadError] = useState(false);
	const [contractListScope, setContractListScope] = useState<ContractListScope | null>(null);
	const contractListScopeRef = useRef<ContractListScope | null>(null);
	const [awaitingContractSelection, setAwaitingContractSelection] = useState(false);

	const handleSelectionContextChange = useCallback((context: ContractFormSelectionContext) => {
		const current = contractListScopeRef.current;
		const nextService = resolveSelectionService(context);
		const companyScopeChanged = current != null && (
			current.serviceId !== context.serviceId
			|| current.service !== nextService
			|| current.companyType !== context.companyType
		);
		const selectionChanged = companyScopeChanged || (current != null && current.companyId !== context.companyId);
		const nextScope = {
			serviceId: context.serviceId,
			service: nextService,
			companyId: companyScopeChanged ? null : context.companyId,
			companyType: context.companyType,
		};

		contractListScopeRef.current = nextScope;
		setContractListScope(nextScope);
		if (selectionChanged)
			setAwaitingContractSelection(true);
	}, []);

	useEffect(() => {
		let cancelled = false;
		const smsFallbackService = getSmsFallbackService(service);
		const candidateServices: ContractServicePath[] = smsFallbackService ? [service, smsFallbackService] : [service];

		(async () => {
			setLoading(true);
			setLoadError(false);
			try {
				for (const candidateService of candidateServices) {
					try {
						const dto = await fetchContractDetail(candidateService, contractId);
						if (!isValidContractDetailResponse(dto, contractId))
							continue;

						const formValues = dtoToFormValues(dto, candidateService);
						try {
							const documentsResponse = await listContractDocuments(contractId);
							formValues.documents = documentsResponse.results.map(contractDocumentToUploadFile);
						}
						catch {
							// اگر بازیابی فهرست مدارک شکست بخورد، بقیه‌ی فرم همچنان قابل استفاده باشد
						}

						if (!cancelled) {
							setResolvedService(candidateService);
							setInitialValues(formValues);
							setContractDetail(dto as Record<string, unknown>);
							setLoadedContractId(contractId);
							const loadedScope = {
								serviceId: formValues.serviceId ?? null,
								service: candidateService,
								companyId: formValues.companyId ?? null,
								companyType: formValues.companyType ?? null,
							};
							contractListScopeRef.current = loadedScope;
							setContractListScope(loadedScope);
							setAwaitingContractSelection(false);
						}
						return;
					}
					catch {
						// try the next fallback service candidate
					}
				}
				if (!cancelled)
					setLoadError(true);
			}
			finally {
				if (!cancelled)
					setLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [contractId, service]);

	return (
		loading && !initialValues
			? (
				<div className="flex min-h-[240px] items-center justify-center">
					<Spin />
				</div>
			)
			: !initialValues || !resolvedService || loadedContractId == null
				? <Empty description="اطلاعات قرارداد یافت نشد" />
				: (
					<div dir="rtl" className="flex flex-col items-start lg:flex-row">
						<div className="order-2 min-w-0 w-full flex-1 lg:order-1">
							{loadError
								? (
									<div className="p-4">
										<Alert type="error" showIcon message="دریافت اطلاعات قرارداد ناموفق بود" />
									</div>
								)
								: (
									<Spin spinning={loading} tip="در حال دریافت اطلاعات قرارداد" wrapperClassName="w-full">
										{readOnly
											? contractDetail ? <ContractReadOnlyDetails values={initialValues} detail={contractDetail} service={resolvedService} /> : null
											: (
												<ContractForm
													key={`${resolvedService}-${loadedContractId}`}
													mode="edit"
													contractId={loadedContractId}
													initialValues={initialValues}
													showDocuments={false}
													readOnly={readOnly}
													onSelectionContextChange={handleSelectionContextChange}
													awaitingContractSelection={awaitingContractSelection}
													submitText="ذخیره تغییرات"
													submitting={saving || loading}
													onSubmit={async (values) => {
														setSaving(true);
														try {
															await fetchUpdateContract(resolvedService, loadedContractId, await formValuesToApiPayload(values));
															window.$message?.success("قرارداد با موفقیت ویرایش شد");
															onUpdated?.();
															onSaved?.();
														}
														finally {
															setSaving(false);
														}
													}}
												/>
											)}
									</Spin>
								)}
						</div>

						{initialValues.companyId != null
							? (
								<aside className="order-1 flex w-full flex-col gap-3 px-2 pt-4 lg:order-2 lg:w-[25rem] lg:shrink-0 lg:pr-0">
									<CompanyContractsPanel
										companyId={contractListScope?.companyId}
										companyType={contractListScope?.companyType}
										currentContractId={awaitingContractSelection ? 0 : loadedContractId}
										service={contractListScope?.service}
										serviceId={contractListScope?.serviceId}
										onSelect={(selectedContract) => {
											const selectedServiceId = Number(selectedContract.service_id ?? selectedContract.service ?? contractListScope?.serviceId);
											if (Number.isInteger(selectedServiceId) && selectedServiceId > 0) {
												onContractSelect?.(
													selectedContract.id,
													selectedServiceId,
													contractListScope?.companyType ?? null,
													contractListScope?.service ?? resolvedService,
												);
											}
										}}
									/>
									{awaitingContractSelection
										? null
										: (
											<>
												<ContractDocumentsPanel
													key={loadedContractId}
													contractId={loadedContractId}
													initialDocuments={initialValues.documents as UploadFile[]}
													loading={loading}
													readOnly={readOnly}
												/>
												<ContractApprovalHistoryPanel
													contractId={loadedContractId}
													service={resolvedService}
												/>
											</>
										)}
								</aside>
							)
							: null}
					</div>
				)
	);
}
