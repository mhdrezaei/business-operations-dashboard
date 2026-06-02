import type { Resolver, UseFormReturn } from "react-hook-form";
import type { PredictionFormValues } from "../../model/prediction.form.types";
import { RHFProTextArea } from "#src/shared/ui/rhf-pro";
import { notification } from "#src/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { buildPredictionSchema } from "../../model/prediction.schema";
import { predictionServiceRegistry } from "../../services/registry";
import { ActionSection } from "./sections/ActionSection";
import { FixedStartSection } from "./sections/FixedStartSection";

export type PredictionSubmitIntent = "submit" | "submit_and_create_another" | "submit_and_edit";

interface Props {
	initialValues?: Partial<PredictionFormValues> | null
	mode?: "create" | "edit"
	titleKey?: string
	baseFieldsDisabled?: boolean
	onCancel?: () => void
	onSubmit?: (
		values: PredictionFormValues,
		intent: PredictionSubmitIntent,
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

export function PredictionForm({
	initialValues,
	mode = "create",
	titleKey,
	baseFieldsDisabled = false,
	onCancel,
	onSubmit: onSubmitProp,
	submitting,
}: Props) {
	const { t } = useTranslation();

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
		shouldUnregister: true,
		resolver: dynamicResolver,
	});

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

	const serviceCode = useWatch({
		control: form.control,
		name: "serviceCode",
	});
	const fiscalYear = useWatch({
		control: form.control,
		name: "fiscalYear",
	});
	const companyType = useWatch({
		control: form.control,
		name: "serviceFields.companyType" as any,
	});
	const module = serviceCode ? predictionServiceRegistry[serviceCode] : undefined;
	const requiresCompanyType = serviceCode === "sms" || serviceCode === "psp" || serviceCode === "traffic";
	const canShowServiceForm = !!serviceCode && fiscalYear != null && (!requiresCompanyType || !!companyType);
	const submitIntentRef = useRef<PredictionSubmitIntent>("submit");

	const submit = form.handleSubmit(
		async (values) => {
			if (!onSubmitProp)
				return;

			try {
				await onSubmitProp(values, submitIntentRef.current, form);
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
			const firstPath = Object.keys(errors ?? {})[0];
			notification.error({
				message: t("prediction.messages.fixFormErrors"),
				description: firstPath
					? String((errors as any)[firstPath]?.message ?? t("prediction.messages.invalidFormInputs"))
					: t("prediction.messages.invalidFormInputs"),
				placement: "topRight",
				className: "prediction-submit-notification",
			});
		},
	);

	function triggerSubmit(intent: PredictionSubmitIntent) {
		submitIntentRef.current = intent;
		void submit();
	}

	function resetForm() {
		form.reset(defaultValues);
	}

	return (
		<FormProvider {...form}>
			<div className="w-full flex flex-col gap-4">
				<input type="hidden" {...form.register("recordId")} />
				<input type="hidden" {...form.register("serviceCode")} />

				<FixedStartSection
					titleKey={titleKey}
					disabled={baseFieldsDisabled}
					autoHydrateBySelection={mode !== "edit"}
					hideMatchedRecordAlert={mode === "edit"}
				/>

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

							<ActionSection
								mode={mode}
								submitting={submitting}
								onSubmit={() => triggerSubmit("submit")}
								onSubmitAndCreateAnother={() => triggerSubmit("submit_and_create_another")}
								onSubmitAndEdit={() => triggerSubmit("submit_and_edit")}
								onReset={resetForm}
								onCancel={onCancel}
							/>
						</>
					)
					: null}
			</div>
		</FormProvider>
	);
}

function ProseNote() {
	const { t } = useTranslation();

	return (
		<Card
			bordered
			className="rounded-xl"
		>
			<div>
				<RHFProTextArea<PredictionFormValues, "note">
					name="note"
					label={t("prediction.labels.note")}
					textAreaProps={{
						rows: 4,
						placeholder: t("prediction.placeholders.note"),
					}}
				/>
			</div>
		</Card>
	);
}
