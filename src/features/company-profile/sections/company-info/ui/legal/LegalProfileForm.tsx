import type { Resolver } from "react-hook-form";
import type { LegalProfileFormValues } from "../../model/legal/company-legal.mappers";

import {
	RHFProDate,
	RHFProText,
	RHFSelect,
} from "#src/shared/ui/rhf-pro";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, Form } from "antd";
import React, { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { LEGAL_PERSON_TYPE_OPTIONS } from "../../../company-info/model/company-info.constants";
import { legalProfileSchema } from "../../model/legal/company-legal.schema";

interface Props {
	disabled: boolean
	defaultValues: LegalProfileFormValues
	onSubmit: (values: LegalProfileFormValues) => void | Promise<void>
}

export default function LegalProfileForm({ defaultValues, onSubmit }: Props) {
	const methods = useForm<LegalProfileFormValues>({
		defaultValues,
		resolver: zodResolver(legalProfileSchema as any) as unknown as Resolver<LegalProfileFormValues>,
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
				<Card bordered title="اطلاعات ثبتی و حقوقی" className="bg-bgMask">
					<div className="grid grid-cols-2 gap-x-4">
						<RHFProText name="national_id" label="شناسه ملی" inputProps={{ placeholder: "شناسه ملی" }} />
						<RHFProText name="tax_national_id" label="شناسه مالیاتی" inputProps={{ placeholder: "شناسه مالیاتی" }} />

						<RHFSelect
							name="legal_person_type"
							label="نوع شخصیت حقوقی"
							selectProps={{ placeholder: "انتخاب کنید", allowClear: true }}
							options={LEGAL_PERSON_TYPE_OPTIONS}
						/>

						<RHFProText name="registration_number" label="شماره ثبت" inputProps={{ placeholder: "شماره ثبت" }} />
						<RHFProText name="tax_registration_number" label="شماره ثبت مالیاتی" inputProps={{ placeholder: "شماره ثبت مالیاتی" }} />

						<RHFProText name="registration_place" label="محل ثبت" inputProps={{ placeholder: "محل ثبت" }} />
						<RHFProDate name="registration_date" label="تاریخ ثبت" itemProps={{ placeholder: "تاریخ ثبت" }} />

						<RHFProText name="branch_code" label="کد شعبه" inputProps={{ placeholder: "کد شعبه" }} />
					</div>
				</Card>

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
