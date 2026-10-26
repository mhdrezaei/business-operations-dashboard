import type { ContractFormValues } from "../../../shared/model/contract.form.types";
import { RHFProNumber, RHFSelect } from "#src/shared/ui/rhf-pro";
import { SectionCard } from "#src/shared/ui/section-card";
import { Button } from "antd";
import React from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { usePartnerShareSync } from "./openapi.share-sync";

const MODE_OPTIONS = [{ label: "OR", value: "OR" }, { label: "AND", value: "AND" }];

const emptyPlan = {
	smsMin: null,
	smsMax: null,
	smsFixedPrice: null,
	billMin: null,
	billMax: null,
	billFixedPrice: null,
	billPartnerShare: null,
	billKarashabShare: null,
	trafficProfitPercent: null,
	trafficPartnerSharePercent: null,
};

interface PlanFieldsProps {
	plansPath: string
	index: number
	canRemove: boolean
	onRemove: () => void
}

function PackagePlanFields({ plansPath, index, canRemove, onRemove }: PlanFieldsProps) {
	const { t } = useTranslation();
	const { control, setValue } = useFormContext<ContractFormValues>();
	const field = (key: string) => `${plansPath}.${index}.${key}` as any;
	const previousPath = (key: string) => `${plansPath}.${index - 1}.${key}` as any;
	const previousSmsMax = useWatch({ control, name: previousPath("smsMax"), disabled: index === 0 });
	const previousBillMax = useWatch({ control, name: previousPath("billMax"), disabled: index === 0 });
	usePartnerShareSync(field("billPartnerShare"), field("billKarashabShare"));

	// حداقل هر پلن همیشه برابر حداکثر پلن قبلی است (مثل old)
	const mounted = React.useRef(false);
	React.useEffect(() => {
		// مقدار بارگذاری‌شده با اولین رندر دست نمی‌خورد؛ فقط تغییر حداکثر پلن قبلی منتقل می‌شود
		if (!mounted.current) {
			mounted.current = true;
			return;
		}
		if (index === 0)
			return;
		setValue(field("smsMin"), previousSmsMax ?? null, { shouldValidate: true });
		setValue(field("billMin"), previousBillMax ?? null, { shouldValidate: true });
	}, [index, previousSmsMax, previousBillMax]);

	const percentProps = { addonAfter: "%", placeholder: t("contract.salesAgency.percentPlaceholder") } as any;
	const lockedMin = index > 0;

	return (
		<SectionCard
			title={t("contract.openapi.package.plan", { index: index + 1 })}
			tone="purple"
			className="mb-3"
			extra={canRemove ? <Button size="small" danger onClick={onRemove}>{t("contract.openapi.package.remove")}</Button> : undefined}
		>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<RHFProNumber name={field("smsMin")} label={t("contract.openapi.package.smsMin")} inputProps={{ readOnly: lockedMin } as any} />
				<RHFProNumber name={field("smsMax")} label={t("contract.openapi.package.smsMax")} />
				<RHFProNumber name={field("smsFixedPrice")} label={t("contract.openapi.package.smsRate")} />
				<RHFProNumber name={field("billMin")} label={t("contract.openapi.package.billMin")} inputProps={{ readOnly: lockedMin } as any} />
				<RHFProNumber name={field("billMax")} label={t("contract.openapi.package.billMax")} />
				<RHFProNumber name={field("billFixedPrice")} label={t("contract.openapi.package.billRate")} />
				<RHFProNumber name={field("billPartnerShare")} label={t("contract.openapi.package.partnerShare")} inputProps={percentProps} />
				<RHFProNumber name={field("billKarashabShare")} label={t("contract.openapi.package.karashabShare")} inputProps={{ addonAfter: "%", readOnly: true } as any} />
				<div className="hidden md:block" />
				<RHFProNumber name={field("trafficProfitPercent")} label={t("contract.openapi.package.trafficProfit")} inputProps={percentProps} />
				<RHFProNumber name={field("trafficPartnerSharePercent")} label={t("contract.openapi.package.trafficPartnerShare")} inputProps={percentProps} />
			</div>
		</SectionCard>
	);
}

/** پلن‌های قرارداد «بسته»: حالت OR/AND و چند پلن پیامک/استعلام قبض/ترافیک؛ برای قرارداد اصلی (`serviceFields`) و هر الحاقیه. */
export function OpenApiPackagePlansFields({ basePath = "serviceFields" }: { basePath?: string }) {
	const { t } = useTranslation();
	const { control, getValues, setValue } = useFormContext<ContractFormValues>();
	const plansPath = `${basePath}.plans`;
	const modePath = `${basePath}.packageMode`;
	const { fields, append, remove } = useFieldArray({ control, name: plansPath as any });

	React.useEffect(() => {
		if (fields.length === 0)
			append(structuredClone(emptyPlan), { shouldFocus: false });
	}, [fields.length, append]);

	React.useEffect(() => {
		if (!getValues(modePath as any))
			setValue(modePath as any, "OR" as any, { shouldDirty: false, shouldValidate: false });
	}, [modePath, getValues, setValue]);

	return (
		<div className="w-full">
			<SectionCard title={t("contract.openapi.package.mode")} tone="purple" className="mb-3">
				<div className="w-full max-w-[420px]">
					<RHFSelect name={modePath as any} label="" options={MODE_OPTIONS} selectProps={{ allowClear: false }} />
				</div>
			</SectionCard>
			{fields.map((item, index) => (
				<PackagePlanFields key={item.id} plansPath={plansPath} index={index} canRemove={fields.length > 1} onRemove={() => remove(index)} />
			))}
			<Button
				onClick={() => {
					// حداقل پلن جدید همان حداکثر پلن قبلی است (مثل old)
					const plans = (getValues(plansPath as any) ?? []) as Array<typeof emptyPlan>;
					const last = plans[plans.length - 1];
					append({ ...emptyPlan, smsMin: last?.smsMax ?? null, billMin: last?.billMax ?? null });
				}}
			>
				{t("contract.openapi.package.add")}
			</Button>
		</div>
	);
}
