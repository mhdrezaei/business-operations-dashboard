import type { Resolver } from "react-hook-form";
import type { InternalProfileFormValues } from "../../model/internal/company-internal.mappers";

import {
	RHFProText,
	RHFProTextArea,
	RHFSelect,
} from "#src/shared/ui/rhf-pro";

import { ProCard } from "@ant-design/pro-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form } from "antd";
import React, { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { INFO_VERIFICATION_STATUS_OPTIONS } from "../../../company-info/model/company-info.constants";
import { internalProfileSchema } from "../../model/internal/company-internal.schema";

interface Props {
	disabled: boolean
	defaultValues: InternalProfileFormValues
	onSubmit: (values: InternalProfileFormValues) => void | Promise<void>
}

export default function InternalProfileForm({ defaultValues, onSubmit }: Props) {
	const methods = useForm<InternalProfileFormValues>({
		defaultValues,
		resolver: zodResolver(internalProfileSchema as any) as unknown as Resolver<InternalProfileFormValues>,
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

	const isChanged = isDirty;
	return (
		<Form layout="vertical" className="space-y-4">
			<FormProvider {...methods}>
				<ProCard bordered title="اطلاعات داخلی" className="bg-bgMask">
					<div className="grid grid-cols-2 gap-x-4">
						<RHFProText name="internal_code" label="کد داخلی" inputProps={{ placeholder: "کد داخلی" }} />

						<RHFSelect
							name="info_verification_status"
							label="وضعیت تایید اطلاعات"
							selectProps={{ placeholder: "در انتظار", allowClear: true }}
							options={INFO_VERIFICATION_STATUS_OPTIONS}
						/>

						<div className="col-span-2">
							<RHFProTextArea name="internal_note" label="یادداشت داخلی" textAreaProps={{ rows: 4 }} />
						</div>
					</div>
				</ProCard>

				<Button
					type="primary"
					loading={isSubmitting}
					disabled={!isChanged || !isValid}
					onClick={handleSubmit(values => onSubmit(values))}
				>
					ذخیره تغییرات
				</Button>
			</FormProvider>
		</Form>
	);
}
