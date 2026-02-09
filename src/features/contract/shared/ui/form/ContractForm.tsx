import type { Resolver } from "react-hook-form";
import type { ContractFormValues, ContractServiceCode } from "../../model/contract.form.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, notification } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useMemo } from "react";
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

export function ContractForm() {
	// const { hasAccessByCodes } = useAccess()
	// eslint-disable-next-line unused-imports/no-unused-vars
	const baseSchema = useMemo(() => buildContractSchema(null), []);
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

	const serviceCode = useWatch({
		control: form.control,
		name: "serviceCode",
	}) as ContractServiceCode | null;

	const module = serviceCode ? serviceRegistry[serviceCode] : undefined;

	const onSubmit = form.handleSubmit(
		(values) => {
			console.warn("submit", values);
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
					<Button
						type="primary"
						onClick={onSubmit}
						// disabled={!hasAccessByCodes(accessControlCodes.add)}
						// disabled={!hasError}
					>
						ثبت قرارداد
					</Button>
				</div>
			</div>

		</FormProvider>
	);
}
