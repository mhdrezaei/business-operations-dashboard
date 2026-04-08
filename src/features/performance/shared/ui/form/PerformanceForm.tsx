import type { Resolver, UseFormReturn } from "react-hook-form";
import type { PerformanceFormValues } from "../../model/performance.form.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { notification } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
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

export function PerformanceForm({
	initialValues,
	onSubmit: onSubmitProp,
	submitting,
}: Props) {
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
	const module = serviceCode ? performanceServiceRegistry[serviceCode] : undefined;
	const canShowServiceForm = year != null && month != null;

	const submitIntentRef = useRef<PerformanceSubmitIntent>("submit");

	const submit = form.handleSubmit(
		async (values) => {
			if (!onSubmitProp)
				return;

			try {
				await onSubmitProp(values, submitIntentRef.current, form);
			}
			catch (error: any) {
				notification.error({
					message: "خطا در ثبت عملکرد",
					description: error?.message ?? "خطای نامشخص",
					placement: "top",
				});
			}
		},
		(errors) => {
			const firstPath = Object.keys(errors ?? {})[0];
			notification.error({
				message: "لطفاً خطاهای فرم را اصلاح کنید",
				description: firstPath
					? String((errors as any)[firstPath]?.message ?? "ورودی‌های فرم معتبر نیستند")
					: "ورودی‌های فرم معتبر نیستند",
				placement: "top",
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

				{canShowServiceForm
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
