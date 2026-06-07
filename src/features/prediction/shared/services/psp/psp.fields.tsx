import type {
	PredictionCompanyOption,
	PredictionFormValues,
	PredictionShareSectionValue,
} from "../../model/prediction.form.types";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { DeleteOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Form, Segmented, Select, Typography } from "antd";
import { useEffect, useMemo, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { companyTypeMatches } from "../../model/company-type.helpers";
import { predictionCompaniesByServiceQuery } from "../../queries/prediction.queries";
import { QuarterDistributionSection } from "../../ui/form/sections/QuarterDistributionSection";
import { createEmptyYearlyValueIncomeManualShares } from "./psp.config";

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

function getSelectedCompanyOptions(
	companyOptions: PredictionCompanyOption[],
	selectedCompanyIds: number[],
) {
	const selectedSet = new Set(selectedCompanyIds);
	return companyOptions.filter(option => selectedSet.has(option.value));
}

function YearlyValueIncomeShareEditor({
	companyOptions,
	fieldName,
	title,
}: {
	companyOptions: PredictionCompanyOption[]
	fieldName: "value" | "income"
	title: string
}) {
	const { t } = useTranslation();
	const { control, formState, getFieldState, register, setValue } = useFormContext<PredictionFormValues>();
	const fieldPath = `serviceFields.manualShares.${fieldName}` as const;
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
		<Card
			bordered
			className="rounded-xl [&_.ant-pro-card-body]:flex [&_.ant-pro-card-body]:flex-col [&_.ant-pro-card-body]:gap-4"
			title={title}
		>
			<Segmented
				block
				value={shareState.mode}
				onChange={mode => updateShareState({ ...shareState, mode: mode === "manual" ? "manual" : "auto" })}
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
							{t("prediction.messages.manualShareSum", { title, total: shareTotal })}
						</Typography.Text>
					</div>
				)}
		</Card>
	);
}

interface YearlyValueIncomeFieldsProps {
	operationTitleKey: string
	requiresCompanyType?: boolean
}

export function YearlyValueIncomePredictionFields({ operationTitleKey, requiresCompanyType = false }: YearlyValueIncomeFieldsProps) {
	const { t } = useTranslation();
	const { control, setValue } = useFormContext<PredictionFormValues>();
	const serviceId = useWatch({ control, name: "serviceId" });
	const companyType = useWatch({ control, name: sf("companyType") as any });
	const companies = useQuery(predictionCompaniesByServiceQuery(serviceId));
	const previousCompanyTypeRef = useRef(companyType);

	useEffect(() => {
		const previousCompanyType = previousCompanyTypeRef.current;
		previousCompanyTypeRef.current = companyType;

		if (!requiresCompanyType || previousCompanyType === undefined || previousCompanyType === companyType)
			return;

		setValue(sf("manualShares") as any, createEmptyYearlyValueIncomeManualShares(), {
			shouldDirty: true,
			shouldValidate: true,
		});
	}, [companyType, requiresCompanyType, setValue]);

	const companyOptions = useMemo(
		() => (companies.data?.results ?? [])
			.filter(company => !requiresCompanyType || companyTypeMatches(company.company_type, companyType))
			.map(company => ({
				label: company.name,
				value: company.id,
			})),
		[companies.data, companyType, requiresCompanyType],
	);

	return (
		<div className="flex flex-col gap-4">
			<QuarterDistributionSection />

			<Card
				bordered
				className="rounded-2xl"
				title={t(operationTitleKey)}
			>
				<div className="grid gap-3 md:grid-cols-2">
					<RHFProNumber<PredictionFormValues, any>
						name={sf("valueYear") as any}
						label={t("prediction.labels.annualValue")}
						inputProps={{ placeholder: t("prediction.placeholders.amountExample") }}
						enableGrouping
						enableWordsTooltip
					/>
					<RHFProNumber<PredictionFormValues, any>
						name={sf("incomeYear") as any}
						label={t("prediction.labels.annualIncome")}
						inputProps={{ placeholder: t("prediction.placeholders.amountExample") }}
						enableGrouping
						enableWordsTooltip
					/>
				</div>
			</Card>

			<Card
				bordered

				className="rounded-2xl"
				title={t("prediction.sections.companyShares")}
			>
				<div className="flex flex-col gap-4">
					<Typography.Paragraph className="mb-0 opacity-80">
						{t("prediction.messages.companySharesDescription")}
					</Typography.Paragraph>

					<div className="grid gap-4 xl:grid-cols-2">
						<YearlyValueIncomeShareEditor
							companyOptions={companyOptions}
							fieldName="value"
							title={t("prediction.metrics.value")}
						/>
						<YearlyValueIncomeShareEditor
							companyOptions={companyOptions}
							fieldName="income"
							title={t("prediction.metrics.income")}
						/>
					</div>
				</div>
			</Card>
		</div>
	);
}

export function PspPredictionFields() {
	return <YearlyValueIncomePredictionFields operationTitleKey="prediction.operations.psp" requiresCompanyType />;
}
