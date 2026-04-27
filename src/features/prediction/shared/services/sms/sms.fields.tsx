import type {
	PredictionCompanyOption,
	PredictionFormValues,
	PredictionShareSectionValue,
} from "../../model/prediction.form.types";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { DeleteOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Form, Segmented, Select, Typography } from "antd";
import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { predictionCompaniesByServiceQuery } from "../../queries/prediction.queries";
import { QuarterDistributionSection } from "../../ui/form/sections/QuarterDistributionSection";
import { SMS_CHANNEL_OPTIONS } from "./sms.config";

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

function SmsShareEditor({
	companyOptions,
	fieldName,
	title,
}: {
	companyOptions: PredictionCompanyOption[]
	fieldName: "value" | "income" | "expense"
	title: string
}) {
	const { t } = useTranslation();
	const { control, formState, getFieldState, setValue } = useFormContext<PredictionFormValues>();
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

export function SmsPredictionFields() {
	const { t } = useTranslation();
	const { control } = useFormContext<PredictionFormValues>();
	const serviceId = useWatch({ control, name: "serviceId" });
	const companies = useQuery(predictionCompaniesByServiceQuery(serviceId));
	const channelValues = useWatch({ control, name: "serviceFields.channels.value" as any }) as Record<string, number | null> | undefined;

	const companyOptions = useMemo(
		() => (companies.data?.results ?? []).map(company => ({
			label: company.name,
			value: company.id,
		})),
		[companies.data],
	);
	const channelTotal = useMemo(
		() => SMS_CHANNEL_OPTIONS.reduce((total, channel) => total + Number(channelValues?.[channel.key] ?? 0), 0),
		[channelValues],
	);

	return (
		<div className="flex flex-col gap-4">
			<QuarterDistributionSection />

			<Card
				bordered
				className="rounded-2xl"
				title={t("prediction.operations.sms")}
			>
				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
					<RHFProNumber<PredictionFormValues, any>
						name={sf("valueYear") as any}
						label={t("prediction.labels.smsAnnualValue")}
						inputProps={{ placeholder: t("prediction.placeholders.amountExample") }}
						enableGrouping
						enableWordsTooltip
					/>
					<RHFProNumber<PredictionFormValues, any>
						name={sf("priceBuy") as any}
						label={t("prediction.labels.smsPriceBuy")}
						inputProps={{ placeholder: t("prediction.placeholders.smsPriceBuy") }}
						enableGrouping
						enableWordsTooltip
					/>
					<RHFProNumber<PredictionFormValues, any>
						name={sf("priceSell") as any}
						label={t("prediction.labels.smsPriceSell")}
						inputProps={{ placeholder: t("prediction.placeholders.smsPriceSell") }}
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
					<RHFProNumber<PredictionFormValues, any>
						name={sf("expenseYear") as any}
						label={t("prediction.labels.annualExpense")}
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

					<div className="prediction-share-editor-grid grid gap-4 xl:grid-cols-3">
						<SmsShareEditor
							companyOptions={companyOptions}
							fieldName="value"
							title={t("prediction.labels.smsAnnualValue")}
						/>
						<SmsShareEditor
							companyOptions={companyOptions}
							fieldName="income"
							title={t("prediction.metrics.income")}
						/>
						<SmsShareEditor
							companyOptions={companyOptions}
							fieldName="expense"
							title={t("prediction.metrics.expense")}
						/>
					</div>

					<Card
						bordered
						className="rounded-xl [&_.ant-pro-card-body]:flex [&_.ant-pro-card-body]:flex-col [&_.ant-pro-card-body]:gap-4"
						title={t("prediction.sections.channels", { defaultValue: "کانال‌ها" })}
					>
						<div className="grid gap-4 xl:grid-cols-3">
							{SMS_CHANNEL_OPTIONS.map(channel => (
								<RHFProNumber<PredictionFormValues, any>
									key={channel.key}
									name={`serviceFields.channels.value.${channel.key}` as any}
									label={channel.title}
									inputProps={{
										placeholder: t("prediction.placeholders.percentExample"),
										addonAfter: "%",
									}}
								/>
							))}
						</div>

						<Typography.Text type={channelTotal === 100 ? "success" : "danger"}>
							{t("prediction.messages.manualShareSum", {
								title: t("prediction.sections.channels", { defaultValue: "کانال‌ها" }),
								total: channelTotal,
							})}
						</Typography.Text>
					</Card>
				</div>
			</Card>
		</div>
	);
}
