import type { PredictionFormValues } from "../../../model/prediction.form.types";
import { useAccess } from "#src/hooks";
import { RHFSelect } from "#src/shared/ui/rhf-pro";
import { ProCard } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "antd";
import { useEffect, useMemo, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { buildFiscalYearOptions } from "../../../model/prediction.helpers";
import { predictionServicesQuery } from "../../../queries/prediction.queries";
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
	const { getPermittedServiceIds } = useAccess();
	const { control, getValues, setValue } = useFormContext<PredictionFormValues>();

	const services = useQuery(predictionServicesQuery());
	const serviceId = useWatch({ control, name: "serviceId" });
	const serviceCode = useWatch({ control, name: "serviceCode" });
	const fiscalYear = useWatch({ control, name: "fiscalYear" });
	const trafficCompanyType = useWatch({ control, name: "serviceFields.companyType" as any });
	const module = serviceCode ? predictionServiceRegistry[serviceCode] : undefined;

	const permittedCreateIds = getPermittedServiceIds("predictions", "create");
	const serviceOptions = useMemo(() => {
		return (services.data?.results ?? [])
			.filter((service) => {
				if (permittedCreateIds.length > 0)
					return permittedCreateIds.includes(service.id);
				return service.permissions?.create ?? true;
			})
			.map(service => ({
				label: service.name,
				value: service.id,
				code: String(service.code ?? "").trim().toLowerCase(),
			}));
	}, [services.data, permittedCreateIds.join(",")]);

	const yearRecordsQuery = useQuery({
		queryKey: module?.getYearsQueryKey(serviceId) ?? ["predictions", "years", { serviceId, serviceCode }],
		enabled: autoHydrateBySelection && !!module && !!serviceId,
		queryFn: () => module!.fetchYears(serviceId!),
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
	const matchedYearRecord = useMemo(
		() => {
			if (!autoHydrateBySelection)
				return null;

			return module?.findRecordBySelection(existingYearRecords, {
				fiscalYear,
				serviceFields: {
					companyType: trafficCompanyType ?? null,
				},
			}) ?? null;
		},
		[autoHydrateBySelection, existingYearRecords, fiscalYear, module, trafficCompanyType],
	);

	useEffect(() => {
		if (!autoHydrateBySelection) {
			return;
		}

		if (yearRecordsQuery.isLoading) {
			return;
		}

		const stateKey = JSON.stringify({
			moduleCode: module?.code ?? null,
			fiscalYear: fiscalYear ?? null,
			recordId: Number((matchedYearRecord as { id?: unknown } | null)?.id ?? 0) || null,
			trafficCompanyType: trafficCompanyType ?? null,
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
	}, [autoHydrateBySelection, fiscalYear, getValues, matchedYearRecord, module, setValue, trafficCompanyType, yearRecordsQuery.isLoading]);

	const fiscalYearOptions = useMemo(() => {
		const existingYears = existingYearRecords.map(record => Number((record as any).fiscal_year));
		return buildFiscalYearOptions(existingYears);
	}, [existingYearRecords]);

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			<ProCard
				bordered
				headerBordered
				style={{ borderRadius: 16 }}
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

					<RHFSelect<PredictionFormValues, "fiscalYear", number | null>
						name="fiscalYear"
						label={t("prediction.labels.fiscalYear")}
						options={fiscalYearOptions}
						loading={yearRecordsQuery.isLoading}
						selectProps={{
							disabled,
							placeholder: t("prediction.placeholders.selectFiscalYear"),
							showSearch: true,
							optionFilterProp: "label",
						}}
					/>
				</div>
			</ProCard>

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
