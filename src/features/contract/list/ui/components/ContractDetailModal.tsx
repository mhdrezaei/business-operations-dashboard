import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types";
import type { ContractServicePath } from "../../api/contracts.api";
import { ContractForm } from "#src/features/contract/shared/ui/form/ContractForm";

import { Modal } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { fetchContractDetail, fetchUpdateContract } from "../../api/contracts.api";

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

function normalizeOpenApiServiceFields(dto: any) {
	const details = dto?.contract_openapi_details ?? dto?.contractOpenapiDetails ?? null;

	// اگر بک‌اند هنوز جزئیات رو اینجا نفرستاده بود (سازگاری عقب‌رو)
	if (!details) {
		// از ساختار قدیمی: package_model / bill_inquiry / receipt_register
		const legacyBill = dto?.bill_inquiry ?? null;
		const legacyReceipt = dto?.receipt_register ?? null;
		const packageModel = dto?.package_model ?? null;

		// اگر package_model وجود داشت => package
		if (packageModel) {
			return {
				contractModel: "package",
				packageMode: packageModel?.mode ?? null,
				plans: (packageModel?.tiers ?? []).map((tier: any) => ({
					smsMin: tier?.sms_min_inclusive ?? null,
					smsMax: tier?.sms_max_exclusive ?? null,
					smsFixedPrice: tier?.sms_sale_rate?.tiers?.[0]?.rate_per_unit ?? null,

					billMin: tier?.bill_min_inclusive ?? null,
					billMax: tier?.bill_max_exclusive ?? null,
					billFixedPrice: tier?.bill_inquiry_rate?.tiers?.[0]?.rate_per_unit ?? null,

					billPartnerShare: tier?.partner_share_percent ?? null,
					billKarashabShare: tier?.karashab_share_percent ?? null,

					trafficCommissionPercent: tier?.traffic_partner_share_percent ?? null,
				})),
			};
		}

		// اگر legacy فیلدها وجود داشت => legacy
		if (legacyBill || legacyReceipt) {
			return {
				contractModel: "legacy",
				legacyPricing: {
					paymentRegistration: legacyReceipt ?? null,
					billInquiry: legacyBill ?? null,
				},
			};
		}

		return {};
	}

	// ✅ ساختار جدید: contract_openapi_details
	const cmRaw = details?.contract_model ?? details?.contractModel ?? null;
	const contractModel = typeof cmRaw === "string" ? cmRaw.toLowerCase() : null; // "legacy" | "package" (از LEGACY/PACKAGE)

	if (contractModel === "legacy") {
		return {
			contractModel: "legacy",
			legacyPricing: {
				paymentRegistration: details?.receipt_register ?? details?.receiptRegister ?? null,
				billInquiry: details?.bill_inquiry ?? details?.billInquiry ?? null,
			},
		};
	}

	if (contractModel === "package") {
		// اگر بک‌اند بعداً برای package مدل هم جزئیات بدهد
		const packageModel = details?.package_model ?? details?.packageModel ?? dto?.package_model ?? null;

		return {
			contractModel: "package",
			packageMode: packageModel?.mode ?? null,
			plans: (packageModel?.tiers ?? []).map((tier: any) => ({
				smsMin: tier?.sms_min_inclusive ?? null,
				smsMax: tier?.sms_max_exclusive ?? null,
				smsFixedPrice: tier?.sms_sale_rate?.tiers?.[0]?.rate_per_unit ?? null,

				billMin: tier?.bill_min_inclusive ?? null,
				billMax: tier?.bill_max_exclusive ?? null,
				billFixedPrice: tier?.bill_inquiry_rate?.tiers?.[0]?.rate_per_unit ?? null,

				billPartnerShare: tier?.partner_share_percent ?? null,
				billKarashabShare: tier?.karashab_share_percent ?? null,

				trafficCommissionPercent: tier?.traffic_partner_share_percent ?? null,
			})),
		};
	}

	return {};
}

function dtoToFormValues(dto: any, service: ContractServicePath): ContractFormValues {
	const serviceId = dto?.service_id ?? dto?.service?.id ?? dto?.service ?? null;
	const companyId = dto?.company_id ?? dto?.company?.id ?? dto?.company ?? null;

	const description = dto?.note ?? dto?.description ?? "";

	const trafficCompanyType = dto?.company_type ?? dto?.traffic_company_type ?? null;
	const counterpartyType = dto?.sms_party ?? null;

	const serviceCodeRaw = dto?.service_code ?? dto?.service?.code ?? servicePathToServiceCode(service);
	const serviceCode = typeof serviceCodeRaw === "string" ? serviceCodeRaw.trim().toLowerCase() : null;

	// ✅ هر چیزی که مربوط به سرویس هست باید بره زیر serviceFields با نام‌هایی که فرم انتظار داره
	let serviceFields: any = {};

	// openapi
	if (serviceCode === "openapi") {
		serviceFields = {
			...normalizeOpenApiServiceFields(dto),
			addenda: dto?.addenda ?? [],
		};
	}
	else {
		// سایر سرویس‌ها: هر فیلدی غیر از پایه‌ها را نگه می‌داریم داخل serviceFields
		const {
			id,
			company,
			company_id,
			service,
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

		startYear: dto?.start_jy ?? null,
		startMonth: dto?.start_jm ?? null,
		endYear: dto?.end_jy ?? null,
		endMonth: dto?.end_jm ?? null,

		description,
		documents: dto?.documents ?? [],
		serviceFields,
	};
}

export function ContractDetailModal({ open, contractId, service, onClose, onUpdated }: Props) {
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [initialValues, setInitialValues] = useState<ContractFormValues | null>(null);

	const modalTitle = useMemo(() => (contractId ? "ویرایش قرارداد" : "جزئیات قرارداد"), [contractId]);

	useEffect(() => {
		if (!open || !contractId || !service)
			return;

		let cancelled = false;

		(async () => {
			setLoading(true);
			try {
				const dto = await fetchContractDetail(service, contractId);
				console.warn(dto, "dddddddddddd");
				if (!cancelled)
					setInitialValues(dtoToFormValues(dto, service));
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
			{!contractId || !service || loading || !initialValues
				? null
				: (
					<ContractForm
						key={`${service}-${contractId}`}
						initialValues={initialValues}
						submitText="ذخیره تغییرات"
						submitting={saving}
						onSubmit={async (values) => {
							setSaving(true);
							try {
								await fetchUpdateContract(service, contractId, values);
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
