import type { Resolver } from "react-hook-form";
import type { FinanceProfileFormValues } from "../../model/finance/company-finance.mappers";
import { RHFProText, RHFSelect } from "#src/shared/ui/rhf-pro";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, Form } from "antd";
import React, { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { SETTLEMENT_TERM_OPTIONS, VAT_STATUS_OPTIONS } from "../../../company-info/model/company-info.constants";
import { financeProfileSchema } from "../../model/finance/company-finance.schema";

interface Props {
	disabled: boolean
	defaultValues: FinanceProfileFormValues
	onSubmit: (values: FinanceProfileFormValues) => void | Promise<void>
}

export default function FinanceProfileForm({ disabled, defaultValues, onSubmit }: Props) {
	const methods = useForm<FinanceProfileFormValues>({
		defaultValues,
		resolver: zodResolver(financeProfileSchema as any) as unknown as Resolver<FinanceProfileFormValues>,
		mode: "onChange",
	});

	const {
		handleSubmit,
		reset,
		formState: { isDirty, isValid, isSubmitting },
	} = methods;

	useEffect(() => {
		reset(defaultValues);
	}, [defaultValues, reset]);

	return (
		<Form layout="vertical" className="space-y-4">
			<FormProvider {...methods}>
				<Card variant="outlined" title={"\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0645\u0627\u0644\u06CC"} className="bg-bgMask">
					<div className="grid grid-cols-2 gap-x-4">
						<RHFProText name="economic_code" label={"\u06A9\u062F \u0627\u0642\u062A\u0635\u0627\u062F\u06CC"} inputProps={{ placeholder: "\u06A9\u062F \u0627\u0642\u062A\u0635\u0627\u062F\u06CC", disabled }} />
						<RHFProText name="tax_file_number" label={"\u0634\u0645\u0627\u0631\u0647 \u067E\u0631\u0648\u0646\u062F\u0647 \u0645\u0627\u0644\u06CC\u0627\u062A\u06CC"} inputProps={{ placeholder: "\u0634\u0645\u0627\u0631\u0647 \u067E\u0631\u0648\u0646\u062F\u0647 \u0645\u0627\u0644\u06CC\u0627\u062A\u06CC", disabled }} />
						<RHFProText name="tax_office" label={"\u0627\u062F\u0627\u0631\u0647 \u0645\u0627\u0644\u06CC\u0627\u062A\u06CC"} inputProps={{ placeholder: "\u0627\u062F\u0627\u0631\u0647 \u0645\u0627\u0644\u06CC\u0627\u062A\u06CC", disabled }} />

						<RHFSelect
							name="vat_status"
							label={"\u0648\u0636\u0639\u06CC\u062A \u0627\u0631\u0632\u0634 \u0627\u0641\u0632\u0648\u062F\u0647"}
							selectProps={{ placeholder: "\u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F", allowClear: true, disabled }}
							options={VAT_STATUS_OPTIONS}
						/>

						<RHFProText name="financial_commitment_cap" label={"\u0633\u0642\u0641 \u062A\u0639\u0647\u062F \u0645\u0627\u0644\u06CC"} inputProps={{ placeholder: "\u0633\u0642\u0641 \u062A\u0639\u0647\u062F \u0645\u0627\u0644\u06CC", disabled }} />

						<RHFSelect
							name="settlement_term"
							label={"\u0634\u0631\u0627\u06CC\u0637 \u062A\u0633\u0648\u06CC\u0647"}
							selectProps={{ placeholder: "\u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F", allowClear: true, disabled }}
							options={SETTLEMENT_TERM_OPTIONS}
						/>
					</div>
				</Card>
				<Button
					type="primary"
					loading={isSubmitting}
					disabled={disabled || !isDirty || !isValid}
					onClick={handleSubmit(values => onSubmit(values))}
				>
					{"\u0630\u062E\u06CC\u0631\u0647 \u062A\u063A\u06CC\u06CC\u0631\u0627\u062A"}
				</Button>
			</FormProvider>
		</Form>
	);
}
