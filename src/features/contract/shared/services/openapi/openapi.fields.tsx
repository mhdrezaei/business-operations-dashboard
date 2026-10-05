import type { ArrayPath, Path } from "react-hook-form";
import type { ContractFormValues } from "../../../shared/model/contract.form.types";
import type { OpenApiContractModel } from "./openapi.types";
import { ContractAddendaSection } from "#src/features/contract/components/addenda/ContractAddendaSection.js";
import { AlignedFormField, useAlignedLabelWidth } from "#src/shared/ui/aligned-form-field";
import { RHFProText, RHFSelect } from "#src/shared/ui/rhf-pro";
import { RHFProNumber } from "#src/shared/ui/rhf-pro/fields/RHFProNumber.js";
import { SectionCard } from "#src/shared/ui/section-card";
import { DeleteOutlined } from "@ant-design/icons";
import { Button, Card } from "antd";
import React, { useMemo, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { ContractTypeSection } from "../../../components/contract-type/ContractTypeSection";
import { defaultLegacyPricing, defaultOpenApiPlan, defaultSeparatedPricing } from "./openapi.types";
import "./openapi.fields.css";

const sf = (path: string) => `serviceFields.${path}` as any;

function SeparatedPricingFields() {
	return (
		<div className="flex w-full flex-col">
			<RHFProNumber
				name={sf("separatedPricing.walletChargeDiscountPercent")}
				label="درصد تخفیف شارژ کیف‌پول"
				inputProps={{ addonAfter: "%", placeholder: "مثلاً 20" } as any}
			/>
			<ContractTypeSection title="استعلام قبض میان‌دوره" name={sf("separatedPricing.midPeriodBillInquiry")} tone="purple" />
			<ContractTypeSection title="استعلام قبض پایان‌دوره" name={sf("separatedPricing.endPeriodBillInquiry")} tone="purple" />
			<ContractTypeSection title="ثبت وصولی متصل" name={sf("separatedPricing.connectedReceiptRegister")} tone="purple" />
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<RHFProNumber name={sf("separatedPricing.connectedKarashabSharePercent")} label="درصد سهم کاراشاب" inputProps={{ addonAfter: "%", placeholder: "مثلاً 20" } as any} />
				<RHFProNumber name={sf("separatedPricing.connectedPartnerSharePercent")} label="درصد سهم طرف قرارداد" inputProps={{ addonAfter: "%", placeholder: "مثلاً 20" } as any} />
			</div>
			<ContractTypeSection title="ثبت وصولی غیرمتصل" name={sf("separatedPricing.disconnectedReceiptRegister")} tone="purple" />
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<RHFProNumber name={sf("separatedPricing.disconnectedKarashabSharePercent")} label="درصد سهم کاراشاب" inputProps={{ addonAfter: "%", placeholder: "مثلاً 20" } as any} />
				<RHFProNumber name={sf("separatedPricing.disconnectedPartnerSharePercent")} label="درصد سهم طرف قرارداد" inputProps={{ addonAfter: "%", placeholder: "مثلاً 20" } as any} />
			</div>
		</div>
	);
}

function OpenApiPackagePlanPanel({ idx }: { idx: number }) {
	const smsLabelStyle = useAlignedLabelWidth(["حداقل پیامک", "حداکثر پیامک", "نرخ فروش پیامک"]);
	const billLabelStyle = useAlignedLabelWidth([
		"سهم شریک",
		"سهم کاراشاب",
		"حداقل استعلام قبض",
		"حداکثر استعلام قبض",
		"نرخ استعلام قبض",
	]);
	const trafficLabelStyle = useAlignedLabelWidth(["درصد سود ترافیک", "درصد سهم شریک ترافیک"]);
	const compactFormItemStyle = { className: "mb-0" };

	return (
		<div className="openapi-plan-grid">
			<Card
				title="بخش پیامک"
				bordered
				className="openapi-plan-card [&_.ant-pro-card-body]:p-3"
			>
				<div className="openapi-plan-fields" style={smsLabelStyle}>
					<AlignedFormField label="حداقل پیامک" labelId={`openapi-plan-${idx}-sms-min`}>
						<RHFProNumber
							name={sf(`plans.${idx}.smsMin`)}
							formItemProps={compactFormItemStyle}
							enableGrouping
							enableWordsTooltip
							inputProps={{
								"placeholder": "مثلاً 0",
								"disabled": idx > 0,
								"aria-labelledby": `openapi-plan-${idx}-sms-min`,
							} as any}
						/>
					</AlignedFormField>

					<AlignedFormField label="حداکثر پیامک" labelId={`openapi-plan-${idx}-sms-max`}>
						<RHFProNumber
							name={sf(`plans.${idx}.smsMax`)}
							formItemProps={compactFormItemStyle}
							enableGrouping
							enableWordsTooltip
							inputProps={{
								"placeholder": "مثلاً 200000000",
								"aria-labelledby": `openapi-plan-${idx}-sms-max`,
							} as any}
						/>
					</AlignedFormField>

					<AlignedFormField label="نرخ فروش پیامک" labelId={`openapi-plan-${idx}-sms-rate`}>
						<RHFProNumber
							name={sf(`plans.${idx}.smsFixedPrice`)}
							formItemProps={compactFormItemStyle}
							enableGrouping
							enableWordsTooltip
							inputProps={{
								"placeholder": "مثلاً 120",
								"addonAfter": "تومان",
								"aria-labelledby": `openapi-plan-${idx}-sms-rate`,
							} as any}
						/>
					</AlignedFormField>
				</div>
			</Card>

			<Card
				title="بخش استعلام قبض"
				bordered
				className="openapi-plan-card [&_.ant-pro-card-body]:p-3"
			>
				<div className="openapi-plan-fields" style={billLabelStyle}>
					<AlignedFormField label="سهم شریک" labelId={`openapi-plan-${idx}-bill-partner-share`}>
						<RHFProNumber
							name={sf(`plans.${idx}.billPartnerShare`)}
							formItemProps={compactFormItemStyle}
							inputProps={{
								"placeholder": "مثلاً 40",
								"addonAfter": "%",
								"aria-labelledby": `openapi-plan-${idx}-bill-partner-share`,
							} as any}
						/>
					</AlignedFormField>

					<AlignedFormField label="سهم کاراشاب" labelId={`openapi-plan-${idx}-bill-karashab-share`}>
						<RHFProText
							name={sf(`plans.${idx}.billKarashabShare`)}
							formItemProps={compactFormItemStyle}
							inputProps={{
								"placeholder": "مثلاً 60",
								"inputMode": "numeric",
								"addonAfter": "%",
								"aria-labelledby": `openapi-plan-${idx}-bill-karashab-share`,
							} as any}
						/>
					</AlignedFormField>

					<AlignedFormField label="حداقل استعلام قبض" labelId={`openapi-plan-${idx}-bill-min`}>
						<RHFProNumber
							name={sf(`plans.${idx}.billMin`)}
							formItemProps={compactFormItemStyle}
							enableGrouping
							enableWordsTooltip
							inputProps={{
								"placeholder": "مثلاً 0",
								"disabled": idx > 0,
								"aria-labelledby": `openapi-plan-${idx}-bill-min`,
							} as any}
						/>
					</AlignedFormField>

					<AlignedFormField label="حداکثر استعلام قبض" labelId={`openapi-plan-${idx}-bill-max`}>
						<RHFProNumber
							name={sf(`plans.${idx}.billMax`)}
							formItemProps={compactFormItemStyle}
							enableGrouping
							enableWordsTooltip
							inputProps={{
								"placeholder": "مثلاً 2000000",
								"aria-labelledby": `openapi-plan-${idx}-bill-max`,
							} as any}
						/>
					</AlignedFormField>

					<AlignedFormField label="نرخ استعلام قبض" labelId={`openapi-plan-${idx}-bill-rate`}>
						<RHFProNumber
							name={sf(`plans.${idx}.billFixedPrice`)}
							formItemProps={compactFormItemStyle}
							enableGrouping
							enableWordsTooltip
							inputProps={{
								"placeholder": "مثلاً 120",
								"addonAfter": "تومان",
								"aria-labelledby": `openapi-plan-${idx}-bill-rate`,
							} as any}
						/>
					</AlignedFormField>
				</div>
			</Card>

			<Card
				title="سهم ترافیک"
				bordered
				className="openapi-plan-card [&_.ant-pro-card-body]:p-3"
			>
				<div className="openapi-plan-fields" style={trafficLabelStyle}>
					<AlignedFormField label="درصد سود ترافیک" labelId={`openapi-plan-${idx}-traffic-profit`}>
						<RHFProNumber
							name={sf(`plans.${idx}.trafficProfitPercent`)}
							formItemProps={compactFormItemStyle}
							inputProps={{
								"placeholder": "مثلاً 6",
								"addonAfter": "%",
								"aria-labelledby": `openapi-plan-${idx}-traffic-profit`,
							} as any}
						/>
					</AlignedFormField>

					<AlignedFormField label="درصد سهم شریک ترافیک" labelId={`openapi-plan-${idx}-traffic-partner-share`}>
						<RHFProNumber
							name={sf(`plans.${idx}.trafficPartnerSharePercent`)}
							formItemProps={compactFormItemStyle}
							inputProps={{
								"placeholder": "مثلاً 4",
								"addonAfter": "%",
								"aria-labelledby": `openapi-plan-${idx}-traffic-partner-share`,
							} as any}
						/>
					</AlignedFormField>
				</div>
			</Card>
		</div>
	);
}

export function OpenApiFields({ mode = "create" }: { mode?: "create" | "edit" }) {
	const { control, setValue, getValues, register } = useFormContext<ContractFormValues>();
	const startYear = useWatch({ control, name: "startYear" });
	const startMonth = useWatch({ control, name: "startMonth" });
	const endYear = useWatch({ control, name: "endYear" });
	const endMonth = useWatch({ control, name: "endMonth" });
	const showAddenda = useMemo(
		() => startYear != null && startMonth != null && endYear != null && endMonth != null,
		[startYear, startMonth, endYear, endMonth],
	);

	const { fields, append, remove } = useFieldArray({
		control,
		name: sf("plans"),
	});
	const plans = useWatch({ control, name: sf("plans") }) as Array<{
		smsMin: number | null
		smsMax: number | null
		billMin: number | null
		billMax: number | null
		billPartnerShare: number | null
		billKarashabShare: number | null
		trafficProfitPercent: number | null
		trafficPartnerSharePercent: number | null
	}> | undefined;
	const previousSharesRef = React.useRef<Array<{
		billPartnerShare: number | null
		billKarashabShare: number | null
	}>>([]);
	const previousTrafficSharesRef = React.useRef<Array<{
		trafficProfitPercent: number | null
		trafficPartnerSharePercent: number | null
	}>>([]);
	const [_activeKey, setActiveKey] = useState<string>("0");

	const contractModel = useWatch({ control, name: sf("contractModel") }) as OpenApiContractModel | null;

	React.useEffect(() => {
		register(sf("contractModel"));
		if (!getValues(sf("contractModel"))) {
			setValue(sf("contractModel"), "legacy" as any, {
				shouldDirty: false,
				shouldTouch: false,
				shouldValidate: false,
			});
		}
		setValue(sf("packageMode"), null as any, {
			shouldDirty: false,
			shouldTouch: false,
			shouldValidate: false,
		});
	}, [register, setValue]);

	React.useEffect(() => {
		if (contractModel === "legacy") {
			const current = getValues(sf("legacyPricing"));
			if (!current) {
				setValue(sf("legacyPricing"), structuredClone(defaultLegacyPricing) as any, {
					shouldDirty: true,
					shouldValidate: true,
				});
			}
			setValue(sf("packageMode"), null as any, { shouldDirty: true, shouldValidate: true });
		}
		else if (contractModel === "separated") {
			setValue(sf("legacyPricing"), undefined as any, {
				shouldDirty: true,
				shouldValidate: true,
			});
			if (!getValues(sf("separatedPricing"))) {
				setValue(sf("separatedPricing"), structuredClone(defaultSeparatedPricing) as any, {
					shouldDirty: false,
					shouldValidate: false,
				});
			}
		}
	}, [contractModel, setValue, getValues]);

	React.useEffect(() => {
		if (contractModel !== "separated")
			return;
		if (fields.length > 0)
			return;

		append(structuredClone(defaultOpenApiPlan) as any);
	}, [contractModel, fields.length, append]);

	React.useEffect(() => {
		if (!plans || plans.length < 2)
			return;

		for (let i = 1; i < plans.length; i++) {
			const prevPlan = plans[i - 1];
			const currentPlan = plans[i];
			if (!prevPlan || !currentPlan)
				continue;

			if (currentPlan.smsMin !== prevPlan.smsMax) {
				setValue(sf(`plans.${i}.smsMin`), prevPlan.smsMax, {
					shouldDirty: true,
					shouldValidate: true,
				});
			}
			if (currentPlan.billMin !== prevPlan.billMax) {
				setValue(sf(`plans.${i}.billMin`), prevPlan.billMax, {
					shouldDirty: true,
					shouldValidate: true,
				});
			}
		}
	}, [plans, setValue]);

	React.useEffect(() => {
		if (!plans || plans.length === 0) {
			previousSharesRef.current = [];
			return;
		}

		const previousShares = previousSharesRef.current;

		for (let i = 0; i < plans.length; i++) {
			const currentPlan = plans[i];
			const previousPlan = previousShares[i];
			if (!currentPlan)
				continue;

			const currentPartnerShare = currentPlan.billPartnerShare ?? null;
			const currentKarashabShare = currentPlan.billKarashabShare ?? null;
			const previousPartnerShare = previousPlan?.billPartnerShare ?? null;
			const previousKarashabShare = previousPlan?.billKarashabShare ?? null;

			const partnerChanged = currentPartnerShare !== previousPartnerShare;
			const karashabChanged = currentKarashabShare !== previousKarashabShare;

			if (partnerChanged && !karashabChanged) {
				if (currentPartnerShare != null) {
					const remainingPercent = 100 - currentPartnerShare;
					if (currentKarashabShare !== remainingPercent) {
						setValue(sf(`plans.${i}.billKarashabShare`), remainingPercent, {
							shouldDirty: true,
							shouldValidate: true,
						});
					}
				}
				else if (currentKarashabShare != null) {
					const remainingPercent = 100 - currentKarashabShare;
					if (currentPartnerShare !== remainingPercent) {
						setValue(sf(`plans.${i}.billPartnerShare`), remainingPercent, {
							shouldDirty: true,
							shouldValidate: true,
						});
					}
				}
				continue;
			}

			if (karashabChanged && !partnerChanged) {
				if (currentKarashabShare != null) {
					const remainingPercent = 100 - currentKarashabShare;
					if (currentPartnerShare !== remainingPercent) {
						setValue(sf(`plans.${i}.billPartnerShare`), remainingPercent, {
							shouldDirty: true,
							shouldValidate: true,
						});
					}
				}
				else if (currentPartnerShare != null) {
					const remainingPercent = 100 - currentPartnerShare;
					if (currentKarashabShare !== remainingPercent) {
						setValue(sf(`plans.${i}.billKarashabShare`), remainingPercent, {
							shouldDirty: true,
							shouldValidate: true,
						});
					}
				}
			}
		}

		previousSharesRef.current = plans.map(plan => ({
			billPartnerShare: plan?.billPartnerShare ?? null,
			billKarashabShare: plan?.billKarashabShare ?? null,
		}));
	}, [plans, setValue]);

	React.useEffect(() => {
		if (!plans || plans.length === 0) {
			previousTrafficSharesRef.current = [];
			return;
		}

		const previousTrafficShares = previousTrafficSharesRef.current;

		for (let i = 0; i < plans.length; i++) {
			const currentPlan = plans[i];
			const previousPlan = previousTrafficShares[i];
			if (!currentPlan)
				continue;

			const currentProfitPercent = currentPlan.trafficProfitPercent ?? null;
			const currentPartnerSharePercent = currentPlan.trafficPartnerSharePercent ?? null;
			const previousProfitPercent = previousPlan?.trafficProfitPercent ?? null;
			const previousPartnerSharePercent = previousPlan?.trafficPartnerSharePercent ?? null;

			const profitChanged = currentProfitPercent !== previousProfitPercent;
			const partnerChanged = currentPartnerSharePercent !== previousPartnerSharePercent;

			if (profitChanged && !partnerChanged) {
				if (currentProfitPercent != null) {
					const remainingPercent = 100 - currentProfitPercent;
					if (currentPartnerSharePercent !== remainingPercent) {
						setValue(sf(`plans.${i}.trafficPartnerSharePercent`), remainingPercent, {
							shouldDirty: true,
							shouldValidate: true,
						});
					}
				}
				else if (currentPartnerSharePercent != null) {
					const remainingPercent = 100 - currentPartnerSharePercent;
					if (currentProfitPercent !== remainingPercent) {
						setValue(sf(`plans.${i}.trafficProfitPercent`), remainingPercent, {
							shouldDirty: true,
							shouldValidate: true,
						});
					}
				}
				continue;
			}

			if (partnerChanged && !profitChanged) {
				if (currentPartnerSharePercent != null) {
					const remainingPercent = 100 - currentPartnerSharePercent;
					if (currentProfitPercent !== remainingPercent) {
						setValue(sf(`plans.${i}.trafficProfitPercent`), remainingPercent, {
							shouldDirty: true,
							shouldValidate: true,
						});
					}
				}
				else if (currentProfitPercent != null) {
					const remainingPercent = 100 - currentProfitPercent;
					if (currentPartnerSharePercent !== remainingPercent) {
						setValue(sf(`plans.${i}.trafficPartnerSharePercent`), remainingPercent, {
							shouldDirty: true,
							shouldValidate: true,
						});
					}
				}
			}
		}

		previousTrafficSharesRef.current = plans.map(plan => ({
			trafficProfitPercent: plan?.trafficProfitPercent ?? null,
			trafficPartnerSharePercent: plan?.trafficPartnerSharePercent ?? null,
		}));
	}, [plans, setValue]);

	function _addPlan() {
		const nextIndex = fields.length;
		const prevPlan = (nextIndex > 0 ? getValues(sf(`plans.${nextIndex - 1}`)) : null) as {
			smsMax: number | null
			billMax: number | null
		} | null;

		append({
			...structuredClone(defaultOpenApiPlan),
			smsMin: prevPlan?.smsMax ?? null,
			billMin: prevPlan?.billMax ?? null,
		} as any);
		setActiveKey(String(nextIndex));
	}

	function removePlan(idx: number) {
		remove(idx);
		const next = idx === 0 ? "0" : String(idx - 1);
		setActiveKey(next);
	}

	const _collapseItems = fields.map((_, idx) => ({
		key: String(idx),
		label: (
			<div
				className="flex items-center justify-between w-full gap-3"
			>
				<span>{`پلن بسته ${idx + 1}`}</span>

				<Button
					danger
					size="small"
					icon={<DeleteOutlined />}
					disabled={idx === 0}
					onClick={(e) => {
						e.stopPropagation();
						removePlan(idx);
					}}
				>
					حذف پلن
				</Button>
			</div>
		),
		children: <OpenApiPackagePlanPanel idx={idx} />,
	}));

	return (
		<div className="w-full">
			<SectionCard title="مدل قرارداد OpenAPI" tone="purple" className="w-full">
				<RHFSelect
					name={sf("contractModel")}
					label=""
					options={[
						{ label: "تفکیکی", value: "separated" },
						{ label: "قدیمی", value: "legacy" },
					]}
					selectProps={{ placeholder: mode === "edit" ? undefined : "مدل قرارداد را انتخاب کنید", allowClear: false, disabled: mode === "edit" }}
				/>
				{mode === "edit" && (
					<p className="mt-2 text-sm text-gray-500">مدل قرارداد پایه پس از ثبت قابل تغییر نیست</p>
				)}
			</SectionCard>

			<div className="w-full">
				{contractModel === "separated"
					? <SeparatedPricingFields />
					: (
						<div className="flex w-full flex-col">
							<ContractTypeSection
								title="بهای ثبت وصولی"
								name={sf("legacyPricing.paymentRegistration")}
								tone="purple"
								compactCalculationModel
								blendedModePlaceholder="انتخاب نوع پلکانی در این بخش"
							/>
							<ContractTypeSection
								title="بهای استعلام قبض"
								name={sf("legacyPricing.billInquiry")}
								tone="purple"
								compactCalculationModel
								blendedModePlaceholder="انتخاب نوع پلکانی در این بخش"
							/>
						</div>
					)}

			</div>

			{showAddenda
				? (
					<div className="mt-3">
						<ContractAddendaSection<ContractFormValues>
							title="الحاقیه‌های قرارداد (اختیاری)"
							name={sf("addenda") as ArrayPath<ContractFormValues>}
							contractTypeTitle=""
							contractTypeFieldKey="contractPricing"
							canAddAddendum={!!contractModel}
							addendumAddBlockedMessage="ابتدا مدل قرارداد را انتخاب کنید."
							renderAddendumFields={base => (
								<div className="flex w-full flex-col">
									<ContractTypeSection
										title="بهای ثبت وصولی"
										name={`${base}.legacyPricing.paymentRegistration` as any}
										tone="purple"
										compactCalculationModel
										blendedModePlaceholder="انتخاب نوع پلکانی در این بخش"
									/>
									<ContractTypeSection
										title="بهای استعلام قبض"
										name={`${base}.legacyPricing.billInquiry` as any}
										tone="purple"
										compactCalculationModel
										blendedModePlaceholder="انتخاب نوع پلکانی در این بخش"
									/>
								</div>
							)}
							contractStartYearPath={"startYear" as Path<ContractFormValues>}
							contractStartMonthPath={"startMonth" as Path<ContractFormValues>}
							contractEndYearPath={"endYear" as Path<ContractFormValues>}
							contractEndMonthPath={"endMonth" as Path<ContractFormValues>}
						/>
					</div>
				)
				: null}
		</div>
	);
}
