import type {
	OpenApiOperationCode,
	PredictionCompanyOption,
	PredictionFormValues,
	PredictionMetricCode,
	PredictionShareSectionValue,
} from "../../model/prediction.form.types";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { DeleteOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { Button, Form, Segmented, Select, Typography } from "antd";
import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { predictionCompaniesByServiceQuery } from "../../queries/prediction.queries";
import { OPENAPI_METRICS, OPENAPI_OPERATION_SECTIONS } from "./openapi.config";

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
		<ProCard
			bordered
			style={{ borderRadius: 12 }}
			title={metricTitle}
			headStyle={{ minHeight: 48 }}
			bodyStyle={{ display: "flex", flexDirection: "column", gap: 16 }}
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
					<Typography.Paragraph style={{ marginBottom: 0, opacity: 0.78 }}>
						{t("prediction.messages.autoShareDescription")}
					</Typography.Paragraph>
				)
				: (
					<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
						<Form.Item
							label={t("prediction.labels.companySelect")}
							validateStatus={shareError ? "error" : undefined}
							help={shareError}
							style={{ marginBottom: 0 }}
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
								style={{
									display: "grid",
									gridTemplateColumns: "auto minmax(0, 1fr)",
									gap: 12,
									alignItems: "end",
								}}
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
		</ProCard>
	);
}

export function OpenApiPredictionFields() {
	const { t } = useTranslation();
	const { control } = useFormContext<PredictionFormValues>();
	const serviceId = useWatch({ control, name: "serviceId" });

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

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			<ProCard
				bordered
				headerBordered
				style={{ borderRadius: 16 }}
				title={t("prediction.sections.quarters")}
			>
				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
					<RHFProNumber<PredictionFormValues, any>
						name={sf("q1Percent") as any}
						label={t("prediction.quarters.q1")}
						inputProps={{ placeholder: t("prediction.placeholders.percentExample"), addonAfter: "%" }}
					/>
					<RHFProNumber<PredictionFormValues, any>
						name={sf("q2Percent") as any}
						label={t("prediction.quarters.q2")}
						inputProps={{ placeholder: t("prediction.placeholders.percentExample"), addonAfter: "%" }}
					/>
					<RHFProNumber<PredictionFormValues, any>
						name={sf("q3Percent") as any}
						label={t("prediction.quarters.q3")}
						inputProps={{ placeholder: t("prediction.placeholders.percentExample"), addonAfter: "%" }}
					/>
					<RHFProNumber<PredictionFormValues, any>
						name={sf("q4Percent") as any}
						label={t("prediction.quarters.q4")}
						inputProps={{ placeholder: t("prediction.placeholders.percentExample"), addonAfter: "%" }}
					/>
				</div>
			</ProCard>

			{OPENAPI_OPERATION_SECTIONS.map(section => (
				<ProCard
					key={section.key}
					bordered
					headerBordered
					style={{ borderRadius: 16 }}
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
				</ProCard>
			))}

			<ProCard
				bordered
				headerBordered
				style={{ borderRadius: 16 }}
				title={t("prediction.sections.companyShares")}
			>
				<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
					<Typography.Paragraph style={{ marginBottom: 0, opacity: 0.8 }}>
						{t("prediction.messages.companySharesDescription")}
					</Typography.Paragraph>

					{OPENAPI_OPERATION_SECTIONS.map(section => (
						<ProCard
							key={`${section.key}-shares`}
							bordered
							style={{ borderRadius: 16 }}
							title={t(section.titleKey)}
							bodyStyle={{ display: "flex", flexDirection: "column", gap: 16 }}
						>
							<div className="grid gap-4 xl:grid-cols-3">
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
						</ProCard>
					))}
				</div>
			</ProCard>
		</div>
	);
}
