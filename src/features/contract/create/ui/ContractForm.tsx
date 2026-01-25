import type { z } from "zod";
import type { ContractFormValues, ContractServiceCode } from "../model/contract.form.types";
import { accessControlCodes, useAccess } from "#src/hooks/index.js";
import { ProCard } from "@ant-design/pro-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useMemo } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { buildContractSchema } from "../model/contract.schema";
import { serviceRegistry } from "../services/registry";
import { FixedEndSection } from "./sections/FixedEndSection";
import { FixedStartSection } from "./sections/FixedStartSection";

const defaultValues: ContractFormValues = {
	serviceId: null,
	serviceCode: null,
	companyId: null,
	startYear: null,
	startMonth: null,
	endYear: null,
	endMonth: null,
	description: "",
	documents: [],
	serviceFields: {}, // ✅ حتماً آبجکت
};

export function ContractForm() {
	const { hasAccessByCodes } = useAccess();

	// ✅ ما schema base را یکبار می‌سازیم
	// eslint-disable-next-line unused-imports/no-unused-vars
	const baseSchema = useMemo(() => buildContractSchema(null), []);
	type Schema = typeof baseSchema;

	// ✅ useForm را با schema base می‌سازیم
	const form = useForm<z.input<Schema>, any, z.output<Schema>>({
		defaultValues: defaultValues as any,
		mode: "all",
		shouldUnregister: true,

		// ✅ resolver داینامیک واقعی: داخلش از values.serviceCode استفاده می‌کنیم
		// و schema مناسب را همان لحظه می‌سازیم
		resolver: useCallback(async (values, context, options) => {
			// serviceCode از خود values خوانده می‌شود (نه از state)
			const sc = (values as ContractFormValues)?.serviceCode ?? null;
			const schema = buildContractSchema(sc as ContractServiceCode | null);
			return zodResolver(schema)(values, context, options);
		}, []),
	});

	// ✅ برای render کردن فیلدهای داینامیک
	const serviceCode = useWatch({
		control: form.control,
		name: "serviceCode",
	}) as ContractServiceCode | null;

	const module = serviceCode ? serviceRegistry[serviceCode] : undefined;

	// ✅ قبل از submit: trigger کنیم تا errorها در UI نمایش داده شوند
	const onSubmit = form.handleSubmit(
		(values) => {
			console.warn("submit", values);
		},
		(errors) => {
			console.error("submit errors", errors);
		},
	);

	return (
		<FormProvider {...form}>
			<ProCard>
				<div>
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
									style={{ marginTop: 16 }}
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
							disabled={!hasAccessByCodes(accessControlCodes.add)}
						>
							ثبت قرارداد
						</Button>
					</div>
				</div>
			</ProCard>
		</FormProvider>
	);
}
