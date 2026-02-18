import type { ShareholderFormValues } from "../model/shareholders.types";
import { RHFProText, RHFProTextArea } from "#src/shared/ui/rhf-pro";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "antd";

import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { shareholderSchema } from "../model/shareholders.schema";

interface Props {
	disabled: boolean
	defaultValues: ShareholderFormValues
	onSubmit: (values: ShareholderFormValues) => void | Promise<void>
	submitText: string
	submitting?: boolean
}

export default function ShareholderForm({ disabled, defaultValues, onSubmit, submitText, submitting }: Props) {
	const methods = useForm<ShareholderFormValues>({
		defaultValues,
		resolver: zodResolver(shareholderSchema) as any,
		mode: "onBlur",
	});

	const { handleSubmit } = methods;

	return (
		<Form layout="vertical">
			<FormProvider {...methods}>
				<div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
					<RHFProText
						name="full_name"
						label="نام سهامدار"
						itemProps={{ placeholder: "نام و نام خانوادگی", disabled }}
					/>

					<RHFProText
						name="national_id"
						label="شناسه ملی"
						itemProps={{ placeholder: "شناسه ملی", disabled }}
					/>

					<RHFProText
						name="ownership_percent"
						label="درصد مالکیت"
						itemProps={{ placeholder: "مثلاً 25", disabled }}
					/>

					<RHFProTextArea
						name="note"
						label="یادداشت"
						textAreaProps={{ rows: 4, disabled }}
					/>
				</div>

				<div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
					<button
						type="button"
						className="ant-btn ant-btn-primary"
						disabled={disabled || !!submitting}
						onClick={handleSubmit(onSubmit)}
					>
						{submitting ? "در حال ذخیره..." : submitText}
					</button>
				</div>
			</FormProvider>
		</Form>
	);
}
