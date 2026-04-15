import type { Resolver, UseFormReturn } from "react-hook-form";
import type { ContractFormValues, ContractServiceCode } from "../../model/contract.form.types";
import { notification } from "#src/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { buildContractSchema } from "../../model/contract.schema";
import { serviceRegistry } from "../../services/registry";
import { findFirstError } from "../../utils";
import { ActionSection } from "./sections/ActionSection";
import { FixedEndSection } from "./sections/FixedEndSection";
import { FixedStartSection } from "./sections/FixedStartSection";

export type ContractSubmitIntent = "submit" | "submit_and_create_another" | "submit_and_edit";

export const defaultContractFormValues: ContractFormValues = {
	serviceId: null,
	serviceCode: null,
	companyId: null,
	startYear: null,
	startMonth: null,
	counterpartyType: null,
	endYear: null,
	endMonth: null,
	contractNumber: "",
	description: "",
	documents: [],
	serviceFields: {},
};

interface Props {
	initialValues?: Partial<ContractFormValues> | null
	onSubmit?: (
		values: ContractFormValues,
		intent: ContractSubmitIntent,
		form: UseFormReturn<ContractFormValues>,
	) => void | Promise<void>
	submitText?: string
	submitting?: boolean
	showExtendedActions?: boolean
}

export function ContractForm({
	initialValues,
	onSubmit: onSubmitProp,
	submitText = "ثبت قرارداد",
	submitting,
	showExtendedActions = false,
}: Props) {
	const dynamicResolver: Resolver<ContractFormValues> = useCallback(
		async (values, context, options) => {
			const sc = values.serviceCode ?? null;
			const schema = buildContractSchema(sc as ContractServiceCode | null);

			const r = zodResolver(schema) as unknown as Resolver<ContractFormValues>;
			return r(values, context, options);
		},
		[],
	);

	const mergedInitialValues = useMemo<ContractFormValues>(() => {
		if (!initialValues)
			return defaultContractFormValues;

		return {
			...defaultContractFormValues,
			...initialValues,
			serviceFields: {
				...(defaultContractFormValues.serviceFields ?? {}),
				...(initialValues.serviceFields ?? {}),
			},
		} as ContractFormValues;
	}, [initialValues]);

	const form = useForm<ContractFormValues>({
		defaultValues: mergedInitialValues as any,
		mode: "onTouched",
		reValidateMode: "onChange",
		shouldUnregister: true,
		resolver: dynamicResolver,
	});

	useEffect(() => {
		// serviceCode has no direct input; keep it registered so submit/validate cycles do not drop it.
		form.register("serviceCode");
	}, [form]);

	useEffect(() => {
		if (!initialValues)
			return;

		form.reset(mergedInitialValues as any, {
			keepDirty: false,
			keepTouched: false,
		});
	}, [initialValues, mergedInitialValues]);

	const serviceCode = useWatch({
		control: form.control,
		name: "serviceCode",
	}) as ContractServiceCode | null;
	const module = serviceCode ? serviceRegistry[serviceCode] : undefined;
	const submitIntentRef = useRef<ContractSubmitIntent>("submit");
	const onSubmit = form.handleSubmit(
		async (values) => {
			try {
				if (onSubmitProp) {
					await onSubmitProp(values, submitIntentRef.current, form);
					return;
				}
				console.warn("submit", values);
			}
			catch (e: any) {
				if (e?.response)
					return;
				notification.error({
					message: "خطا در ثبت/ویرایش",
					description: e?.message ?? "خطای نامشخص",
					placement: "top",
				});
			}
		},
		(errors) => {
			const first = findFirstError(errors);
			if (first?.message) {
				notification.error({
					message: "لطفاً خطاهای فرم را اصلاح کنید",
					description: first.message,
					placement: "top",
				});
			}
		},
	);
	const triggerSubmit = (intent: ContractSubmitIntent) => {
		submitIntentRef.current = intent;
		void onSubmit();
	};
	const resetForm = () => {
		form.reset(defaultContractFormValues);
	};

	return (
		<FormProvider {...form}>
			<div className="w-full flex flex-col justify-center items-center gap-2">
				<input type="hidden" {...form.register("serviceCode")} />
				<FixedStartSection />

				<AnimatePresence mode="wait">
					{module?.Fields
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

				<FixedEndSection />

				<div style={{ marginTop: 16, width: "100%" }}>
					{showExtendedActions
						? (
							<ActionSection
								submitting={submitting}
								submitText={submitText}
								onSubmit={() => triggerSubmit("submit")}
								onSubmitAndCreateAnother={() => triggerSubmit("submit_and_create_another")}
								onSubmitAndEdit={() => triggerSubmit("submit_and_edit")}
								onReset={resetForm}
							/>
						)
						: (
							<Button type="primary" onClick={() => triggerSubmit("submit")} loading={!!submitting}>
								{submitText}
							</Button>
						)}
				</div>
			</div>
		</FormProvider>
	);
}
