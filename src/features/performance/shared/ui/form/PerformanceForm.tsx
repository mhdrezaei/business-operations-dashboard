import type { Resolver, UseFormReturn } from "react-hook-form";
import type { PerformanceFormValues } from "../../model/performance.form.types";
import { notification } from "#src/utils";
import { HistoryOutlined } from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Radio } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { buildPerformanceSchema } from "../../model/performance.schema";
import { performanceServiceRegistry } from "../../services/registry";
import { ActionSection } from "./sections/ActionSection";
import { FixedStartSection } from "./sections/FixedStartSection";
import { SmsGatewayImportHistoryModal } from "./sections/SmsGatewayImportHistoryModal";
import { SmsGatewayImportModal } from "./sections/SmsGatewayImportModal";
import "#src/shared/ui/form-layout/styles.css";
import "./performance-form.css";

export type PerformanceSubmitIntent = "submit" | "submit_and_create_another" | "submit_and_edit";

interface Props {
	initialValues?: Partial<PerformanceFormValues> | null
	lockPrerequisites?: boolean
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
	companyType: null,
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
		if (typeof record.message === "string" && record.message.trim())
			return record.message.trim();
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
	lockPrerequisites = false,
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
		// The period selectors are temporarily unmounted when the company is
		// cleared for "submit and create another". Keep their values so the
		// selected contract year and month remain available for the next entry.
		shouldUnregister: false,
		resolver: dynamicResolver,
	});

	useEffect(() => {
		form.register("serviceCode");
		form.register("contractId");
		form.register("contractModel");
		form.register("salesAgentId");
		form.register("year");
		form.register("month");
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
	const [smsGatewayMode, setSmsGatewayMode] = useState<"manual" | "gateway">("manual");

	const submitIntentRef = useRef<PerformanceSubmitIntent>("submit");
	const [isSmsGatewayImportHistoryOpen, setIsSmsGatewayImportHistoryOpen] = useState(false);
	const isSmsGatewayImportSupported = serviceCode === "sms" || serviceCode === "sms-commission" || serviceCode === "sms_commission";
	const isSmsGatewayMode = isSmsGatewayImportSupported && smsGatewayMode === "gateway";
	const showActionSection = canShowServiceForm && !isSmsGatewayMode && !(serviceCode === "traffic" && trafficSubmitMode === "template");

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
			const firstErrorMessage = extractFirstErrorMessage(errors);
			notification.error({
				message: t("performance.messages.fixFormErrors"),
				description: firstErrorMessage
					? formatServerErrorMessage(firstErrorMessage)
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
		form.reset(lockPrerequisites ? mergedInitialValues : defaultValues);
		setSmsGatewayMode("manual");
	};

	return (
		<FormProvider {...form}>
			<div className="form-layout performance-form w-full flex flex-col justify-center items-center gap-2">
				<input type="hidden" {...form.register("serviceCode")} />
				<input type="hidden" {...form.register("contractId")} />
				<input type="hidden" {...form.register("contractModel")} />
				<input type="hidden" {...form.register("salesAgentId")} />
				<input type="hidden" {...form.register("year")} />
				<input type="hidden" {...form.register("month")} />

				<FixedStartSection
					hideManualPeriod={isSmsGatewayMode}
					lockPrerequisites={lockPrerequisites}
					periodModeToggle={isSmsGatewayImportSupported
						? (
							<div className="flex flex-wrap items-center justify-between gap-3">
								<Radio.Group
									optionType="button"
									buttonStyle="solid"
									value={smsGatewayMode}
									onChange={event => setSmsGatewayMode(event.target.value)}
									options={[
										{ label: "ثبت دستی عملکرد", value: "manual" },
										{ label: "ثبت عملکرد از Gateway پیامک", value: "gateway" },
									]}
								/>
								<Button icon={<HistoryOutlined />} onClick={() => setIsSmsGatewayImportHistoryOpen(true)}>تاریخچه دریافت‌های Gateway پیامک</Button>
							</div>
						)
						: null}
				>
					<AnimatePresence mode="wait">
						{module?.Fields && canShowServiceForm && !isSmsGatewayMode
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
					{isSmsGatewayMode
						? <SmsGatewayImportModal inline open onClose={() => setSmsGatewayMode("manual")} />
						: null}
				</FixedStartSection>

				{serviceCode === "commercial" && module?.Fields ? <module.Fields /> : null}

				{showActionSection
					? (
						<div className="mt-4 w-full">
							<ActionSection
								submitting={submitting}
								onSubmit={() => triggerSubmit("submit")}
								onSubmitAndCreateAnother={() => triggerSubmit("submit_and_create_another")}
								onSubmitAndEdit={() => triggerSubmit("submit_and_edit")}
								onReset={resetForm}
								showSubmitAndCreateAnother={!lockPrerequisites}
								showSmsGatewayImport={false}
								onSmsGatewayImportHistory={() => setIsSmsGatewayImportHistoryOpen(true)}
							/>
						</div>
					)
					: null}

				<SmsGatewayImportHistoryModal open={isSmsGatewayImportHistoryOpen} onClose={() => setIsSmsGatewayImportHistoryOpen(false)} />
			</div>
		</FormProvider>
	);
}
