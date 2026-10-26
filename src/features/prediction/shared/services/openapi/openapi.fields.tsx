import type {
	OpenApiOperationCode,
	OpenApiPredictionModel,
	PredictionCompanyOption,
	PredictionFormValues,
	PredictionMetricCode,
	PredictionShareSectionValue,
} from "../../model/prediction.form.types";
import { DashedCard } from "#src/shared/ui/dashed-card";
import { RHFProNumber, RHFSegmentedSwitch, RHFSelect } from "#src/shared/ui/rhf-pro";
import { SectionCard } from "#src/shared/ui/section-card";
import { DeleteOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Form, Select, Typography } from "antd";
import { useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { applyManualShareTemplate } from "../../model/manual-share-template";
import { predictionCompaniesByServiceQuery } from "../../queries/prediction.queries";
import { QuarterDistributionSection } from "../../ui/form/sections/QuarterDistributionSection";
import {
	createEmptyOpenApiManualShares,
	getOpenApiAmountField,
	getOpenApiOperationSections,
	OPENAPI_METRICS,
	OPENAPI_MODEL_OPTIONS,
	OPENAPI_PACKAGE_MODEL_OPTION,
} from "./openapi.config";

const sf = (path: string) => `serviceFields.${path}` as const;

function normalizeShareValue(value: unknown): PredictionShareSectionValue {
	if (!value || typeof value !== "object") {
		return {
			mode: "auto",
			selectedCompanyIds: [],
			shares: {},
		};
	}

	const raw = value as Record<string, unknown>;
	return {
		mode: raw.mode === "manual" ? "manual" : "auto",
		selectedCompanyIds: Array.isArray(raw.selectedCompanyIds)
			? raw.selectedCompanyIds
				.map(item => Number(item))
				.filter(item => Number.isInteger(item) && item > 0)
			: [],
		shares: raw.shares && typeof raw.shares === "object"
			? raw.shares as Record<string, number | null>
			: {},
	};
}

function getShareFieldPath(operationKey: OpenApiOperationCode, metricKey: PredictionMetricCode) {
	return `serviceFields.manualShares.${operationKey}.${metricKey}` as const;
}

function getSelectedCompanyOptions(
	companyOptions: PredictionCompanyOption[],
	selectedCompanyIds: number[],
) {
	const selectedSet = new Set(selectedCompanyIds);
	return companyOptions.filter(option => selectedSet.has(option.value));
}

function CompanyShareEditor({
	companyOptions,
	operationKey,
	operationTitle,
	metricKey,
	metricTitle,
}: {
	companyOptions: PredictionCompanyOption[]
	operationKey: OpenApiOperationCode
	operationTitle: string
	metricKey: PredictionMetricCode
	metricTitle: string
}) {
	const { t } = useTranslation();
	const {
		control,
		formState,
		getFieldState,
		getValues,
		register,
		setValue,
	} = useFormContext<PredictionFormValues>();

	const fieldPath = getShareFieldPath(operationKey, metricKey);
	const shareState = normalizeShareValue(useWatch({ control, name: fieldPath as any }));
	const shareError = getFieldState(fieldPath as any, formState).error?.message;
	const selectedCompanies = useMemo(
		() => getSelectedCompanyOptions(companyOptions, shareState.selectedCompanyIds),
		[companyOptions, shareState.selectedCompanyIds],
	);
	const shareTotal = shareState.selectedCompanyIds.reduce((total, companyId) => {
		const amount = Number(shareState.shares[String(companyId)] ?? 0);
		return total + amount;
	}, 0);

	useEffect(() => {
		register(`${fieldPath}.mode` as any);
		register(`${fieldPath}.selectedCompanyIds` as any);
	}, [fieldPath, register]);

	function updateShareState(nextState: PredictionShareSectionValue) {
		setValue(fieldPath as any, nextState as any, {
			shouldDirty: true,
			shouldTouch: true,
			shouldValidate: true,
		});
	}

	function handleCompanyIdsChange(companyIds: number[]) {
		const uniqueIds = Array.from(new Set(companyIds.map(Number)))
			.filter(companyId => Number.isInteger(companyId) && companyId > 0);
		const nextShares = { ...shareState.shares };

		uniqueIds.forEach((companyId) => {
			const key = String(companyId);
			if (!(key in nextShares)) {
				nextShares[key] = 0;
			}
		});

		updateShareState({
			...shareState,
			selectedCompanyIds: uniqueIds,
			shares: nextShares,
		});
	}

	function removeCompany(companyId: number) {
		handleCompanyIdsChange(shareState.selectedCompanyIds.filter(id => id !== companyId));
	}

	return (
		<DashedCard title={metricTitle} className="prediction-share-editor">
			<div className="prediction-share-editor__controls">
				<RHFSegmentedSwitch
					name={`${fieldPath}.mode` as any}
					label={t("prediction.labels.allocationMode")}
					options={[
						{ label: t("prediction.shareModes.auto"), value: "auto" },
						{ label: t("prediction.shareModes.manual"), value: "manual" },
					]}
					formItemProps={{ className: "mb-0" }}
					onValueChange={(mode) => {
						if (mode === "manual") {
							applyManualShareTemplate({
								getValues: path => getValues(path as any),
								setValue: (path, value, options) => setValue(path as any, value as any, options),
								targetPath: fieldPath,
							});
						}
					}}
				/>
				{shareState.mode === "manual"
					? (
						<Form.Item
							label={t("prediction.labels.companySelect")}
							validateStatus={shareError ? "error" : undefined}
							help={shareError}
							className="prediction-share-editor__company-select mb-0"
						>
							<Select<number[]>
								mode="multiple"
								value={shareState.selectedCompanyIds}
								options={companyOptions}
								onChange={value => handleCompanyIdsChange(value as number[])}
								placeholder={t("prediction.placeholders.selectCompanies")}
								optionFilterProp="label"
								showSearch
							/>
						</Form.Item>
					)
					: null}
			</div>

			{shareState.mode === "auto"
				? (
					<Typography.Paragraph className="prediction-share-editor__hint">
						{t("prediction.messages.autoShareDescription")}
					</Typography.Paragraph>
				)
				: (
					<div className="prediction-share-editor__companies">
						{selectedCompanies.map(company => (
							<div
								key={company.value}
								className="prediction-share-editor__company"
							>
								<RHFProNumber<PredictionFormValues, any>
									name={`${fieldPath}.shares.${company.value}` as any}
									label={company.label}
									inputProps={{
										placeholder: t("prediction.placeholders.percentExample"),
										addonAfter: "%",
									}}
								/>

								<Button
									danger
									aria-label={t("prediction.actions.removeCompanyShare")}
									icon={<DeleteOutlined />}
									onClick={() => removeCompany(company.value)}
								/>
							</div>
						))}

						<Typography.Text type={shareTotal === 100 ? "success" : "danger"}>
							{t("prediction.messages.manualShareSum", { title: `${operationTitle} - ${metricTitle}`, total: shareTotal })}
						</Typography.Text>
					</div>
				)}
		</DashedCard>
	);
}

export function OpenApiPredictionFields() {
	const { t } = useTranslation();
	const { control, setValue } = useFormContext<PredictionFormValues>();
	const serviceId = useWatch({ control, name: "serviceId" });
	const activeModel = (useWatch({ control, name: sf("openapiModel") as any }) ?? "LEGACY") as OpenApiPredictionModel;

	// cleared only on a user-initiated change, not when a record is hydrated
	const handleModelChange = () => setValue(sf("manualShares") as any, createEmptyOpenApiManualShares(), {
		shouldDirty: true,
		shouldValidate: false,
	});

	const companies = useQuery(predictionCompaniesByServiceQuery(serviceId));
	const companyOptions = useMemo(
		() => (companies.data?.results ?? []).map(company => ({
			label: company.name,
			value: company.id,
		})),
		[companies.data],
	);

	const metricLabels = useMemo(
		() => Object.fromEntries(
			OPENAPI_METRICS.map(metric => [metric.key, t(metric.titleKey)]),
		) as Record<PredictionMetricCode, string>,
		[t],
	);
	const activeSections = useMemo(
		() => getOpenApiOperationSections(activeModel),
		[activeModel],
	);

	const modelOptions = activeModel === "PACKAGE"
		? [...OPENAPI_MODEL_OPTIONS, OPENAPI_PACKAGE_MODEL_OPTION]
		: OPENAPI_MODEL_OPTIONS;

	return (
		<div className="flex flex-col gap-4">
			<SectionCard title={t("prediction.labels.openapiModel")} tone="blue">
				<RHFSelect<PredictionFormValues, any, OpenApiPredictionModel>
					name={sf("openapiModel") as any}
					label=""
					options={modelOptions.map(option => ({
						label: t(option.labelKey),
						value: option.value,
						disabled: option.value === "PACKAGE",
					}))}
					onValueChange={handleModelChange}
					selectProps={{ placeholder: t("prediction.placeholders.selectOpenapiModel") }}
				/>
			</SectionCard>

			<QuarterDistributionSection />

			{activeSections.map(section => (
				<SectionCard
					key={section.key}
					title={t(section.titleKey)}
					tone="purple"
				>
					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
						<RHFProNumber<PredictionFormValues, any>
							name={sf(getOpenApiAmountField(section.key, "value")) as any}
							label={t("prediction.labels.annualValue")}
							inputProps={{ placeholder: t("prediction.placeholders.amountExample") }}
							enableGrouping
							enableWordsTooltip
						/>
						<RHFProNumber<PredictionFormValues, any>
							name={sf(getOpenApiAmountField(section.key, "income")) as any}
							label={t("prediction.labels.annualIncome")}
							inputProps={{ placeholder: t("prediction.placeholders.amountExample") }}
							enableGrouping
							enableWordsTooltip
						/>
						<RHFProNumber<PredictionFormValues, any>
							name={sf(getOpenApiAmountField(section.key, "expense")) as any}
							label={t("prediction.labels.annualExpense")}
							inputProps={{ placeholder: t("prediction.placeholders.amountExample") }}
							enableGrouping
							enableWordsTooltip
						/>
					</div>
				</SectionCard>
			))}

			<SectionCard title={t("prediction.sections.companyShares")} tone="blue">
				<div className="flex flex-col gap-4">
					<Typography.Paragraph className="mb-0 opacity-80">
						{t("prediction.messages.companySharesDescription")}
					</Typography.Paragraph>

					{activeSections.map(section => (
						<DashedCard
							key={`${section.key}-shares`}
							title={t(section.titleKey)}
							collapsible
						>
							<div className="prediction-share-editor-grid grid gap-3">
								{OPENAPI_METRICS.map(metric => (
									<CompanyShareEditor
										key={`${section.key}-${metric.key}`}
										companyOptions={companyOptions}
										operationKey={section.key}
										operationTitle={t(section.titleKey)}
										metricKey={metric.key}
										metricTitle={metricLabels[metric.key]}
									/>
								))}
							</div>
						</DashedCard>
					))}
				</div>
			</SectionCard>
		</div>
	);
}
