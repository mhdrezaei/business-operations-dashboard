import type { PredictionFormValues } from "../../../model/prediction.form.types";
import { useAccess } from "#src/hooks";
import { AlignedFormField } from "#src/shared/ui/aligned-form-field";
import { RHFSelect } from "#src/shared/ui/rhf-pro";
import { SectionCard } from "#src/shared/ui/section-card";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "antd";
import { useEffect, useMemo, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { getCompanyTypeToken } from "../../../model/company-type.helpers";
import { isAvailablePredictionCompanyType, isSupportedPredictionService, pickQuarterFields, PREDICTION_FISCAL_YEAR_OPTIONS } from "../../../model/prediction.helpers";
import { predictionCompaniesByServiceQuery, predictionServicesQuery } from "../../../queries/prediction.queries";
import { predictionServiceRegistry } from "../../../services/registry";

interface Props {
	titleKey?: string
	disabled?: boolean
	autoHydrateBySelection?: boolean
	hideMatchedRecordAlert?: boolean
}

export function FixedStartSection({
	titleKey = "prediction.titles.create",
	disabled = false,
	autoHydrateBySelection = true,
	hideMatchedRecordAlert = false,
}: Props) {
	const { t } = useTranslation();
	const { getPermittedCompanyTypes, getPermittedServiceIds } = useAccess();
	const { control, getValues, setValue } = useFormContext<PredictionFormValues>();

	const serviceId = useWatch({ control, name: "serviceId" });
	const serviceCode = useWatch({ control, name: "serviceCode" });
	const fiscalYear = useWatch({ control, name: "fiscalYear" });
	const companyType = useWatch({ control, name: "serviceFields.companyType" as any });
	const services = useQuery(predictionServicesQuery());
	const companies = useQuery(predictionCompaniesByServiceQuery(serviceId));
	const module = serviceCode ? predictionServiceRegistry[serviceCode] : undefined;
	const requiresCompanyType = serviceCode === "sms" || serviceCode === "psp" || serviceCode === "traffic";
	const permissionAction = disabled ? "update" : "create";

	const permittedServiceIds = getPermittedServiceIds("predictions", permissionAction);
	const serviceOptions = useMemo(() => {
		return (services.data?.results ?? [])
			.filter(service => isSupportedPredictionService(service.code))
			.filter((service) => {
				if (permittedServiceIds.length > 0)
					return permittedServiceIds.includes(service.id);
				return permissionAction === "update"
					? (service.permissions?.update ?? true)
					: (service.permissions?.create ?? true);
			})
			.map(service => ({
				label: service.name,
				value: service.id,
				code: String(service.code ?? "").trim().toLowerCase(),
			}));
	}, [permissionAction, services.data, permittedServiceIds.join(",")]);

	const shouldLoadYears = !requiresCompanyType || !!companyType;
	const yearRecordsQuery = useQuery({
		queryKey: module?.getYearsQueryKey(serviceId, companyType) ?? ["predictions", "years", { serviceId, serviceCode, companyType }],
		enabled: autoHydrateBySelection && !!module && !!serviceId && shouldLoadYears,
		queryFn: () => module!.fetchYears(serviceId!, companyType),
		staleTime: 30 * 1000,
	});

	const prevServiceIdRef = useRef<number | null | undefined>(undefined);
	const lastHydratedStateKeyRef = useRef<string>("");
	const keepDraftRef = useRef(false);

	useEffect(() => {
		const prevServiceId = prevServiceIdRef.current;
		prevServiceIdRef.current = serviceId;

		if (prevServiceId === undefined || prevServiceId === serviceId)
			return;

		const currentFields = getValues("serviceFields");
		setValue("recordId", null, { shouldDirty: true, shouldValidate: false });
		setValue("serviceFields", { ...module?.createEmptyServiceFields(), ...pickQuarterFields(currentFields) }, {
			shouldDirty: true,
			shouldValidate: false,
		});
		keepDraftRef.current = true;
		lastHydratedStateKeyRef.current = "";
	}, [getValues, module, serviceId, setValue]);

	useEffect(() => {
		if (!serviceId) {
			if (getValues("serviceCode") !== null) {
				setValue("serviceCode", null, { shouldDirty: false, shouldValidate: false });
			}
			return;
		}

		const selected = serviceOptions.find(option => option.value === serviceId);
		const nextCode = (selected?.code ?? null) as PredictionFormValues["serviceCode"];
		if (getValues("serviceCode") !== nextCode) {
			setValue("serviceCode", nextCode, { shouldDirty: false, shouldValidate: false });
			const nextModule = nextCode ? predictionServiceRegistry[nextCode] : undefined;
			setValue("serviceFields", { ...nextModule?.createEmptyServiceFields(), ...pickQuarterFields(getValues("serviceFields")) }, {
				shouldDirty: false,
				shouldValidate: false,
			});
			lastHydratedStateKeyRef.current = "";
		}
	}, [getValues, serviceId, serviceOptions, setValue]);

	const existingYearRecords = yearRecordsQuery.data?.results ?? [];
	const companyTypeOptions = useMemo(
		() => {
			if (!requiresCompanyType || !serviceId)
				return [];

			const permissionOptions = getPermittedCompanyTypes("predictions", permissionAction, serviceId)
				.filter(item => isAvailablePredictionCompanyType(serviceCode, item.key))
				.map(item => ({ label: item.value, value: item.key }));
			if (permissionOptions.length > 0)
				return permissionOptions;

			return Array.from(
				new Set(
					(companies.data?.results ?? [])
						.map(company => getCompanyTypeToken(company.company_type))
						.filter((type): type is string => Boolean(type))
						.filter(type => isAvailablePredictionCompanyType(serviceCode, type)),
				),
			).map(type => ({
				label: type,
				value: type,
			}));
		},
		[companies.data, permissionAction, requiresCompanyType, serviceCode, serviceId, getPermittedCompanyTypes],
	);
	const companyTypeLabel = serviceCode === "traffic"
		? t("prediction.labels.trafficCompanyType")
		: t("prediction.labels.companyType");
	const matchedYearRecord = useMemo(
		() => {
			if (!autoHydrateBySelection || !shouldLoadYears)
				return null;

			return module?.findRecordBySelection(existingYearRecords, {
				fiscalYear,
				serviceFields: {
					companyType: companyType ?? null,
				},
			}) ?? null;
		},
		[autoHydrateBySelection, existingYearRecords, fiscalYear, module, companyType, shouldLoadYears],
	);

	useEffect(() => {
		if (!autoHydrateBySelection) {
			return;
		}

		if (!shouldLoadYears || yearRecordsQuery.isLoading) {
			return;
		}

		const stateKey = JSON.stringify({
			moduleCode: module?.code ?? null,
			fiscalYear: fiscalYear ?? null,
			recordId: Number((matchedYearRecord as { id?: unknown } | null)?.id ?? 0) || null,
			companyType: companyType ?? null,
		});

		if (stateKey === lastHydratedStateKeyRef.current) {
			return;
		}

		const currentFields = getValues("serviceFields");

		if (!module) {
			setValue("recordId", null, { shouldDirty: false, shouldValidate: false });
			setValue("note", "", { shouldDirty: false, shouldValidate: false });
			setValue("serviceFields", {}, { shouldDirty: false, shouldValidate: false });
			lastHydratedStateKeyRef.current = stateKey;
			return;
		}

		// after a service change the quarters and note stay (the old panel keeps them)
		const keepDraft = keepDraftRef.current;
		const resetDraft = () => {
			setValue("recordId", null, { shouldDirty: false, shouldValidate: false });
			if (!keepDraft)
				setValue("note", "", { shouldDirty: false, shouldValidate: false });
			setValue("serviceFields", {
				...module.createEmptyServiceFields(currentFields),
				...(keepDraft ? pickQuarterFields(currentFields) : {}),
			}, {
				shouldDirty: false,
				shouldValidate: false,
			});
			lastHydratedStateKeyRef.current = stateKey;
		};

		if (fiscalYear == null) {
			resetDraft();
			return;
		}

		if (matchedYearRecord) {
			const mapped = module.toFormValues(matchedYearRecord);
			setValue("recordId", mapped.recordId ?? null, { shouldDirty: false, shouldValidate: false });
			setValue("note", mapped.note ?? "", { shouldDirty: false, shouldValidate: false });
			setValue("serviceFields", mapped.serviceFields ?? module.createEmptyServiceFields(), {
				shouldDirty: false,
				shouldValidate: false,
			});
			keepDraftRef.current = false;
			lastHydratedStateKeyRef.current = stateKey;
			return;
		}

		resetDraft();
		keepDraftRef.current = false;
	}, [autoHydrateBySelection, fiscalYear, getValues, matchedYearRecord, module, setValue, companyType, shouldLoadYears, yearRecordsQuery.isLoading]);

	const companyTypePlaceholder = t("prediction.placeholders.selectTrafficCompanyType");
	return (
		<div className="flex flex-col gap-4">
			<SectionCard title={t(titleKey)} tone="primary" collapsible={false}>
				<div className="aligned-form-grid aligned-form-grid--two">
					<AlignedFormField label={t("prediction.labels.service")} labelId="prediction-form-label-service">
						<RHFSelect<PredictionFormValues, "serviceId", number | null>
							name="serviceId"
							label=""
							options={serviceOptions.map(option => ({
								label: option.label,
								value: option.value,
							}))}
							autoSelectSingle
							loading={services.isLoading}
							selectProps={{
								disabled,
								placeholder: t("prediction.placeholders.selectService"),
								showSearch: true,
								optionFilterProp: "label",
							}}
						/>
					</AlignedFormField>

					{requiresCompanyType
						? (
							<AlignedFormField label={companyTypeLabel} labelId="prediction-form-label-company-type">
								<RHFSelect<PredictionFormValues, any, string | null>
									name={"serviceFields.companyType" as any}
									label=""
									options={companyTypeOptions}
									autoSelectSingle
									selectProps={{
										disabled,
										allowClear: true,
										placeholder: companyTypePlaceholder,
										showSearch: true,
										optionFilterProp: "label",
									}}
								/>
							</AlignedFormField>
						)
						: null}

					<AlignedFormField label={t("prediction.labels.fiscalYear")} labelId="prediction-form-label-fiscal-year">
						<RHFSelect<PredictionFormValues, "fiscalYear", number | null>
							name="fiscalYear"
							label=""
							options={PREDICTION_FISCAL_YEAR_OPTIONS}
							loading={yearRecordsQuery.isLoading}
							selectProps={{
								disabled: disabled || (requiresCompanyType && !companyType),
								placeholder: requiresCompanyType && !companyType
									? t("prediction.placeholders.selectCompanyTypeFirst")
									: t("prediction.placeholders.selectFiscalYear"),
								showSearch: true,
								optionFilterProp: "label",
							}}
						/>
					</AlignedFormField>
				</div>
			</SectionCard>

			{matchedYearRecord && !hideMatchedRecordAlert
				? (
					<Alert
						type="info"
						showIcon
						message={t("prediction.messages.editingExistingYear", { fiscalYear })}
					/>
				)
				: null}
		</div>
	);
}
