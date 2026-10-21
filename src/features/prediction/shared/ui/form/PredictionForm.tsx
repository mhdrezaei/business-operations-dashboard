import type { Resolver, UseFormReturn } from "react-hook-form";
import type { PredictionFormValues } from "../../model/prediction.form.types";
import { BasicContent } from "#src/components";
import { useAccess } from "#src/hooks";
import { RHFProTextArea } from "#src/shared/ui/rhf-pro";
import { SectionCard } from "#src/shared/ui/section-card";
import { notification } from "#src/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { buildPredictionSchema } from "../../model/prediction.schema";
import { predictionServiceRegistry } from "../../services/registry";
import { RegisteredPredictionsPanel } from "./components/RegisteredPredictionsPanel";
import { ActionSection } from "./sections/ActionSection";
import { FixedStartSection } from "./sections/FixedStartSection";
import "#src/shared/ui/form-layout/styles.css";
import "./prediction-form.css";

interface Props {
	initialValues?: Partial<PredictionFormValues> | null
	mode?: "create" | "edit"
	titleKey?: string
	baseFieldsDisabled?: boolean
	onSubmit?: (
		values: PredictionFormValues,
		form: UseFormReturn<PredictionFormValues>,
	) => void | Promise<void>
	submitting?: boolean
}

const defaultValues: PredictionFormValues = {
	recordId: null,
	serviceId: null,
	serviceCode: null,
	fiscalYear: null,
	note: "",
	serviceFields: {},
};

function normalizeComparableValue(value: unknown): unknown {
	if (value == null)
		return null;
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed)
			return "";
		const numeric = Number(trimmed);
		return Number.isFinite(numeric) ? numeric : trimmed;
	}
	if (Array.isArray(value))
		return value.map(normalizeComparableValue);
	if (typeof value === "object") {
		return Object.keys(value as Record<string, unknown>)
			.sort()
			.reduce<Record<string, unknown>>((result, key) => {
				result[key] = normalizeComparableValue((value as Record<string, unknown>)[key]);
				return result;
			}, {});
	}
	return value;
}

function getComparablePredictionContent(values: Partial<PredictionFormValues>) {
	return JSON.stringify(normalizeComparableValue({
		note: values.note ?? "",
		serviceFields: values.serviceFields ?? {},
	}));
}

function extractFirstErrorMessage(value: unknown): string | null {
	if (typeof value === "string") {
		const text = value.trim();
		return text.length ? text : null;
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			const message = extractFirstErrorMessage(item);
			if (message)
				return message;
		}
		return null;
	}

	if (value && typeof value === "object") {
		const record = value as Record<string, unknown>;
		if (Array.isArray(record.non_field_errors)) {
			const message = extractFirstErrorMessage(record.non_field_errors);
			if (message)
				return message;
		}
		for (const key of Object.keys(record)) {
			const message = extractFirstErrorMessage(record[key]);
			if (message)
				return message;
		}
	}

	return null;
}

function extractFirstFormErrorMessage(value: unknown): string | null {
	if (!value || typeof value !== "object")
		return null;

	const record = value as Record<string, unknown>;
	if (typeof record.message === "string" && record.message.trim())
		return record.message;

	for (const key of Object.keys(record)) {
		const message = extractFirstFormErrorMessage(record[key]);
		if (message)
			return message;
	}

	return null;
}

export function PredictionForm({
	initialValues,
	mode = "create",
	titleKey,
	baseFieldsDisabled = false,
	onSubmit: onSubmitProp,
	submitting,
}: Props) {
	const { t } = useTranslation();
	const { hasDomainPermissionByServiceId } = useAccess();

	const resolveSubmitErrorMessage = useCallback(async (error: any) => {
		if (error?.response) {
			try {
				const data = await error.response.clone().json();
				const extracted = extractFirstErrorMessage(data);
				if (extracted)
					return extracted;
			}
			catch {
				// ignore invalid response body
			}
		}

		if (typeof error?.message === "string" && error.message.trim())
			return error.message;

		return t("prediction.messages.unknownError");
	}, [t]);

	const dynamicResolver: Resolver<PredictionFormValues> = useCallback(
		async (values, context, options) => {
			const schema = buildPredictionSchema(values.serviceCode);
			const resolver = zodResolver(schema) as unknown as Resolver<PredictionFormValues>;
			return resolver(values, context, options);
		},
		[],
	);

	const mergedInitialValues = useMemo(() => {
		if (!initialValues)
			return defaultValues;

		return {
			...defaultValues,
			...initialValues,
			serviceFields: {
				...(defaultValues.serviceFields ?? {}),
				...(initialValues.serviceFields ?? {}),
			},
		} satisfies PredictionFormValues;
	}, [initialValues]);

	const form = useForm<PredictionFormValues>({
		defaultValues: mergedInitialValues,
		mode: "all",
		shouldUnregister: false,
		resolver: dynamicResolver,
	});
	const interactionRef = useRef<{ baseKey: string, baseline: string } | null>(null);
	const [interaction, setInteraction] = useState<{ baseKey: string, baseline: string } | null>(null);
	const watchedValues = useWatch({ control: form.control, defaultValue: mergedInitialValues as any });

	useEffect(() => {
		form.register("recordId");
		form.register("serviceCode");
	}, [form]);

	useEffect(() => {
		if (!initialValues)
			return;
		form.reset(mergedInitialValues, {
			keepDirty: false,
			keepTouched: false,
		});
	}, [form, initialValues, mergedInitialValues]);

	const serviceId = useWatch({
		control: form.control,
		name: "serviceId",
	});
	const serviceCode = useWatch({
		control: form.control,
		name: "serviceCode",
	});
	const fiscalYear = useWatch({
		control: form.control,
		name: "fiscalYear",
	});
	const recordId = useWatch({
		control: form.control,
		name: "recordId",
	});
	const companyType = useWatch({
		control: form.control,
		name: "serviceFields.companyType" as any,
	});
	const module = serviceCode ? predictionServiceRegistry[serviceCode] : undefined;
	const requiresCompanyType = serviceCode === "sms" || serviceCode === "psp" || serviceCode === "traffic";
	const canShowServiceForm = !!serviceCode && fiscalYear != null && (!requiresCompanyType || !!companyType);
	const canViewRegisteredPredictions = hasDomainPermissionByServiceId(
		"predictions",
		"view",
		serviceId,
		typeof companyType === "string" ? companyType : null,
	);
	const canShowRegisteredPredictions = !!serviceId && !!serviceCode && !!module && (!requiresCompanyType || !!companyType) && canViewRegisteredPredictions;

	const canSubmit = recordId
		? hasDomainPermissionByServiceId("predictions", "update", serviceId, typeof companyType === "string" ? companyType : null)
		: hasDomainPermissionByServiceId("predictions", "create", serviceId, typeof companyType === "string" ? companyType : null);

	const baseSelectionKey = `${mode}:${serviceId ?? ""}:${fiscalYear ?? ""}`;
	const hasMeaningfulChange = useMemo(() => {
		if (interaction?.baseKey !== baseSelectionKey)
			return false;
		return getComparablePredictionContent(watchedValues) !== interaction.baseline;
	}, [baseSelectionKey, interaction, watchedValues]);
	const captureBaseline = () => {
		if (interactionRef.current?.baseKey === baseSelectionKey)
			return;
		const nextInteraction = {
			baseKey: baseSelectionKey,
			baseline: getComparablePredictionContent(form.getValues()),
		};
		interactionRef.current = nextInteraction;
		setInteraction(nextInteraction);
	};
	const submit = form.handleSubmit(
		async (values) => {
			if (!onSubmitProp)
				return;

			try {
				await onSubmitProp(values, form);
				interactionRef.current = null;
				setInteraction(null);
			}
			catch (error: any) {
				const description = await resolveSubmitErrorMessage(error);
				notification.error({
					message: t("prediction.messages.submitError"),
					description,
					placement: "topRight",
					className: "prediction-submit-notification",
				});
			}
		},
		(errors) => {
			const message = extractFirstFormErrorMessage(errors);
			notification.error({
				message: t("prediction.messages.fixFormErrors"),
				description: message ?? t("prediction.messages.invalidFormInputs"),
				placement: "topRight",
				className: "prediction-submit-notification",
			});
		},
	);

	function triggerSubmit() {
		if (!canSubmit)
			return;
		void submit();
	}

	function selectRegisteredPrediction(record: unknown) {
		if (!module || !serviceCode || !serviceId)
			return;
		const selectedValues = module.toFormValues(record);
		form.reset({
			...defaultValues,
			...form.getValues(),
			...selectedValues,
			serviceId,
			serviceCode,
			serviceFields: {
				...module.createEmptyServiceFields(form.getValues("serviceFields")),
				...(selectedValues.serviceFields ?? {}),
			},
		}, {
			keepDirty: false,
			keepTouched: false,
		});
		interactionRef.current = null;
		setInteraction(null);
	}

	return (
		<FormProvider {...form}>
			<BasicContent>
				<div
					className="form-layout prediction-form prediction-form-layout"
					onChangeCapture={captureBaseline}
					onKeyDownCapture={captureBaseline}
					onPointerDownCapture={captureBaseline}
				>
					<input type="hidden" {...form.register("recordId")} />
					<input type="hidden" {...form.register("serviceCode")} />

					<div className="prediction-form-filters">
						<FixedStartSection
							titleKey={titleKey}
							disabled={baseFieldsDisabled}
							autoHydrateBySelection={mode !== "edit"}
							hideMatchedRecordAlert={mode === "edit"}
						/>
					</div>

					{canShowRegisteredPredictions && serviceId && serviceCode
						? (
							<aside className="prediction-form-sidebar">
								<RegisteredPredictionsPanel
									serviceId={serviceId}
									serviceCode={serviceCode}
									serviceLabel={String(serviceCode).toUpperCase()}
									companyType={typeof companyType === "string" ? companyType : null}
									currentRecordId={recordId}
									onSelect={selectRegisteredPrediction}
								/>
							</aside>
						)
						: null}

					<main className="prediction-form-main">

						<AnimatePresence mode="wait">
							{module?.Fields && canShowServiceForm
								? (
									<motion.div
										key={module.code}
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -8 }}
										transition={{ duration: 0.2 }}
									>
										<module.Fields />
									</motion.div>
								)
								: null}
						</AnimatePresence>

						{canShowServiceForm
							? (
								<>
									<ProseNote />
									{canSubmit
										? (
											<ActionSection
												submitting={submitting}
												disabled={!hasMeaningfulChange}
												onSubmit={triggerSubmit}
											/>
										)
										: null}
								</>
							)
							: null}
					</main>
				</div>
			</BasicContent>
		</FormProvider>
	);
}

function ProseNote() {
	const { t } = useTranslation();

	return (
		<SectionCard title="اطلاعات تکمیلی" tone="blue">
			<div className="contract-supplementary-control prediction-note-control">
				<div className="contract-supplementary-control__label">{t("prediction.labels.note")}</div>
				<RHFProTextArea<PredictionFormValues, "note">
					name="note"
					label=""
					formItemProps={{ className: "contract-supplementary-field mb-0" }}
					textAreaProps={{
						autoSize: { minRows: 2, maxRows: 5 },
						placeholder: t("prediction.placeholders.note"),
					}}
				/>
			</div>
		</SectionCard>
	);
}
