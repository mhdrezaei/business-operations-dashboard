import type {
	PredictionCompanyOption,
	PredictionFormValues,
	PredictionShareSectionValue,
	TrafficLocationCode,
	TrafficPredictionLocationFormValue,
	TrafficPredictionMetricCode,
} from "../../model/prediction.form.types";
import { RHFProNumber, RHFSelect } from "#src/shared/ui/rhf-pro";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Form, Segmented, Select, Typography } from "antd";
import { useEffect, useMemo, useRef } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { companyTypeMatches } from "../../model/company-type.helpers";
import { predictionCompaniesByServiceQuery } from "../../queries/prediction.queries";
import { QuarterDistributionSection } from "../../ui/form/sections/QuarterDistributionSection";
import {
	createEmptyTrafficLocation,
	createEmptyTrafficManualShares,
	isTrafficLocationCode,
	normalizeTrafficLocationCode,
	TRAFFIC_LOCATION_OPTIONS,
	TRAFFIC_METRICS,
} from "./traffic.config";

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

function TrafficShareEditor({
	companyOptions,
	locationCode,
	locationTitle,
	metricKey,
	metricTitle,
}: {
	companyOptions: PredictionCompanyOption[]
	locationCode: TrafficLocationCode
	locationTitle: string
	metricKey: TrafficPredictionMetricCode
	metricTitle: string
}) {
	const { t } = useTranslation();
	const { control, formState, getFieldState, setValue } = useFormContext<PredictionFormValues>();
	const fieldPath = `serviceFields.manualShares.${locationCode}.${metricKey}` as const;
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
			title={metricTitle}
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
							{t("prediction.messages.manualShareSum", { title: `${locationTitle} - ${metricTitle}`, total: shareTotal })}
						</Typography.Text>
					</div>
				)}
		</Card>
	);
}

function normalizeLocations(value: unknown): TrafficPredictionLocationFormValue[] {
	if (!Array.isArray(value))
		return [];

	return value.map((item) => {
		const raw = item && typeof item === "object" ? item as Record<string, unknown> : {};
		return {
			location: normalizeTrafficLocationCode(raw.location),
			valueYear: typeof raw.valueYear === "number" ? raw.valueYear : null,
			valueReceiveYear: typeof raw.valueReceiveYear === "number" ? raw.valueReceiveYear : null,
			incomeYear: typeof raw.incomeYear === "number" ? raw.incomeYear : null,
			expenseYear: typeof raw.expenseYear === "number" ? raw.expenseYear : null,
		};
	});
}

export function TrafficPredictionFields() {
	const { t } = useTranslation();
	const { control, setValue } = useFormContext<PredictionFormValues>();
	const serviceId = useWatch({ control, name: "serviceId" });
	const companyType = useWatch({ control, name: sf("companyType") as any });
	const locations = normalizeLocations(useWatch({ control, name: sf("locations") as any }));
	const companies = useQuery(predictionCompaniesByServiceQuery(serviceId));
	const { fields, append, remove } = useFieldArray({
		control: control as any,
		name: sf("locations") as never,
	});

	const previousCompanyTypeRef = useRef(companyType);

	useEffect(() => {
		const previousCompanyType = previousCompanyTypeRef.current;
		previousCompanyTypeRef.current = companyType;

		if (previousCompanyType === undefined || previousCompanyType === companyType)
			return;

		setValue(sf("manualShares") as any, createEmptyTrafficManualShares(), {
			shouldDirty: true,
			shouldValidate: true,
		});
	}, [companyType, setValue]);

	const filteredCompanies = useMemo(
		() => (companies.data?.results ?? []).filter(company => companyTypeMatches(company.company_type, companyType)),
		[companies.data, companyType],
	);

	const companyOptions = useMemo(
		() => filteredCompanies.map(company => ({
			label: company.name,
			value: company.id,
		})),
		[filteredCompanies],
	);

	const selectedLocationCodes = useMemo(
		() => locations
			.map(location => location.location)
			.filter((location): location is TrafficLocationCode => isTrafficLocationCode(location)),
		[locations],
	);

	const availableLocations = useMemo(
		() => TRAFFIC_LOCATION_OPTIONS.filter(option => !selectedLocationCodes.includes(option.value)),
		[selectedLocationCodes],
	);

	const locationTitles = useMemo(
		() => Object.fromEntries(
			TRAFFIC_LOCATION_OPTIONS.map(option => [option.value, t(option.labelKey)]),
		) as Record<TrafficLocationCode, string>,
		[t],
	);

	const metricTitles = useMemo(
		() => Object.fromEntries(
			TRAFFIC_METRICS.map(metric => [metric.key, t(metric.titleKey)]),
		) as Record<TrafficPredictionMetricCode, string>,
		[t],
	);

	function handleAddLocation() {
		append(createEmptyTrafficLocation(availableLocations[0]?.value ?? null) as never);
	}

	return (
		<div className="flex flex-col gap-4">
			<QuarterDistributionSection />

			<Card
				bordered
				className="rounded-2xl"
				title={t("prediction.operations.traffic")}
				extra={(
					<Button
						icon={<PlusOutlined />}
						onClick={handleAddLocation}
						disabled={availableLocations.length < 1}
					>
						{t("prediction.actions.addLocation")}
					</Button>
				)}
			>
				<div className="flex flex-col gap-4">
					{fields.map((field, index) => {
						const locationCode = locations[index]?.location;
						const title = locationCode
							? locationTitles[locationCode]
							: t("prediction.labels.trafficLocation");

						return (
							<Card
								key={field.id}
								bordered
								className="rounded-xl"
								title={title}
								extra={fields.length > 1
									? (
										<Button
											danger
											icon={<DeleteOutlined />}
											onClick={() => remove(index)}
										/>
									)
									: undefined}
							>
								<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
									<RHFSelect<PredictionFormValues, any, any>
										name={sf(`locations.${index}.location`) as any}
										label={t("prediction.labels.trafficLocation")}
										options={TRAFFIC_LOCATION_OPTIONS.map(option => ({
											label: t(option.labelKey),
											value: option.value,
										}))}
										selectProps={{
											allowClear: true,
											placeholder: t("prediction.placeholders.selectLocation"),
										}}
									/>
									<RHFProNumber<PredictionFormValues, any>
										name={sf(`locations.${index}.valueYear`) as any}
										label={t("prediction.labels.annualValue")}
										inputProps={{ placeholder: t("prediction.placeholders.amountExample") }}
										enableGrouping
										enableWordsTooltip
									/>
									<RHFProNumber<PredictionFormValues, any>
										name={sf(`locations.${index}.valueReceiveYear`) as any}
										label={t("prediction.labels.trafficAnnualValueReceive")}
										inputProps={{ placeholder: t("prediction.placeholders.amountExample") }}
										enableGrouping
										enableWordsTooltip
									/>
									<RHFProNumber<PredictionFormValues, any>
										name={sf(`locations.${index}.incomeYear`) as any}
										label={t("prediction.labels.annualIncome")}
										inputProps={{ placeholder: t("prediction.placeholders.amountExample") }}
										enableGrouping
										enableWordsTooltip
									/>
									<RHFProNumber<PredictionFormValues, any>
										name={sf(`locations.${index}.expenseYear`) as any}
										label={t("prediction.labels.annualExpense")}
										inputProps={{ placeholder: t("prediction.placeholders.amountExample") }}
										enableGrouping
										enableWordsTooltip
									/>
								</div>
							</Card>
						);
					})}
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

					{selectedLocationCodes.map(locationCode => (
						<Card
							key={locationCode}
							bordered
							className="rounded-xl [&_.ant-pro-card-body]:flex [&_.ant-pro-card-body]:flex-col [&_.ant-pro-card-body]:gap-4"
							title={locationTitles[locationCode]}
						>
							<div className="grid gap-4 xl:grid-cols-2">
								{TRAFFIC_METRICS.map(metric => (
									<TrafficShareEditor
										key={`${locationCode}-${metric.key}`}
										companyOptions={companyOptions}
										locationCode={locationCode}
										locationTitle={locationTitles[locationCode]}
										metricKey={metric.key}
										metricTitle={metricTitles[metric.key]}
									/>
								))}
							</div>
						</Card>
					))}
				</div>
			</Card>
		</div>
	);
}
