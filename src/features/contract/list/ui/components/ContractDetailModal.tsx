import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types";
import type { ContractServicePath } from "../../../api/contracts.api";
import { apiPricingToContractType, contractTypeToApiPricing } from "#src/features/contract/api/pricing.mapper";
import { ContractForm } from "#src/features/contract/shared/ui/form/ContractForm";
import { pickCompanyTypeToken } from "#src/features/contract/shared/utils";
import { Empty, Modal, Spin } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { fetchContractDetail, fetchUpdateContract } from "../../../api/contracts.api";

interface Props {
	open: boolean
	contractId: number | null
	service: ContractServicePath | null
	onClose: () => void
	onUpdated?: () => void
}

function servicePathToServiceCode(service: ContractServicePath): string {
	const raw = service.startsWith("sms/") ? "sms" : service;
	return raw.trim().toLowerCase();
}

function normalizeSmsCounterpartyType(value: unknown): "partners" | "gov_ops" | null {
	if (value === "partners" || value === "client")
		return "partners";
	if (value === "gov_ops" || value === "vendor")
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

function normalizeTrafficLocation(location: unknown) {
	const normalized = String(location ?? "").trim().toUpperCase();
	if (normalized === "PROVINCE" || normalized === "COUNTY")
		return "COUNTY";
	if (normalized === "TEHRAN")
		return "TEHRAN";
	return null;
}

function mapTrafficLocationPayload(location: "TEHRAN" | "COUNTY", pricingValue: unknown) {
	const pricing = contractTypeToApiPricing((pricingValue ?? null) as any);
	if (!pricing)
		return null;

	return {
		location,
		unit: "GB/month",
		calculation_type: pricing.calculation_type,
		tiers: pricing.tiers ?? [],
	};
}

function mapTrafficAddenda(addenda: unknown) {
	const list = Array.isArray(addenda) ? addenda : [];

	return list.map((item) => {
		const row = (item ?? {}) as Record<string, any>;
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
		};
	});
}

function normalizeCommercialAddendaFromDto(addenda: unknown) {
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
			startYear: toNumberOrNull(row.start_jy ?? row.startYear),
			startMonth: toNumberOrNull(row.start_jm ?? row.startMonth),
			endYear: toNumberOrNull(row.end_jy ?? row.endYear),
			endMonth: toNumberOrNull(row.end_jm ?? row.endMonth),
			contractNumber: row.contract_number ?? row.contractNumber ?? "",
			description: row.note ?? row.description ?? "",
			contractPricing: pricing ?? undefined,
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
	const cmRaw = details?.contract_model ?? details?.contractModel ?? null;
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

function normalizeShahkarServiceFields(dto: any) {
	const pricing = apiPricingToContractType({
		calculation_type: dto?.calculation_type ?? dto?.calculationType ?? null,
		tiers: dto?.tiers ?? null,
	} as any);

	return {
		contractPricing: pricing ?? null,
		addenda: dto?.addenda ?? [],
	};
}

function normalizeSmsCommissionAddendaFromDto(addenda: unknown) {
	const list = Array.isArray(addenda) ? addenda : [];

	return list.map((item) => {
		const row = (item ?? {}) as Record<string, any>;

		return {
			startYear: toNumberOrNull(row.start_jy ?? row.startYear),
			startMonth: toNumberOrNull(row.start_jm ?? row.startMonth),
			endYear: toNumberOrNull(row.end_jy ?? row.endYear),
			endMonth: toNumberOrNull(row.end_jm ?? row.endMonth),
			description: row.note ?? row.description ?? "",
			contractNumber: row.contract_number ?? row.contractNumber ?? "",
			initialCommission: toNumberOrStringNumber(row.initial_receive_fee ?? row.initialReceiveFee),
			finalCommission: toNumberOrStringNumber(row.final_receive_fee ?? row.finalReceiveFee),
			expertPercent: toNumberOrStringNumber(row.karashab_percent ?? row.karashabPercent),
			telecomPercent: toNumberOrStringNumber(row.mokhaberat_percent ?? row.mokhaberatPercent),
			firstPartySharePercent: toNumberOrStringNumber(row.first_side_percent ?? row.firstSidePercent),
			regionSharePercent: toNumberOrStringNumber(row.area_percent ?? row.areaPercent),
			salesAgentSharePercent: toNumberOrStringNumber(row.sales_agent_percent ?? row.salesAgentPercent),
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

function normalizeTrafficAddendaFromDto(addenda: unknown) {
	const list = Array.isArray(addenda) ? addenda : [];

	return list.map((item) => {
		const row = (item ?? {}) as Record<string, any>;
		const location = normalizeTrafficLocation(row.location);

		return {
			startYear: toNumberOrNull(row.start_jy ?? row.startYear),
			startMonth: toNumberOrNull(row.start_jm ?? row.startMonth),
			endYear: toNumberOrNull(row.end_jy ?? row.endYear),
			endMonth: toNumberOrNull(row.end_jm ?? row.endMonth),
			description: row.note ?? row.description ?? "",
			contractNumber: row.contract_number ?? row.contractNumber ?? "",
			location: location === "COUNTY" ? "PROVINCE" : location,
			contractPricing: apiPricingToContractType({
				calculation_type: row.calculation_type ?? row.calculationType ?? null,
				tiers: row.tiers ?? null,
			} as any),
		};
	});
}

function normalizeTrafficServiceFields(dto: any) {
	const locations = Array.isArray(dto?.locations) ? dto.locations : [];
	const tehranLocation = locations.find((item: any) => normalizeTrafficLocation(item?.location) === "TEHRAN");
	const countyLocation = locations.find((item: any) => normalizeTrafficLocation(item?.location) === "COUNTY");

	return {
		isOfficial: dto?.is_official ?? dto?.isOfficial ?? dto?.is_signed ?? true,
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
		addenda: normalizeTrafficAddendaFromDto(dto?.addenda),
	};
}

function dtoToFormValues(dto: any, service: ContractServicePath): ContractFormValues {
	const serviceId = toNumberOrNull(dto?.service_id ?? dto?.service?.id ?? dto?.service);
	const companyId = toNumberOrNull(dto?.company_id ?? dto?.company?.id ?? dto?.company);

	const description = dto?.note ?? dto?.description ?? "";

	const companyType = pickCompanyTypeToken(dto?.company_type ?? dto?.traffic_company_type);
	const counterpartyType = normalizeSmsCounterpartyType(dto?.sms_party);

	const serviceCodeRaw = dto?.service_code ?? dto?.service?.code ?? servicePathToServiceCode(service);
	const serviceCode = typeof serviceCodeRaw === "string" ? serviceCodeRaw.trim().toLowerCase() : null;

	let serviceFields: any = {};

	if (serviceCode === "openapi") {
		serviceFields = {
			...normalizeOpenApiServiceFields(dto),
			addenda: dto?.addenda ?? [],
		};
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
			addenda: dto?.addenda ?? [],
		};
	}

	return {
		serviceId,
		serviceCode: serviceCode as any,
		companyId,
		companyType,
		counterpartyType,

		startYear: toNumberOrNull(dto?.start_jy),
		startMonth: toNumberOrNull(dto?.start_jm),
		endYear: toNumberOrNull(dto?.end_jy),
		endMonth: toNumberOrNull(dto?.end_jm),
		contractNumber: dto?.contract_number ?? "",

		description,
		documents: dto?.documents ?? [],
		serviceFields,
	};
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

	if (values.companyType != null)
		payload.company_type = values.companyType;
	if (values.counterpartyType != null)
		payload.sms_party = values.counterpartyType;

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
		payload.calculation_type = pricing?.calculation_type ?? null;
		payload.tiers = pricing?.tiers ?? [];
		return payload;
	}

	if (serviceCode === "commercial") {
		payload.contract_openapi_details = mapOpenApiLegacyDetails(serviceFields.contractPricing);
		payload.addenda = mapCommercialAddenda(addenda);
		return payload;
	}

	if (serviceCode === "traffic") {
		const isOfficial = serviceFields.isOfficial ?? true;
		const locations = [
			mapTrafficLocationPayload("TEHRAN", serviceFields.tehranPricing),
			mapTrafficLocationPayload("COUNTY", serviceFields.provincePricing),
		].filter(Boolean);

		payload.is_signed = isOfficial;
		payload.is_official = isOfficial;
		payload.locations = locations;
		payload.addenda = mapTrafficAddenda(addenda);
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

	// For non-openapi services backend fields usually live at root level.
	const { addenda: _addenda, ...restServiceFields } = serviceFields;
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

export function ContractDetailModal({ open, contractId, service, onClose, onUpdated }: Props) {
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [initialValues, setInitialValues] = useState<ContractFormValues | null>(null);
	const [resolvedService, setResolvedService] = useState<ContractServicePath | null>(null);

	const modalTitle = useMemo(() => (contractId ? "ویرایش قرارداد" : "جزئیات قرارداد"), [contractId]);

	useEffect(() => {
		if (!open || !contractId || !service)
			return;

		let cancelled = false;
		const smsFallbackService = getSmsFallbackService(service);
		const candidateServices: ContractServicePath[] = smsFallbackService ? [service, smsFallbackService] : [service];

		(async () => {
			setLoading(true);
			setInitialValues(null);
			setResolvedService(service);
			try {
				for (const candidateService of candidateServices) {
					try {
						const dto = await fetchContractDetail(candidateService, contractId);
						if (!isValidContractDetailResponse(dto, contractId))
							continue;

						if (!cancelled) {
							setResolvedService(candidateService);
							setInitialValues(dtoToFormValues(dto, candidateService));
						}
						return;
					}
					catch {
						// try the next fallback service candidate
					}
				}
			}
			finally {
				if (!cancelled)
					setLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [open, contractId, service]);

	return (
		<Modal
			open={open}
			onCancel={onClose}
			title={modalTitle}
			footer={null}
			width={1100}
			destroyOnHidden
		>
			{!contractId || !resolvedService
				? null
				: loading
					? (
						<div className="flex min-h-[240px] items-center justify-center">
							<Spin />
						</div>
					)
					: !initialValues
						? (
							<Empty description="اطلاعات قرارداد یافت نشد" />
						)
						: (
							<ContractForm
								key={`${resolvedService}-${contractId}`}
								mode="edit"
								initialValues={initialValues}
								submitText="ذخیره تغییرات"
								submitting={saving}
								onSubmit={async (values) => {
									setSaving(true);
									try {
										await fetchUpdateContract(resolvedService, contractId, formValuesToApiPayload(values));
										onUpdated?.();
										onClose();
									}
									finally {
										setSaving(false);
									}
								}}
							/>
						)}
		</Modal>
	);
}
