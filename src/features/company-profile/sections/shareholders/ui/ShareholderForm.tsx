import type { ShareholderFormValues } from "../model/shareholders.types";
import { RHFProText, RHFProTextArea } from "#src/shared/ui/rhf-pro";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form } from "antd";

import React, { useEffect } from "react";
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
		mode: "onTouched",
	});

	const { handleSubmit, reset, formState: { isDirty, isSubmitting } } = methods;
	useEffect(() => {
		reset(defaultValues);
	}, [defaultValues, reset]);

	return (
		<Form layout="vertical">
			<FormProvider {...methods}>
				<div className="grid col-span-1 mt-2">
					<RHFProText
						name="full_name"
						label="نام سهامدار"
						inputProps={{ placeholder: "نام و نام خانوادگی", disabled }}
					/>

					<RHFProText
						name="national_id"
						label="شناسه ملی"
						inputProps={{ placeholder: "شناسه ملی", disabled }}
					/>

					<RHFProText
						name="ownership_percent"
						label="درصد مالکیت"
						inputProps={{ placeholder: "مثلاً 25", disabled }}
					/>

					<RHFProTextArea
						name="note"
						label="یادداشت"
						textAreaProps={{ rows: 4, disabled }}
					/>
				</div>

				<div className="flex justify-end gap-2 mt-4">
					<Button
						type="primary"
						className="ant-btn ant-btn-primary"
						disabled={disabled || !!submitting || !isDirty || isSubmitting}
						onClick={handleSubmit(onSubmit)}
					>
						{submitting ? "در حال ذخیره..." : submitText}
					</Button>
				</div>
			</FormProvider>
		</Form>
	);
}
