import type { Resolver } from "react-hook-form";
import type { FinanceProfileFormValues } from "../../model/finance/company-finance.mappers";

import {
	RHFProText,
	RHFSelect,
} from "#src/shared/ui/rhf-pro";

import { ProCard } from "@ant-design/pro-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, theme } from "antd";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";

import { SETTLEMENT_TERM_OPTIONS, VAT_STATUS_OPTIONS } from "../../../company-info/model/company-info.constants";
import { financeProfileSchema } from "../../model/finance/company-finance.schema";

interface Props {
	disabled: boolean
	defaultValues: FinanceProfileFormValues
	onSubmit: (values: FinanceProfileFormValues) => void | Promise<void>
}

export default function FinanceProfileForm({ disabled, defaultValues, onSubmit }: Props) {
	const { useToken } = theme;
	const { token } = useToken();

	const methods = useForm<FinanceProfileFormValues>({
		defaultValues,
		resolver: zodResolver(financeProfileSchema as any) as unknown as Resolver<FinanceProfileFormValues>,
		mode: "onBlur",
	});

	const { handleSubmit } = methods;

	return (
		<Form layout="vertical" className="space-y-4">
			<FormProvider {...methods}>
				<ProCard bordered title="اطلاعات مالی" style={{ backgroundColor: token.colorBgMask }}>
					<div className="grid grid-cols-2 gap-x-4">
						<RHFProText name="economic_code" label="کد اقتصادی" inputProps={{ placeholder: "کد اقتصادی", disabled }} />
						<RHFProText name="tax_file_number" label="شماره پرونده مالیاتی" inputProps={{ placeholder: "شماره پرونده مالیاتی", disabled }} />
						<RHFProText name="tax_office" label="اداره مالیاتی" inputProps={{ placeholder: "اداره مالیاتی", disabled }} />

						<RHFSelect
							name="vat_status"
							label="وضعیت ارزش افزوده"
							selectProps={{ placeholder: "انتخاب کنید", allowClear: true, disabled }}
							options={VAT_STATUS_OPTIONS}
						/>

						<RHFProText name="financial_commitment_cap" label="سقف تعهد مالی" inputProps={{ placeholder: "سقف تعهد مالی", disabled }} />

						<RHFSelect
							name="settlement_term"
							label="شرایط تسویه"
							selectProps={{ placeholder: "انتخاب کنید", allowClear: true, disabled }}
							options={SETTLEMENT_TERM_OPTIONS}
						/>
					</div>
				</ProCard>

				<Button type="primary" onClick={handleSubmit(values => onSubmit(values))}>
					ذخیره تغییرات
				</Button>
			</FormProvider>
		</Form>
	);
}
