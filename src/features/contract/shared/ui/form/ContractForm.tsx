import type { Resolver, UseFormReturn } from "react-hook-form";
import type { ContractFormValues, ContractServiceCode } from "../../model/contract.form.types";
import { BasicContent } from "#src/components/index.js";
import { notification } from "#src/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useEffect, useMemo, useRef } from "react";

import { FormProvider, useForm, useWatch } from "react-hook-form";
import { buildContractSchema } from "../../model/contract.schema";
import { serviceRegistry } from "../../services/registry";
import { findFirstError } from "../../utils";
import { ActionSection } from "./sections/ActionSection";
import { FixedEndSection } from "./sections/FixedEndSection";
import { FixedStartSection } from "./sections/FixedStartSection";
import "./contract-form.css";

export type ContractSubmitIntent = "submit" | "submit_and_create_another" | "submit_and_edit";
type ComparableValue = string | number | boolean | null | ComparableValue[] | { [key: string]: ComparableValue };

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

function stableComparable(value: unknown): ComparableValue {
	if (value === undefined || value === null) {
		return null;
	}

	if (typeof value === "string") {
		return value.trim();
	}

	if (typeof value === "number" || typeof value === "boolean") {
		return value;
	}

	if (Array.isArray(value)) {
		return value.map(item => stableComparable(item));
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	if (typeof value === "object") {
		return Object.keys(value as Record<string, unknown>)
			.sort()
			.reduce<{ [key: string]: ComparableValue }>((result, key) => {
				result[key] = stableComparable((value as Record<string, unknown>)[key]);
				return result;
			}, {});
	}

	return String(value).trim();
}

function mergeWithInitialValues(
	initial: ContractFormValues,
	current: Partial<ContractFormValues> | undefined,
): ContractFormValues {
	const definedCurrentValues = Object.fromEntries(
		Object.entries(current ?? {}).filter(([, value]) => value !== undefined),
	) as Partial<ContractFormValues>;
	const definedServiceFields = Object.fromEntries(
		Object.entries((current?.serviceFields as Record<string, unknown> | undefined) ?? {}).filter(([, value]) => value !== undefined),
	);

	return {
		...initial,
		...definedCurrentValues,
		serviceFields: {
			...(initial.serviceFields ?? {}),
			...definedServiceFields,
		},
	};
}

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
	const watchedValues = useWatch({ control: form.control, defaultValue: mergedInitialValues as any });
	const isMeaningfullyDirty = useMemo(() => {
		const currentValues = mergeWithInitialValues(mergedInitialValues, watchedValues as Partial<ContractFormValues>);
		return JSON.stringify(stableComparable(currentValues)) !== JSON.stringify(stableComparable(mergedInitialValues));
	}, [mergedInitialValues, watchedValues]);
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
	const submitDisabled = !isMeaningfullyDirty || submitting;

	return (
		<FormProvider {...form}>
			<BasicContent>
				<Card>
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

						<div className="mt-4 w-full">
							{showExtendedActions
								? (
									<ActionSection
										submitting={submitting}
										disabled={submitDisabled}
										submitText={submitText}
										onSubmit={() => triggerSubmit("submit")}
										onSubmitAndCreateAnother={() => triggerSubmit("submit_and_create_another")}
										onSubmitAndEdit={() => triggerSubmit("submit_and_edit")}
										onReset={resetForm}
									/>
								)
								: (
									<Button type="primary" onClick={() => triggerSubmit("submit")} loading={!!submitting} disabled={submitDisabled}>
										{submitText}
									</Button>
								)}
						</div>
					</div>
				</Card>
			</BasicContent>
		</FormProvider>
	);
}
