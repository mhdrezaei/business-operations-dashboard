import type {
	OpenApiChannelCode,
	OpenApiOperationCode,
	OpenApiPredictionModel,
	PredictionCompanyOption,
	PredictionFormValues,
	PredictionMetricCode,
	PredictionShareSectionValue,
} from "../../model/prediction.form.types";
import { RHFProNumber, RHFSelect } from "#src/shared/ui/rhf-pro";
import { DeleteOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Form, Segmented, Select, Typography } from "antd";
import { useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { predictionCompaniesByServiceQuery } from "../../queries/prediction.queries";
import { QuarterDistributionSection } from "../../ui/form/sections/QuarterDistributionSection";
import {
	getOpenApiOperationSections,
	OPENAPI_CHANNEL_OPTIONS,
	OPENAPI_METRICS,
	OPENAPI_MODEL_OPTIONS,
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

function getChannelFieldPath(channelKey: OpenApiChannelCode) {
	return `serviceFields.channels.value.${channelKey}` as const;
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

	function handleModeChange(mode: string | number) {
		updateShareState({
			...shareState,
			mode: mode === "manual" ? "manual" : "auto",
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
		<Card
			bordered
			className="rounded-xl [&_.ant-pro-card-body]:flex [&_.ant-pro-card-body]:flex-col [&_.ant-pro-card-body]:gap-4 [&_.ant-pro-card-header]:min-h-12"
			title={metricTitle}
		>
			<Segmented
				block
				value={shareState.mode}
				onChange={handleModeChange}
				options={[
					{ label: t("prediction.shareModes.auto"), value: "auto" },
					{ label: t("prediction.shareModes.manual"), value: "manual" },
				]}
			/>

			{shareState.mode === "auto"
				? (
					<Typography.Paragraph className="mb-0 opacity-[0.78]">
						{t("prediction.messages.autoShareDescription")}
					</Typography.Paragraph>
				)
				: (
					<div className="flex flex-col gap-4">
						<Form.Item
							label={t("prediction.labels.companySelect")}
							validateStatus={shareError ? "error" : undefined}
							help={shareError}
							className="mb-0"
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

						{selectedCompanies.map(company => (
							<div
								key={company.value}
								className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 items-end"
							>
								<Button
									aria-label={t("prediction.actions.removeCompanyShare")}
									icon={<DeleteOutlined />}
									onClick={() => removeCompany(company.value)}
								/>

								<RHFProNumber<PredictionFormValues, any>
									name={`${fieldPath}.shares.${company.value}` as any}
									label={company.label}
									inputProps={{
										placeholder: t("prediction.placeholders.percentExample"),
										addonAfter: "%",
									}}
								/>
							</div>
						))}

						<Typography.Text type={shareTotal === 100 ? "success" : "danger"}>
							{t("prediction.messages.manualShareSum", { title: `${operationTitle} - ${metricTitle}`, total: shareTotal })}
						</Typography.Text>
					</div>
				)}
		</Card>
	);
}

export function OpenApiPredictionFields() {
	const { t } = useTranslation();
	const { control, register, setValue } = useFormContext<PredictionFormValues>();
	const serviceId = useWatch({ control, name: "serviceId" });
	const activeModel = "LEGACY" as OpenApiPredictionModel;

	useEffect(() => {
		register(sf("openapiModel") as any);
		setValue(sf("openapiModel") as any, "LEGACY", {
			shouldDirty: false,
			shouldTouch: false,
			shouldValidate: false,
		});
	}, [register, setValue]);

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
	const channelValues = useWatch({ control, name: "serviceFields.channels.value" as any }) as Record<string, number | null> | undefined;
	const channelTotal = useMemo(
		() => OPENAPI_CHANNEL_OPTIONS.reduce((total, channel) => total + Number(channelValues?.[channel.key] ?? 0), 0),
		[channelValues],
	);

	return (
		<div className="flex flex-col gap-4">
			{false
				? (
					<Card
						bordered
						className="rounded-2xl"
					>
						<div className="grid gap-3 md:grid-cols-2">
							<RHFSelect<PredictionFormValues, any, OpenApiPredictionModel>
								name={sf("openapiModel") as any}
								label={t("prediction.labels.openapiModel", { defaultValue: "مدل OpenAPI" })}
								options={OPENAPI_MODEL_OPTIONS.map(option => ({
									label: t(option.labelKey, {
										defaultValue: option.value === "PACKAGE" ? "بسته‌ای (Package)" : "قدیمی (Legacy)",
									}),
									value: option.value,
								}))}
								selectProps={{
									placeholder: t("prediction.placeholders.selectOpenapiModel", {
										defaultValue: "مدل OpenAPI را انتخاب کنید",
									}),
								}}
							/>
						</div>
					</Card>
				)
				: null}

			<QuarterDistributionSection />

			{activeSections.map(section => (
				<Card
					key={section.key}
					bordered
					className="rounded-2xl"
					title={t(section.titleKey)}
				>
					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
						<RHFProNumber<PredictionFormValues, any>
							name={sf(section.fields.value) as any}
							label={t("prediction.labels.annualValue")}
							inputProps={{ placeholder: t("prediction.placeholders.amountExample") }}
							enableGrouping
							enableWordsTooltip
						/>
						<RHFProNumber<PredictionFormValues, any>
							name={sf(section.fields.income) as any}
							label={t("prediction.labels.annualIncome")}
							inputProps={{ placeholder: t("prediction.placeholders.amountExample") }}
							enableGrouping
							enableWordsTooltip
						/>
						<RHFProNumber<PredictionFormValues, any>
							name={sf(section.fields.expense) as any}
							label={t("prediction.labels.annualExpense")}
							inputProps={{ placeholder: t("prediction.placeholders.amountExample") }}
							enableGrouping
							enableWordsTooltip
						/>
					</div>
				</Card>
			))}

			<Card
				bordered
				className="rounded-2xl"
				title={t("prediction.sections.companyShares")}
			>
				<div className="flex flex-col gap-4">
					<Typography.Paragraph className="mb-0 opacity-80">
						{t("prediction.messages.companySharesDescription")}
					</Typography.Paragraph>

					{activeSections.map(section => (
						<Card
							key={`${section.key}-shares`}
							bordered
							className="rounded-2xl [&_.ant-pro-card-body]:flex [&_.ant-pro-card-body]:flex-col [&_.ant-pro-card-body]:gap-4"
							title={t(section.titleKey)}
						>
							<div className="prediction-share-editor-grid grid gap-4 xl:grid-cols-3">
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
						</Card>
					))}

					{activeModel === "PACKAGE"
						? (
							<Card
								bordered
								className="rounded-2xl [&_.ant-pro-card-body]:flex [&_.ant-pro-card-body]:flex-col [&_.ant-pro-card-body]:gap-4"
								title={t("prediction.openapi.sections.channels", { defaultValue: "کانال‌ها" })}
							>
								<div className="grid gap-4 xl:grid-cols-3">
									{OPENAPI_CHANNEL_OPTIONS.map(channel => (
										<RHFProNumber<PredictionFormValues, any>
											key={channel.key}
											name={getChannelFieldPath(channel.key) as any}
											label={t(channel.titleKey, { defaultValue: channel.key })}
											inputProps={{
												placeholder: t("prediction.placeholders.percentExample"),
												addonAfter: "%",
											}}
										/>
									))}
								</div>

								<Typography.Text type={channelTotal === 100 ? "success" : "danger"}>
									{t("prediction.messages.manualShareSum", {
										title: t("prediction.openapi.sections.channels", { defaultValue: "کانال‌ها" }),
										total: channelTotal,
									})}
								</Typography.Text>
							</Card>
						)
						: null}
				</div>
			</Card>
		</div>
	);
}
