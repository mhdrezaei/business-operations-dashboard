import type { PredictionListRow } from "../../../shared/model/prediction.list.types";
import { useQuery } from "@tanstack/react-query";
import { Modal, Result, Spin } from "antd";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { submitPrediction } from "../../../create/ui/prediction.submit";
import { predictionServiceRegistry } from "../../../shared/services/registry";
import { PredictionForm } from "../../../shared/ui/form/PredictionForm";

interface Props {
	open: boolean
	row: PredictionListRow | null
	onClose: () => void
	onUpdated?: () => void
}

export function PredictionEditModal({
	open,
	row,
	onClose,
	onUpdated,
}: Props) {
	const { t } = useTranslation();
	const [submitting, setSubmitting] = useState(false);
	const module = row ? predictionServiceRegistry[row.serviceCode] : undefined;

	const detailQuery = useQuery({
		queryKey: ["predictions", "detail", row?.serviceCode ?? null, row?.id ?? null],
		enabled: open && !!row && !!module,
		queryFn: () => module!.fetchDetail(row!.id),
		staleTime: 30 * 1000,
	});

	const initialValues = useMemo(() => {
		if (!row || !module)
			return null;

		const source = detailQuery.data ?? row.raw;
		const mapped = module.toFormValues(source);

		return {
			...mapped,
			recordId: row.id,
			serviceId: row.serviceId,
			serviceCode: row.serviceCode,
			fiscalYear: mapped.fiscalYear ?? row.fiscalYear,
		};
	}, [detailQuery.data, module, row]);

	const modalTitle = row
		? t("prediction.titles.editModal", {
			service: row.serviceLabel,
			fiscalYear: row.fiscalYear ?? "-",
		})
		: t("prediction.titles.edit");

	return (
		<Modal
			open={open}
			title={modalTitle}
			onCancel={onClose}
			footer={null}
			destroyOnClose
			width={1120}
		>
			{!row || !module
				? null
				: (
					<Spin spinning={detailQuery.isLoading}>
						{initialValues
							? (
								<PredictionForm
									mode="edit"
									titleKey="prediction.titles.editForm"
									baseFieldsDisabled
									initialValues={initialValues}
									submitting={submitting}
									onCancel={onClose}
									onSubmit={async (values) => {
										setSubmitting(true);
										try {
											await submitPrediction(values);
											window.$message?.success(t("prediction.messages.updateSuccess"));
											onUpdated?.();
											onClose();
										}
										finally {
											setSubmitting(false);
										}
									}}
								/>
							)
							: (
								<Result
									status="error"
									title={t("prediction.messages.loadDetailFailed")}
								/>
							)}
					</Spin>
				)}
		</Modal>
	);
}
