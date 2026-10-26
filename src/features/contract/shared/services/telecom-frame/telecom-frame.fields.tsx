import type { ArrayPath, Path } from "react-hook-form";
import type { ContractFormValues } from "../../model/contract.form.types";
import { ContractAddendaSection } from "#src/features/contract/components/addenda/ContractAddendaSection";
import { DashedCard } from "#src/shared/ui/dashed-card";
import { SectionCard } from "#src/shared/ui/section-card";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { TelecomFrameContractTypesEditor } from "./TelecomFrameContractTypesEditor";
import { TelecomFramePenaltyFields } from "./TelecomFramePenaltyFields";
import { TelecomFrameBoPersonPicker, TelecomFramePoPersonPicker } from "./TelecomFramePersonSections";
import { TelecomFrameStatusTimeline } from "./TelecomFrameStatusTimeline";

const sf = (path: string) => `serviceFields.${path}`;

/** الحاقیه فریم مخابرات فقط یک سطح زیرالحاقیه دارد (مثل old). */
const MAX_ADDENDA_DEPTH = 2;

export function TelecomFrameFields() {
	const { t } = useTranslation();
	const { control } = useFormContext<ContractFormValues>();
	const companyType = useWatch({ control, name: "companyType" });
	const startYear = useWatch({ control, name: "startYear" });
	const startMonth = useWatch({ control, name: "startMonth" });
	const endYear = useWatch({ control, name: "endYear" });
	const endMonth = useWatch({ control, name: "endMonth" });
	const showAddenda = startYear != null && startMonth != null && endYear != null && endMonth != null;

	return (
		<>
			<SectionCard title={t("contract.telecomFrame.title")} tone="blue">
				<div className="flex flex-col gap-4">
					<DashedCard variant="field" title={t("contract.telecomFrame.contractTypesTitle")}>
						<TelecomFrameContractTypesEditor name={sf("contractTypes")} />
					</DashedCard>
					<DashedCard variant="field" title={t("contract.telecomFrame.boPersons")}>
						<TelecomFrameBoPersonPicker companyType={companyType} />
					</DashedCard>
					<DashedCard variant="field" title={t("contract.telecomFrame.poPersons")}>
						<TelecomFramePoPersonPicker companyType={companyType} />
					</DashedCard>
					<DashedCard variant="field" title={t("contract.telecomFrame.penalty.enabled")}>
						<TelecomFramePenaltyFields />
					</DashedCard>
					<DashedCard variant="field" title={t("contract.telecomFrame.timeline.title")}>
						<TelecomFrameStatusTimeline />
					</DashedCard>
				</div>
			</SectionCard>

			{showAddenda
				? (
					<div className="mt-3 w-full">
						<ContractAddendaSection<ContractFormValues>
							name={sf("addenda") as ArrayPath<ContractFormValues>}
							maxDepth={MAX_ADDENDA_DEPTH}
							renderAddendumFields={base => (
								<DashedCard variant="field" title={t("contract.telecomFrame.addendumContractTypesTitle")}>
									<TelecomFrameContractTypesEditor name={`${base}.contractTypes`} />
								</DashedCard>
							)}
							contractStartYearPath={"startYear" as Path<ContractFormValues>}
							contractStartMonthPath={"startMonth" as Path<ContractFormValues>}
							contractEndYearPath={"endYear" as Path<ContractFormValues>}
							contractEndMonthPath={"endMonth" as Path<ContractFormValues>}
						/>
					</div>
				)
				: null}
		</>
	);
}
