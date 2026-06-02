import type { PredictionFormValues } from "../../../model/prediction.form.types";
import { useAccess } from "#src/hooks";
import { RHFSelect } from "#src/shared/ui/rhf-pro";
import { useQuery } from "@tanstack/react-query";
import { Alert, Card } from "antd";
import { useEffect, useMemo, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { getCompanyTypeToken } from "../../../model/company-type.helpers";
import { buildFiscalYearOptions } from "../../../model/prediction.helpers";
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

	useEffect(() => {
		const prevServiceId = prevServiceIdRef.current;
		prevServiceIdRef.current = serviceId;

		if (prevServiceId === undefined || prevServiceId === serviceId)
			return;

		const currentFields = getValues("serviceFields");
		setValue("recordId", null, { shouldDirty: true, shouldValidate: false });
		setValue("fiscalYear", null, { shouldDirty: true, shouldValidate: false });
		setValue("note", "", { shouldDirty: true, shouldValidate: false });
		setValue("serviceFields", module?.createEmptyServiceFields(currentFields) ?? {}, {
			shouldDirty: true,
			shouldValidate: false,
		});
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
			setValue("serviceFields", nextModule?.createEmptyServiceFields(getValues("serviceFields")) ?? {}, {
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
				.map(item => ({ label: item.value, value: item.key }));
			if (permissionOptions.length > 0)
				return permissionOptions;

			return Array.from(
				new Set(
					(companies.data?.results ?? [])
						.map(company => getCompanyTypeToken(company.company_type))
						.filter((type): type is string => Boolean(type)),
				),
			).map(type => ({
				label: type,
				value: type,
			}));
		},
		[companies.data, permissionAction, requiresCompanyType, serviceId, getPermittedCompanyTypes],
	);
	const companyTypeLabel = serviceCode === "traffic"
		? t("prediction.labels.trafficCompanyType")
		: t("prediction.labels.companyType", { defaultValue: "نوع شرکت" });
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

		if (fiscalYear == null) {
			setValue("recordId", null, { shouldDirty: false, shouldValidate: false });
			setValue("note", "", { shouldDirty: false, shouldValidate: false });
			setValue("serviceFields", module.createEmptyServiceFields(currentFields), {
				shouldDirty: false,
				shouldValidate: false,
			});
			lastHydratedStateKeyRef.current = stateKey;
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
			lastHydratedStateKeyRef.current = stateKey;
			return;
		}

		setValue("recordId", null, { shouldDirty: false, shouldValidate: false });
		setValue("note", "", { shouldDirty: false, shouldValidate: false });
		setValue("serviceFields", module.createEmptyServiceFields(currentFields), {
			shouldDirty: false,
			shouldValidate: false,
		});
		lastHydratedStateKeyRef.current = stateKey;
	}, [autoHydrateBySelection, fiscalYear, getValues, matchedYearRecord, module, setValue, companyType, shouldLoadYears, yearRecordsQuery.isLoading]);

	const fiscalYearOptions = useMemo(() => {
		const existingYears = existingYearRecords.map(record => Number((record as any).fiscal_year));
		return buildFiscalYearOptions(existingYears);
	}, [existingYearRecords]);
	const companyTypePlaceholder = t("prediction.placeholders.selectTrafficCompanyType");
	const selectCompanyTypeFirstText = "ابتدا نوع شرکت را انتخاب کنید";

	return (
		<div className="flex flex-col gap-4">
			<Card
				bordered
				className="rounded-2xl"
				title={t(titleKey)}
			>
				<div className="grid gap-3 md:grid-cols-2">
					<RHFSelect<PredictionFormValues, "serviceId", number | null>
						name="serviceId"
						label={t("prediction.labels.service")}
						options={serviceOptions.map(option => ({
							label: option.label,
							value: option.value,
						}))}
						loading={services.isLoading}
						selectProps={{
							disabled,
							placeholder: t("prediction.placeholders.selectService"),
							showSearch: true,
							optionFilterProp: "label",
						}}
					/>

					{requiresCompanyType
						? (
							<RHFSelect<PredictionFormValues, any, string | null>
								name={"serviceFields.companyType" as any}
								label={companyTypeLabel}
								options={companyTypeOptions}
								selectProps={{
									disabled,
									allowClear: true,
									placeholder: companyTypePlaceholder,
									showSearch: true,
									optionFilterProp: "label",
								}}
							/>
						)
						: null}

					<RHFSelect<PredictionFormValues, "fiscalYear", number | null>
						name="fiscalYear"
						label={t("prediction.labels.fiscalYear")}
						options={fiscalYearOptions}
						loading={yearRecordsQuery.isLoading}
						selectProps={{
							disabled: disabled || (requiresCompanyType && !companyType),
							placeholder: requiresCompanyType && !companyType
								? selectCompanyTypeFirstText
								: t("prediction.placeholders.selectFiscalYear"),
							showSearch: true,
							optionFilterProp: "label",
						}}
					/>
				</div>
			</Card>

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
