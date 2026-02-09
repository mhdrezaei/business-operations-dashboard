// import type { ContractFormValues } from "#src/features/contract/shared//model/contract.form.types";
// ✅ این import را مطابق ساختار واقعی خودت تنظیم کن
// اگر هنوز جدا نکردی:
import { ContractForm } from "#src/features/contract/shared/ui/form/ContractForm";
import { Modal } from "antd";

// import React, { useEffect, useMemo, useState } from "react";

// import { fetchContractDetail, fetchUpdateContract } from "../../api/contracts.api";
// پیشنهاد بهتر: import { ContractFormRoot } from "#src/features/contract/shared/ui/form/ContractFormRoot";

interface Props {
	open: boolean
	contractId: number | null
	onClose: () => void
	onUpdated?: () => void // برای reload جدول
}

/**
 * تبدیل DTO به ContractFormValues
 * اینجا چون DTO دقیق جزئیات را ندادی، فقط اسکلت گذاشتم.
 * وقتی DTO واقعی را فرستادی، دقیقش می‌کنم.
 */
// function dtoToFormValues(dto: any): ContractFormValues {
// 	return {
// 		serviceId: dto.service_id ?? null,
// 		serviceCode: dto.service_code ?? null,
// 		companyId: dto.company_id ?? null,
// 		trafficCompanyType: dto.traffic_company_type ?? null,
// 		counterpartyType: dto.sms_party ?? null,

// 		startYear: dto.start_jy ?? null,
// 		startMonth: dto.start_jm ?? null,
// 		endYear: dto.end_jy ?? null,
// 		endMonth: dto.end_jm ?? null,

// 		description: dto.description ?? "",
// 		documents: dto.documents ?? [],
// 		serviceFields: dto.service_fields ?? {},
// 	};
// }

export function ContractDetailModal({ open, contractId, onClose }: Props) {
	// const [loading, setLoading] = useState(false);
	// const [initialValues, setInitialValues] = useState<ContractFormValues | null>(null);

	// const modalTitle = useMemo(() => (contractId ? "ویرایش قرارداد" : "جزئیات قرارداد"), [contractId]);

	// useEffect(() => {
	// 	if (!open || !contractId)
	// 		return;

	// 	(async () => {
	// 		setLoading(true);
	// 		try {
	// 			const dto = await fetchContractDetail(contractId);
	// 			setInitialValues(dtoToFormValues(dto));
	// 		}
	// 		finally {
	// 			setLoading(false);
	// 		}
	// 	})();
	// }, [open, contractId]);

	return (
		<Modal
			open={open}
			onCancel={onClose}
			// title={modalTitle}
			footer={null}
			width={1000}
			destroyOnClose
		>
			{!contractId
				? null
				: (
					<>
						{/* ✅ مهم: key برای جلوگیری از تداخل فرم‌ها */}
						<ContractForm
							key={contractId}
						/* اگر ContractForm شما هنوز props ندارد،
						   همینجا بعداً تبدیلش می‌کنیم به ContractFormRoot که initialValues و onSubmit بگیرد.
						*/
						/>
					</>
				)}
		</Modal>
	);
}
