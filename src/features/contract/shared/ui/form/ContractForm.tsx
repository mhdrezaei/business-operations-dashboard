import type { ReactNode } from "react";
import type { Resolver, UseFormReturn } from "react-hook-form";
import type { ContractFormValues, ContractServiceCode, ContractTypeValue } from "../../model/contract.form.types";
import { BasicContent } from "#src/components/index.js";
import { notification } from "#src/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { ConfigProvider, Empty } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { buildContractSchema, mergeContractValues } from "../../model/contract.schema";
import { serviceRegistry } from "../../services/registry";
import { findFirstError } from "../../utils";
import { ContractFormFooter } from "./ContractFormFooter";
import { FixedEndSection } from "./sections/FixedEndSection";
import { FixedStartSection } from "./sections/FixedStartSection";
import "./contract-form.css";

export type ContractSubmitIntent = "submit" | "submit_and_create_another" | "submit_and_edit";

export interface ContractFormActions {
	resetForCreateAnother: (values: ContractFormValues) => void
}

export interface ContractFormSelectionContext {
	serviceId: number | null
	serviceCode: string | null
	companyId: number | null
	companyType: string | null
	counterpartyType: ContractFormValues["counterpartyType"]
	/** خلاصه قیمت‌گذاری اصلی (فقط سرویس‌های دارای `contractPricing`) برای کارت خلاصه صفحه ایجاد */
	contractPricingType?: ContractTypeValue["type"]
	fixedAmount?: number | null
}

export const defaultContractFormValues: ContractFormValues = {
	serviceId: null,
	serviceCode: null,
	companyId: null,
	companyType: null,
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
	mode?: "create" | "edit"
	contractId?: number | null
	initialValues?: Partial<ContractFormValues> | null
	onSubmit?: (
		values: ContractFormValues,
		intent: ContractSubmitIntent,
		form: UseFormReturn<ContractFormValues>,
		actions: ContractFormActions,
	) => void | Promise<void>
	submitText?: string
	submitting?: boolean
	/** Blocks the submit button regardless of dirtiness (e.g. a locked contract). */
	submitDisabled?: boolean
	submitDisabledReason?: string
	showExtendedActions?: boolean
	/** دکمه‌های کنار «ثبت» در نوار عملیات ساده (مثلاً «حذف قرارداد» در ویرایش) */
	secondaryActions?: ReactNode
	showDocuments?: boolean
	onSelectionContextChange?: (context: ContractFormSelectionContext) => void
	awaitingContractSelection?: boolean
	readOnly?: boolean
}

export function ContractForm({
	mode = "create",
	contractId = null,
	initialValues,
	onSubmit: onSubmitProp,
	submitText,
	submitting,
	submitDisabled: submitLocked = false,
	submitDisabledReason,
	showExtendedActions = false,
	secondaryActions,
	showDocuments = true,
	onSelectionContextChange,
	awaitingContractSelection = false,
	readOnly = false,
}: Props) {
	const { t } = useTranslation();
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
		return mergeContractValues(defaultContractFormValues, initialValues);
	}, [initialValues]);

	const form = useForm<ContractFormValues>({
		defaultValues: mergedInitialValues as any,
		mode: "onTouched",
		reValidateMode: "onChange",
		shouldUnregister: false,
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
	const companyType = useWatch({
		control: form.control,
		name: "companyType",
	}) as string | null | undefined;
	// Narrow watches only: watching every value here would re-render the whole form on each keystroke.
	const [serviceId, companyId, counterpartyType, contractPricingType, fixedAmount] = useWatch({
		control: form.control,
		name: ["serviceId", "companyId", "counterpartyType", "serviceFields.contractPricing.type", "serviceFields.contractPricing.fixedAmount"] as any,
	}) as [ContractFormValues["serviceId"], ContractFormValues["companyId"], ContractFormValues["counterpartyType"], ContractTypeValue["type"] | undefined, number | null | undefined];
	useEffect(() => {
		onSelectionContextChange?.({
			serviceId: serviceId ?? null,
			serviceCode: serviceCode ?? null,
			companyId: companyId ?? null,
			companyType: companyType ?? null,
			counterpartyType: counterpartyType ?? null,
			contractPricingType: contractPricingType ?? null,
			fixedAmount: fixedAmount ?? null,
		});
	}, [serviceId, serviceCode, companyId, companyType, counterpartyType, contractPricingType, fixedAmount, onSelectionContextChange]);
	const isCollocationFlow = serviceCode === "traffic" && String(companyType ?? "").trim().toUpperCase() === "COLLOCATION";
	const module = serviceCode ? serviceRegistry[serviceCode] : undefined;
	const submitIntentRef = useRef<ContractSubmitIntent>("submit");
	const preserveDatesDuringResetRef = useRef(false);
	const formActions = useMemo<ContractFormActions>(() => ({
		resetForCreateAnother: (values) => {
			preserveDatesDuringResetRef.current = true;
			form.reset(values);
		},
	}), [form]);
	const onSubmit = form.handleSubmit(
		async (values) => {
			try {
				if (onSubmitProp) {
					await onSubmitProp(values, submitIntentRef.current, form, formActions);
					return;
				}
				console.warn("submit", values);
			}
			catch (e: any) {
				if (e?.response)
					return;
				notification.error({
					message: t("contract.form.submitError"),
					description: e?.message ?? t("contract.form.unknownError"),
					placement: "top",
				});
			}
		},
		(errors) => {
			const first = findFirstError(errors);
			if (first?.message) {
				notification.error({
					message: t("contract.form.fixErrors"),
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
			<ConfigProvider componentDisabled={readOnly}>
				<BasicContent>
					<div className="form-layout w-full flex flex-col justify-center items-center gap-2">
						<input type="hidden" {...form.register("serviceCode")} />
						<FixedStartSection mode={mode} awaitingContractSelection={awaitingContractSelection} preserveDatesDuringResetRef={preserveDatesDuringResetRef} />

						{awaitingContractSelection
							? (
								<div className="flex min-h-[240px] w-full items-center justify-center">
									<Empty
										image={Empty.PRESENTED_IMAGE_SIMPLE}
										description={t("contract.form.selectContractHint")}
									/>
								</div>
							)
							: (
								<>
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
													<module.Fields mode={mode} />
												</motion.div>
											)
											: null}
									</AnimatePresence>
									{isCollocationFlow ? null : <FixedEndSection contractId={contractId} showDocuments={showDocuments} />}

									{readOnly
										? null
										: (
											<ContractFormFooter
												initialValues={mergedInitialValues}
												showExtendedActions={showExtendedActions}
												secondaryActions={secondaryActions}
												submitting={submitting}
												submitLocked={submitLocked}
												submitDisabledReason={submitDisabledReason}
												submitText={submitText}
												onSubmit={triggerSubmit}
												onReset={resetForm}
											/>
										)}
								</>
							)}
					</div>
				</BasicContent>
			</ConfigProvider>
		</FormProvider>
	);
}
