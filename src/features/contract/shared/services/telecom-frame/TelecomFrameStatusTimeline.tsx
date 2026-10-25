import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types";
import type { TelecomFrameStatusRow } from "./telecom-frame.types";
import { RHFProDate, RHFProText, RHFSelect } from "#src/shared/ui/rhf-pro";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { createEmptyTelecomFrameStatusRow, TELECOM_FRAME_STATUSES } from "./telecom-frame.types";

const NAME = "serviceFields.statusTimeline";

export function TelecomFrameStatusTimeline() {
	const { t } = useTranslation();
	const { control, setValue } = useFormContext<ContractFormValues>();
	const watched = useWatch({ control, name: NAME as any }) as TelecomFrameStatusRow[] | undefined;
	const rows = Array.isArray(watched) ? watched : [];
	const statusOptions = useMemo(
		() => TELECOM_FRAME_STATUSES.map(status => ({ label: t(`contract.telecomFrame.statuses.${status}`), value: status })),
		[t],
	);
	const update = (next: TelecomFrameStatusRow[]) =>
		setValue(NAME as any, next as any, { shouldDirty: true, shouldValidate: true });

	return (
		<div className="flex flex-col gap-3">
			{rows.length === 0
				? <div className="opacity-75">{t("contract.telecomFrame.timeline.empty")}</div>
				: rows.map((row, index) => (
					// ردیف‌ها شناسهٔ پایدار ندارند؛ حذف با فیلتر روی index انجام می‌شود
					// eslint-disable-next-line react/no-array-index-key
					<div key={index} className="grid grid-cols-1 items-start gap-3 md:grid-cols-[1fr_1fr_1fr_2fr_auto]">
						<RHFSelect<ContractFormValues, any>
							name={`${NAME}.${index}.status` as any}
							label={t("contract.telecomFrame.timeline.status")}
							options={statusOptions}
							formItemProps={{ className: "mb-0" }}
						/>
						<RHFProDate<ContractFormValues, any>
							name={`${NAME}.${index}.startDate` as any}
							label={t("contract.telecomFrame.timeline.startDate")}
							itemProps={{ className: "mb-0" }}
						/>
						<RHFProDate<ContractFormValues, any>
							name={`${NAME}.${index}.endDateExclusive` as any}
							label={t("contract.telecomFrame.timeline.endDate")}
							itemProps={{ className: "mb-0" }}
						/>
						<RHFProText<ContractFormValues, any>
							name={`${NAME}.${index}.note` as any}
							label={t("contract.telecomFrame.timeline.note")}
							formItemProps={{ className: "mb-0" }}
						/>
						<Button
							type="text"
							danger
							className="contract-tier-delete-button md:mt-[30px]"
							icon={<DeleteOutlined />}
							aria-label={t("common.delete")}
							onClick={() => update(rows.filter((_, rowIndex) => rowIndex !== index))}
						/>
					</div>
				))}
			<div>
				<Button
					className="contract-dashed-action"
					icon={<PlusOutlined />}
					onClick={() => update([...rows, createEmptyTelecomFrameStatusRow()])}
				>
					{t("contract.telecomFrame.timeline.add")}
				</Button>
			</div>
		</div>
	);
}
