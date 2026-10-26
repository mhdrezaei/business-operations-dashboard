import type { ContractFormValues } from "../../../model/contract.form.types";
import { RHFProNumber, RHFSelect } from "#src/shared/ui/rhf-pro";
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { DEFAULT_TELECOM_UNITS_PER_RACK } from "../../../services/traffic/traffic.collocation";
import { useCollocationSlaOptions } from "../../../services/traffic/use-collocation-sla-options";
import { CollocationDatacentersField } from "./CollocationDatacentersField";

const compactFormItemStyle = { className: "mb-0" };

interface TelecomRackCostFieldsProps {
	/** مسیر والد فیلدها (قرارداد اصلی: serviceFields، الحاقیه: مسیر همان الحاقیه) */
	basePath: string
}

/** هزینه رک‌های قرارداد شرکت مخابرات ایران؛ هم برای قرارداد اصلی و هم برای هر الحاقیه. */
export function TelecomRackCostFields({ basePath }: TelecomRackCostFieldsProps) {
	const { t } = useTranslation();
	const { getValues, setValue } = useFormContext<ContractFormValues>();
	const unitsPath = `${basePath}.telecomUnitsPerRack`;

	useEffect(() => {
		if (getValues(unitsPath as any) == null)
			setValue(unitsPath as any, DEFAULT_TELECOM_UNITS_PER_RACK as any, { shouldDirty: false, shouldValidate: false });
	}, [getValues, setValue, unitsPath]);

	return (
		<div className="aligned-form-grid aligned-form-grid--two">
			<RHFProNumber<ContractFormValues, any>
				name={`${basePath}.telecomRackCount` as any}
				label={t("contract.collocation.telecom.rackCount")}
				formItemProps={compactFormItemStyle}
				enableGrouping
			/>
			<RHFProNumber<ContractFormValues, any>
				name={`${basePath}.telecomUnitsPerRack` as any}
				label={t("contract.collocation.telecom.unitsPerRack")}
				formItemProps={compactFormItemStyle}
				enableGrouping
			/>
			<RHFProNumber<ContractFormValues, any>
				name={`${basePath}.telecomMonthlyRackRent` as any}
				label={t("contract.collocation.telecom.monthlyRent")}
				formItemProps={compactFormItemStyle}
				enableGrouping
				enableWordsTooltip
			/>
		</div>
	);
}

interface CollocationAddendumFieldsProps {
	base: string
	isTelecom: boolean
	partnerType: string | null | undefined
}

/** الحاقیه کولوکیشن: هزینه رک مخابرات، یا SLA + دیتاسنترها برای شرکای تجاری (مثل old). */
export function CollocationAddendumFields({ base, isTelecom, partnerType }: CollocationAddendumFieldsProps) {
	const { t } = useTranslation();
	const slaOptions = useCollocationSlaOptions();

	if (isTelecom)
		return <TelecomRackCostFields basePath={base} />;

	return (
		<div className="flex w-full flex-col gap-4">
			<div className="w-full max-w-[420px]">
				<RHFSelect<ContractFormValues, any, string | null>
					name={`${base}.sla` as any}
					label="SLA"
					options={slaOptions}
					selectProps={{ allowClear: true, placeholder: t("contract.collocation.slaPlaceholder") }}
				/>
			</div>
			<CollocationDatacentersField name={`${base}.datacenters`} selectName={`${base}.datacenter`} partnerType={partnerType} />
		</div>
	);
}
