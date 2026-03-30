import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types";
import type { ContractServicePath } from "../../../api/contracts.api";
import { apiPricingToContractType, contractTypeToApiPricing } from "#src/features/contract/api/pricing.mapper";
import { ContractForm } from "#src/features/contract/shared/ui/form/ContractForm";
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

					trafficCommissionPercent: toNumberOrStringNumber(tier?.traffic_partner_share_percent),
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

				trafficCommissionPercent: toNumberOrStringNumber(tier?.traffic_partner_share_percent),
			})),
		};
	}

	return {};
}

function dtoToFormValues(dto: any, service: ContractServicePath): ContractFormValues {
	const serviceId = toNumberOrNull(dto?.service_id ?? dto?.service?.id ?? dto?.service);
	const companyId = toNumberOrNull(dto?.company_id ?? dto?.company?.id ?? dto?.company);

	const description = dto?.note ?? dto?.description ?? "";

	const trafficCompanyType = dto?.company_type ?? dto?.traffic_company_type ?? null;
	const counterpartyType = dto?.sms_party ?? null;

	const serviceCodeRaw = dto?.service_code ?? dto?.service?.code ?? servicePathToServiceCode(service);
	const serviceCode = typeof serviceCodeRaw === "string" ? serviceCodeRaw.trim().toLowerCase() : null;

	let serviceFields: any = {};

	if (serviceCode === "openapi" || serviceCode === "commercial") {
		serviceFields = {
			...normalizeOpenApiServiceFields(dto),
			addenda: dto?.addenda ?? [],
		};
	}
	else {
		// ✅ سایر سرویس‌ها: هر فیلدی غیر از پایه‌ها => serviceFields
		const {
			id,
			company,
			company_id,
			service: _service,
			service_id,
			start_jy,
			start_jm,
			end_jy,
			end_jm,
			start_date,
			end_date_exclusive,
			active_period,
			created_at,
			updated_at,
			note,
			description: _desc,
			addenda,
			...rest
		} = dto ?? {};

		serviceFields = {
			...(rest ?? {}),
			addenda: dto?.addenda ?? [],
		};
	}

	return {
		serviceId,
		serviceCode: serviceCode as any,
		companyId,
		trafficCompanyType,
		counterpartyType,

		startYear: toNumberOrNull(dto?.start_jy),
		startMonth: toNumberOrNull(dto?.start_jm),
		endYear: toNumberOrNull(dto?.end_jy),
		endMonth: toNumberOrNull(dto?.end_jm),

		description,
		documents: dto?.documents ?? [],
		serviceFields,
	};
}

function formValuesToApiPayload(values: ContractFormValues) {
	const serviceCode = typeof values.serviceCode === "string" ? values.serviceCode.trim().toLowerCase() : "";
	const serviceFields = (values.serviceFields ?? {}) as Record<string, any>;

	const payload: Record<string, any> = {
		service: values.serviceId ?? null,
		company: values.companyId ?? null,
		start_jy: values.startYear ?? null,
		start_jm: values.startMonth ?? null,
		end_jy: values.endYear ?? null,
		end_jm: values.endMonth ?? null,
		note: values.description ?? "",
		addenda: Array.isArray(serviceFields.addenda) ? serviceFields.addenda : [],
	};

	if (values.trafficCompanyType != null)
		payload.company_type = values.trafficCompanyType;
	if (values.counterpartyType != null)
		payload.sms_party = values.counterpartyType;

	if (serviceCode === "openapi" || serviceCode === "commercial") {
		const contractModel = typeof serviceFields.contractModel === "string"
			? serviceFields.contractModel.trim().toLowerCase()
			: null;

		if (contractModel === "package") {
			const plans = Array.isArray(serviceFields.plans) ? serviceFields.plans : [];
			payload.contract_openapi_details = {
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
		else if (contractModel === "legacy") {
			payload.contract_openapi_details = {
				contract_model: "LEGACY",
				receipt_register: contractTypeToApiPricing(serviceFields.legacyPricing?.paymentRegistration ?? null),
				bill_inquiry: contractTypeToApiPricing(serviceFields.legacyPricing?.billInquiry ?? null),
			};
		}
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
			width={1000}
			destroyOnClose
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
