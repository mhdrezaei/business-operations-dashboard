import type { ArrayPath, Path } from "react-hook-form";
import type { ContractFormValues } from "../../../shared/model/contract.form.types";
import type { OpenApiContractModel } from "./openapi.types";
import { ContractAddendaSection } from "#src/features/contract/components/addenda/ContractAddendaSection.js";
import { RHFProNumber, RHFSelect } from "#src/shared/ui/rhf-pro";
import { SectionCard } from "#src/shared/ui/section-card";
import React, { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ContractTypeSection } from "../../../components/contract-type/ContractTypeSection";
import { usePartnerShareSync } from "./openapi.share-sync";
import { defaultLegacyPricing, defaultSeparatedPricing } from "./openapi.types";
import { OpenApiPackagePlansFields } from "./OpenApiPackagePlansFields";

const sf = (path: string) => `serviceFields.${path}` as any;

function useOpenApiModelOptions() {
	const { t } = useTranslation();
	return useMemo(() => [
		{ label: t("contract.openapi.models.separated"), value: "separated" },
		{ label: t("contract.openapi.models.legacy"), value: "legacy" },
	], [t]);
}

function ReceiptSharesFields({ karashabPath, partnerPath }: { karashabPath: string, partnerPath: string }) {
	const { t } = useTranslation();
	usePartnerShareSync(karashabPath, partnerPath);

	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
			<RHFProNumber name={karashabPath as any} label={t("contract.openapi.separated.karashabShare")} inputProps={{ addonAfter: "%", placeholder: t("contract.salesAgency.percentPlaceholder") } as any} />
			<RHFProNumber name={partnerPath as any} label={t("contract.openapi.separated.partnerShare")} inputProps={{ addonAfter: "%", readOnly: true } as any} />
		</div>
	);
}

/** فیلدهای مدل تفکیکی؛ هم برای قرارداد اصلی (serviceFields.separatedPricing) و هم هر الحاقیه استفاده می‌شود. */
function SeparatedPricingFields({ basePath }: { basePath: string }) {
	const { t } = useTranslation();
	const field = (key: string) => `${basePath}.${key}`;

	return (
		<div className="flex w-full flex-col">
			<ContractTypeSection
				title={t("contract.openapi.separated.midterm")}
				name={field("midPeriodBillInquiry")}
				tone="purple"
				topAside={(
					<RHFProNumber
						name={field("walletChargeDiscountPercent") as any}
						label={t("contract.openapi.separated.walletLabel")}
						inputProps={{ addonAfter: "%", placeholder: t("contract.salesAgency.percentPlaceholder") } as any}
					/>
				)}
			/>
			<ContractTypeSection title={t("contract.openapi.separated.endterm")} name={field("endPeriodBillInquiry")} tone="purple" />
			<ContractTypeSection
				title={t("contract.openapi.separated.connected")}
				name={field("connectedReceiptRegister")}
				tone="purple"
				bottomAside={<ReceiptSharesFields karashabPath={field("connectedKarashabSharePercent")} partnerPath={field("connectedPartnerSharePercent")} />}
			/>
			<ContractTypeSection
				title={t("contract.openapi.separated.disconnected")}
				name={field("disconnectedReceiptRegister")}
				tone="purple"
				bottomAside={<ReceiptSharesFields karashabPath={field("disconnectedKarashabSharePercent")} partnerPath={field("disconnectedPartnerSharePercent")} />}
			/>
		</div>
	);
}

function LegacyPricingFields({ basePath }: { basePath: string }) {
	const { t } = useTranslation();
	return (
		<div className="flex w-full flex-col">
			<ContractTypeSection
				title={t("contract.openapi.paymentRegistrationPrice")}
				name={`${basePath}.paymentRegistration`}
				tone="purple"
				compactCalculationModel
				blendedModePlaceholder={t("contract.openapi.tieredModePlaceholder")}
			/>
			<ContractTypeSection
				title={t("contract.openapi.billInquiryPrice")}
				name={`${basePath}.billInquiry`}
				tone="purple"
				compactCalculationModel
				blendedModePlaceholder={t("contract.openapi.tieredModePlaceholder")}
			/>
		</div>
	);
}

/** هر الحاقیه API مالی مدل قرارداد (قدیمی/تفکیکی) خودش را دارد. */
function OpenApiAddendumFields({ base }: { base: string }) {
	const { t } = useTranslation();
	const { control, setValue, getValues } = useFormContext<ContractFormValues>();
	const modelOptions = useOpenApiModelOptions();
	const modelPath = `${base}.contractModel`;
	const addendumModel = useWatch({ control, name: modelPath as any }) as OpenApiContractModel | undefined;
	// الحاقیه قرارداد «بسته» مدل جدا ندارد و فقط پلن‌های خودش را دارد (مثل old)
	const isPackage = addendumModel === "package";

	React.useEffect(() => {
		if (addendumModel == null) {
			// مدل پیش‌فرض الحاقیه جدید همان مدل قرارداد اصلی است (مثل old)
			setValue(modelPath as any, (getValues(sf("contractModel")) ?? "legacy") as any, { shouldDirty: false, shouldValidate: false });
			return;
		}
		if (addendumModel === "package")
			return;
		if (addendumModel === "separated") {
			setValue(`${base}.legacyPricing` as any, undefined as any, { shouldDirty: true, shouldValidate: true });
			if (!getValues(`${base}.separatedPricing` as any))
				setValue(`${base}.separatedPricing` as any, structuredClone(defaultSeparatedPricing) as any, { shouldDirty: false, shouldValidate: false });
		}
		else {
			setValue(`${base}.separatedPricing` as any, undefined as any, { shouldDirty: true, shouldValidate: true });
		}
	}, [addendumModel, base, modelPath, getValues, setValue]);

	return (
		<div className="flex w-full flex-col">
			{isPackage
				? null
				: (
					<div className="mb-3 w-full max-w-[420px]">
						<RHFSelect
							name={modelPath as any}
							label={t("contract.openapi.modelLabel")}
							options={modelOptions}
							selectProps={{ allowClear: false }}
						/>
					</div>
				)}
			{isPackage
				? <OpenApiPackagePlansFields basePath={base} />
				: addendumModel === "separated"
					? <SeparatedPricingFields basePath={`${base}.separatedPricing`} />
					: <LegacyPricingFields basePath={`${base}.legacyPricing`} />}
		</div>
	);
}

export function OpenApiFields({ mode = "create" }: { mode?: "create" | "edit" }) {
	const { t } = useTranslation();
	const { control, setValue, getValues, register } = useFormContext<ContractFormValues>();
	const startYear = useWatch({ control, name: "startYear" });
	const startMonth = useWatch({ control, name: "startMonth" });
	const endYear = useWatch({ control, name: "endYear" });
	const endMonth = useWatch({ control, name: "endMonth" });
	const showAddenda = useMemo(
		() => startYear != null && startMonth != null && endYear != null && endMonth != null,
		[startYear, startMonth, endYear, endMonth],
	);
	const contractModel = useWatch({ control, name: sf("contractModel") }) as OpenApiContractModel | null;
	const modelOptions = useOpenApiModelOptions();

	React.useEffect(() => {
		register(sf("contractModel"));
		if (!getValues(sf("contractModel"))) {
			setValue(sf("contractModel"), "legacy" as any, {
				shouldDirty: false,
				shouldTouch: false,
				shouldValidate: false,
			});
		}
	}, [register, setValue, getValues]);

	React.useEffect(() => {
		if (contractModel === "legacy") {
			if (!getValues(sf("legacyPricing"))) {
				setValue(sf("legacyPricing"), structuredClone(defaultLegacyPricing) as any, {
					shouldDirty: false,
					shouldValidate: false,
				});
			}
			setValue(sf("separatedPricing"), undefined as any, { shouldDirty: true, shouldValidate: true });
		}
		else if (contractModel === "separated") {
			setValue(sf("legacyPricing"), undefined as any, { shouldDirty: true, shouldValidate: true });
			if (!getValues(sf("separatedPricing"))) {
				setValue(sf("separatedPricing"), structuredClone(defaultSeparatedPricing) as any, {
					shouldDirty: false,
					shouldValidate: false,
				});
			}
		}
	}, [contractModel, setValue, getValues]);

	return (
		<div className="w-full">
			<SectionCard title={t("contract.openapi.modelCardTitle")} tone="purple" className="mb-3">
				<div className="w-full max-w-[420px]">
					<RHFSelect
						name={sf("contractModel")}
						label=""
						options={contractModel === "package" ? [...modelOptions, { label: t("contract.openapi.models.package"), value: "package" }] : modelOptions}
						selectProps={{ placeholder: mode === "edit" ? undefined : t("contract.openapi.modelPlaceholder"), allowClear: false, disabled: mode === "edit" }}
					/>
				</div>
				{mode === "edit" && (
					<p className="mt-2 text-sm text-gray-500">{t("contract.openapi.modelLocked")}</p>
				)}
			</SectionCard>

			{contractModel === "package"
				? <OpenApiPackagePlansFields />
				: contractModel === "separated"
					? <SeparatedPricingFields basePath={sf("separatedPricing")} />
					: <LegacyPricingFields basePath={sf("legacyPricing")} />}

			{showAddenda
				? (
					<div className="mt-3">
						<ContractAddendaSection<ContractFormValues>
							title={t("contract.addenda.title")}
							name={sf("addenda") as ArrayPath<ContractFormValues>}
							contractTypeTitle=""
							contractTypeFieldKey="contractPricing"
							canAddAddendum={!!contractModel}
							addendumAddBlockedMessage={t("contract.openapi.selectModelFirst")}
							renderAddendumFields={base => <OpenApiAddendumFields base={base} />}
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
