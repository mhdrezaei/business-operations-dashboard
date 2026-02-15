import type { BankAccountFormValues } from "../model/bank-accounts.types";
import { RHFProText } from "#src/shared/ui/rhf-pro";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form } from "antd";

import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { bankAccountSchema } from "../model/bank-accounts.schema";

interface Props {
	disabled: boolean
	defaultValues: BankAccountFormValues
	onSubmit: (values: BankAccountFormValues) => void | Promise<void>
}

export default function BankAccountForm({ disabled, defaultValues, onSubmit }: Props) {
	const methods = useForm<BankAccountFormValues>({
		defaultValues,
		resolver: zodResolver(bankAccountSchema),
		mode: "onBlur",
	});

	const { handleSubmit } = methods;

	return (
		<Form layout="vertical">
			<FormProvider {...methods}>
				<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
					<RHFProText name="bank_name" label="نام بانک *" itemProps={{ placeholder: "نام بانک", disabled }} />
					<RHFProText name="account_holder_name" label="نام صاحب حساب *" itemProps={{ placeholder: "نام صاحب حساب", disabled }} />

					<RHFProText name="account_number" label="شماره حساب" itemProps={{ placeholder: "شماره حساب", disabled }} />
					<RHFProText name="iban" label="شماره شبا" itemProps={{ placeholder: "شماره شبا", disabled }} />

					<div style={{ gridColumn: "1 / -1" }}>
						<RHFProText name="card_number" label="شماره کارت" itemProps={{ placeholder: "شماره کارت", disabled }} />
					</div>
				</div>

				<div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
					<Button onClick={() => methods.reset(defaultValues)} disabled={disabled}>
						پاکسازی فرم
					</Button>

					<Button type="primary" onClick={handleSubmit(onSubmit)} loading={disabled}>
						ثبت حساب
					</Button>
				</div>
			</FormProvider>
		</Form>
	);
}
