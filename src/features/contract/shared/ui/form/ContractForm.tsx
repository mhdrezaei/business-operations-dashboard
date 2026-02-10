import type { Resolver } from "react-hook-form";
import type { ContractFormValues, ContractServiceCode } from "../../model/contract.form.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, notification } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useEffect } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { buildContractSchema } from "../../model/contract.schema";
import { serviceRegistry } from "../../services/registry";
import { findFirstError } from "../../utils";
import { FixedEndSection } from "./sections/FixedEndSection";
import { FixedStartSection } from "./sections/FixedStartSection";

const defaultValues: ContractFormValues = {
	serviceId: null,
	serviceCode: null,
	companyId: null,
	startYear: null,
	startMonth: null,
	counterpartyType: null,
	endYear: null,
	endMonth: null,
	description: "",
	documents: [],
	serviceFields: {},
};

interface Props {
	initialValues?: Partial<ContractFormValues> | null
	onSubmit?: (values: ContractFormValues) => void | Promise<void>
	submitText?: string
	submitting?: boolean
}

export function ContractForm({
	initialValues,
	onSubmit: onSubmitProp,
	submitText = "ثبت قرارداد",
	submitting,
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

	const form = useForm<ContractFormValues>({
		defaultValues: defaultValues as any,
		mode: "all",
		shouldUnregister: true,
		resolver: dynamicResolver,
	});

	// ✅ وقتی initialValues آمد، فرم را reset کن تا تمام فیلدها (و nested ها) درست بنشینند
	useEffect(() => {
		if (!initialValues)
			return;

		// اطمینان از اینکه serviceFields به درستی تنظیم شود
		form.reset(
			{
				...defaultValues,
				...initialValues,
				serviceFields: {
					...(defaultValues.serviceFields ?? {}),
					...(initialValues.serviceFields ?? {}),
				},
			} as any,
			{
				keepDirty: false,
				keepTouched: false,
			},
		);
	}, [initialValues]);

	const serviceCode = useWatch({
		control: form.control,
		name: "serviceCode",
	}) as ContractServiceCode | null;
	console.warn("serviceCode", serviceCode);
	const module = serviceCode ? serviceRegistry[serviceCode] : undefined;
	console.warn(module, "mooooo");
	const onSubmit = form.handleSubmit(
		async (values) => {
			try {
				if (onSubmitProp) {
					await onSubmitProp(values);
					return;
				}
				console.warn("submit", values);
			}
			catch (e: any) {
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

	return (
		<FormProvider {...form}>
			<div className="w-full flex flex-col justify-center items-center gap-2">
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

				<div style={{ marginTop: 16 }}>
					<Button type="primary" onClick={onSubmit} loading={!!submitting}>
						{submitText}
					</Button>
				</div>
			</div>
		</FormProvider>
	);
}
