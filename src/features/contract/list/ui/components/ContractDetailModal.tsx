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
function dtoToFormValues(dto: any): ContractFormValues {
	const serviceId = dto?.service ?? dto?.service_id ?? null;
	const companyId = dto?.company ?? dto?.company_id ?? null;

	const description = dto?.note ?? dto?.description ?? "";

	const trafficCompanyType = dto?.company_type ?? dto?.traffic_company_type ?? null;
	const counterpartyType = dto?.sms_party ?? null;

	// ساختار داده‌ها برای serviceFields
	const packageModel = dto?.package_model ?? null;

	const plans = Array.isArray(packageModel?.tiers)
		? packageModel.tiers.map((tier: any) => {
			const billRate = tier?.bill_inquiry_rate?.tiers?.[0]?.rate_per_unit ?? null;
			const smsRate = tier?.sms_sale_rate?.tiers?.[0]?.rate_per_unit ?? null;

			return {
				smsMin: tier?.sms_min_inclusive ?? null,
				smsMax: tier?.sms_max_exclusive ?? null,
				smsFixedPrice: smsRate != null ? Number(smsRate) : null,

				billMin: tier?.bill_min_inclusive ?? null,
				billMax: tier?.bill_max_exclusive ?? null,
				billFixedPrice: billRate != null ? Number(billRate) : null,

				billPartnerShare: tier?.partner_share_percent != null ? Number(tier.partner_share_percent) : null,
				billKarashabShare: tier?.karashab_share_percent ?? null,

				trafficCommissionPercent: tier?.traffic_partner_share_percent != null ? Number(tier.traffic_partner_share_percent) : null,
			};
		})
		: [];

	const serviceFields = {
		contractModel: "package", // فرض بر این است که مدل قرارداد "package" باشد
		packageMode: packageModel?.mode ?? null,
		plans: plans ?? [], // array of plans که در tiers داده است
	};

	return {
		serviceId,
		serviceCode: dto?.service_code ?? dto?.serviceCode ?? null, // serviceCode موجود است؟
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
				console.warn(dto, "DTOXXX");
				if (!cancelled)
					setInitialValues(dtoToFormValues(dto));
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
