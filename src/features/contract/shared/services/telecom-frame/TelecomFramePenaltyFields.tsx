import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types";
import { RHFProCheckbox, RHFProNumber } from "#src/shared/ui/rhf-pro";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function TelecomFramePenaltyFields() {
	const { t } = useTranslation();
	const { control } = useFormContext<ContractFormValues>();
	const hasPenalty = useWatch({ control, name: "serviceFields.hasPenalty" as any });

	return (
		<div className="flex flex-col gap-3">
			<RHFProCheckbox<ContractFormValues, any>
				name="serviceFields.hasPenalty"
				checkboxLabel={t("contract.telecomFrame.penalty.enabled")}
				itemProps={{ className: "mb-0" }}
			/>
			{hasPenalty
				? (
					<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
						<RHFProNumber<ContractFormValues, any>
							name="serviceFields.penalty.initialGraceDays"
							label={t("contract.telecomFrame.penalty.initialGraceDays")}
							formItemProps={{ className: "mb-0" }}
						/>
						<RHFProNumber<ContractFormValues, any>
							name="serviceFields.penalty.toleranceDays"
							label={t("contract.telecomFrame.penalty.toleranceDays")}
							formItemProps={{ className: "mb-0" }}
						/>
						<RHFProNumber<ContractFormValues, any>
							name="serviceFields.penalty.penaltyPercent"
							label={t("contract.telecomFrame.penalty.penaltyPercent")}
							decimal
							formItemProps={{ className: "mb-0" }}
						/>
					</div>
				)
				: null}
		</div>
	);
}
