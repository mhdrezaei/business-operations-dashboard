import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types";
import type { TelecomFrameContractType, TelecomFrameContractTypeRow } from "./telecom-frame.types";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { TELECOM_FRAME_CONTRACT_TYPES } from "./telecom-frame.types";

interface Props {
	/** مسیر آرایه `contractTypes` (قرارداد اصلی یا یک الحاقیه). */
	name: string
}

/** انواع قرارداد با درآمد و نفر ساعت؛ هم برای قرارداد اصلی و هم برای هر الحاقیه. */
export function TelecomFrameContractTypesEditor({ name }: Props) {
	const { t } = useTranslation();
	const { control, setValue } = useFormContext<ContractFormValues>();
	const watched = useWatch({ control, name: name as any }) as TelecomFrameContractTypeRow[] | undefined;
	const rows = Array.isArray(watched) ? watched : [];
	const usedTypes = new Set(rows.map(row => row.contractType));

	const update = (next: TelecomFrameContractTypeRow[]) =>
		setValue(name as any, next as any, { shouldDirty: true, shouldValidate: true });
	const addRow = (contractType: TelecomFrameContractType) =>
		update([...rows, { contractType, revenue: null, manHours: null }]);
	const removeRow = (contractType: TelecomFrameContractType) =>
		update(rows.filter(row => row.contractType !== contractType));

	return (
		<div className="flex flex-col gap-3">
			{rows.length === 0
				? <div className="opacity-75">{t("contract.telecomFrame.contractTypesEmpty")}</div>
				: rows.map((row, index) => (
					<div key={row.contractType} className="grid grid-cols-1 items-start gap-3 md:grid-cols-[8rem_1fr_1fr_auto]">
						<div className="pt-1 font-medium">{t(`contract.telecomFrame.contractTypes.${row.contractType}`)}</div>
						<RHFProNumber<ContractFormValues, any>
							name={`${name}.${index}.revenue` as any}
							label=""
							enableGrouping
							inputProps={{ placeholder: t("contract.telecomFrame.revenuePlaceholder"), addonAfter: t("contract.telecomFrame.revenue") }}
							formItemProps={{ className: "contract-type-currency-field mb-0" }}
						/>
						<RHFProNumber<ContractFormValues, any>
							name={`${name}.${index}.manHours` as any}
							label=""
							inputProps={{ placeholder: t("contract.telecomFrame.manHours") }}
							formItemProps={{ className: "mb-0" }}
						/>
						<Button
							type="text"
							danger
							className="contract-tier-delete-button"
							icon={<DeleteOutlined />}
							aria-label={t("common.delete")}
							onClick={() => removeRow(row.contractType)}
						/>
					</div>
				))}
			<div className="flex flex-wrap gap-2">
				{TELECOM_FRAME_CONTRACT_TYPES.filter(type => !usedTypes.has(type)).map(type => (
					<Button key={type} className="contract-dashed-action" icon={<PlusOutlined />} onClick={() => addRow(type)}>
						{t(`contract.telecomFrame.contractTypes.${type}`)}
					</Button>
				))}
			</div>
		</div>
	);
}
