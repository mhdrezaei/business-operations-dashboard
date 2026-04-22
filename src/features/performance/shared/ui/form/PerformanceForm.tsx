import type { Resolver, UseFormReturn } from "react-hook-form";
import type { PerformanceFormValues } from "../../model/performance.form.types";
import { notification } from "#src/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { buildPerformanceSchema } from "../../model/performance.schema";
import { performanceServiceRegistry } from "../../services/registry";
import { ActionSection } from "./sections/ActionSection";
import { FixedStartSection } from "./sections/FixedStartSection";

export type PerformanceSubmitIntent = "submit" | "submit_and_create_another" | "submit_and_edit";

interface Props {
	initialValues?: Partial<PerformanceFormValues> | null
	onSubmit?: (
		values: PerformanceFormValues,
		intent: PerformanceSubmitIntent,
		form: UseFormReturn<PerformanceFormValues>,
	) => void | Promise<void>
	submitting?: boolean
}

const defaultValues: PerformanceFormValues = {
	serviceId: null,
	serviceCode: null,
	companyId: null,
	trafficCompanyType: null,
	salesAgentId: null,
	year: null,
	month: null,
	contractId: null,
	contractModel: null,
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

export function PerformanceForm({
	initialValues,
	onSubmit: onSubmitProp,
	submitting,
}: Props) {
	const { t } = useTranslation();
	const operationTypeLabels = useMemo(() => ({
		BILL_INQUIRY: t("performance.operationType.billInquiry"),
		RECEIPT_REGISTER: t("performance.operationType.receiptRegister"),
		TRAFFIC_REVENUE: t("performance.fields.openapi.trafficRevenue"),
		TRAFFIC_PACKAGE_COUNT: t("performance.fields.openapi.trafficPackageCount"),
	}), [t]);

	const formatServerErrorMessage = useCallback((messageText: string) => {
		let nextMessage = messageText;
		Object.entries(operationTypeLabels).forEach(([key, label]) => {
			nextMessage = nextMessage.replaceAll(key, label);
		});
		return nextMessage;
	}, [operationTypeLabels]);

	const resolveSubmitErrorMessage = useCallback(async (error: any) => {
		if (error?.response) {
			try {
				const data = await error.response.clone().json();
				const extracted = extractFirstErrorMessage(data);
				if (extracted)
					return formatServerErrorMessage(extracted);
			}
			catch {
				// ignore invalid response body
			}
		}

		if (typeof error?.message === "string" && error.message.trim())
			return formatServerErrorMessage(error.message);

		return t("performance.messages.unknownError");
	}, [formatServerErrorMessage, t]);

	const dynamicResolver: Resolver<PerformanceFormValues> = useCallback(
		async (values, context, options) => {
			const schema = buildPerformanceSchema(values.serviceCode, values.contractModel);
			const resolver = zodResolver(schema) as unknown as Resolver<PerformanceFormValues>;
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
		} as PerformanceFormValues;
	}, [initialValues]);

	const form = useForm<PerformanceFormValues>({
		defaultValues: mergedInitialValues,
		mode: "all",
		shouldUnregister: true,
		resolver: dynamicResolver,
	});

	useEffect(() => {
		form.register("serviceCode");
		form.register("contractId");
		form.register("contractModel");
		form.register("salesAgentId");
	}, [form]);

	useEffect(() => {
		if (!initialValues)
			return;
		form.reset(mergedInitialValues, {
			keepDirty: false,
			keepTouched: false,
		});
	}, [initialValues, mergedInitialValues, form]);

	const serviceCode = useWatch({
		control: form.control,
		name: "serviceCode",
	});
	const year = useWatch({
		control: form.control,
		name: "year",
	});
	const month = useWatch({
		control: form.control,
		name: "month",
	});
	const contractId = useWatch({
		control: form.control,
		name: "contractId",
	});
	const trafficSubmitMode = useWatch({
		control: form.control,
		name: "serviceFields.submitMode" as const,
	}) as "single" | "template" | undefined;
	const module = serviceCode ? performanceServiceRegistry[serviceCode] : undefined;
	const requiresMonthlyStatusContract = serviceCode === "openapi" || (serviceCode === "traffic" && trafficSubmitMode === "single");
	const canShowServiceForm = year != null	&& month != null && (!requiresMonthlyStatusContract || contractId != null);
	const showActionSection = canShowServiceForm && !(serviceCode === "traffic" && trafficSubmitMode === "template");

	const submitIntentRef = useRef<PerformanceSubmitIntent>("submit");

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
					message: t("performance.messages.submitError"),
					description,
					placement: "topRight",
					className: "performance-submit-notification",
				});
			}
		},
		(errors) => {
			const firstPath = Object.keys(errors ?? {})[0];
			notification.error({
				message: t("performance.messages.fixFormErrors"),
				description: firstPath
					? String((errors as any)[firstPath]?.message ?? t("performance.messages.invalidFormInputs"))
					: t("performance.messages.invalidFormInputs"),
				placement: "topRight",
				className: "performance-submit-notification",
			});
		},
	);

	const triggerSubmit = (intent: PerformanceSubmitIntent) => {
		submitIntentRef.current = intent;
		void submit();
	};

	const resetForm = () => {
		form.reset(defaultValues);
	};

	return (
		<FormProvider {...form}>
			<div className="w-full flex flex-col justify-center items-center gap-2">
				<input type="hidden" {...form.register("serviceCode")} />
				<input type="hidden" {...form.register("contractId")} />
				<input type="hidden" {...form.register("contractModel")} />
				<input type="hidden" {...form.register("salesAgentId")} />

				<FixedStartSection />

				<AnimatePresence mode="wait">
					{module?.Fields && canShowServiceForm
						? (
							<motion.div
								key={module.code}
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -8 }}
								transition={{ duration: 0.2 }}
								className="w-full"
							>
								<module.Fields />
							</motion.div>
						)
						: null}
				</AnimatePresence>

				{showActionSection
					? (
						<div style={{ marginTop: 16, width: "100%" }}>
							<ActionSection
								submitting={submitting}
								onSubmit={() => triggerSubmit("submit")}
								onSubmitAndCreateAnother={() => triggerSubmit("submit_and_create_another")}
								onSubmitAndEdit={() => triggerSubmit("submit_and_edit")}
								onReset={resetForm}
							/>
						</div>
					)
					: null}
			</div>
		</FormProvider>
	);
}
