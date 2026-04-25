import type { Resolver } from "react-hook-form";
import type { CompanyPersonFormValues } from "../model/company-people.types";
import { RHFProText, RHFSelect } from "#src/shared/ui/rhf-pro";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button, Form } from "antd";

import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { COMPANY_PERSON_ROLE_OPTIONS } from "../model/company-people.constants";
import { companyPersonSchema } from "../model/company-people.schema";

interface Props {
	disabled: boolean
	defaultValues: CompanyPersonFormValues
	submitText: string
	onSubmit: (values: CompanyPersonFormValues) => void | Promise<void>
	onClose: () => void
	submitting?: boolean
}

export default function CompanyPeopleForm({ disabled, defaultValues, onSubmit, onClose, submitText, submitting }: Props) {
	const methods = useForm<CompanyPersonFormValues>({
		defaultValues,
		resolver: (zodResolver(companyPersonSchema as any) as unknown) as Resolver<CompanyPersonFormValues>,
		mode: "onChange",
	});

	const { handleSubmit, reset, formState: { isDirty, isSubmitting } } = methods;

	useEffect(() => {
		reset(defaultValues);
	}, [defaultValues, reset]);
	return (
		<Form layout="vertical">
			<FormProvider {...methods}>
				<div className="grid grid-cols-2 gap-x-4 mt-4">
					<RHFSelect
						name="role"
						label="نقش"
						options={COMPANY_PERSON_ROLE_OPTIONS}
						selectProps={{ allowClear: true, placeholder: "انتخاب کنید", disabled }}
					/>

					<RHFProText
						name="full_name"
						label="نام و نام خانوادگی"
						itemProps={{ placeholder: "نام و نام خانوادگی", disabled }}
					/>

					<RHFProText
						name="national_id"
						label="شناسه ملی"
						itemProps={{ placeholder: "شناسه ملی", disabled }}
					/>

					<RHFProText
						name="title"
						label="عنوان"
						itemProps={{ placeholder: "عنوان", disabled }}
					/>

					<RHFProText name="phone" label="تلفن" inputProps={{ placeholder: "تلفن", disabled }} />

					<RHFProText name="email" label="ایمیل" inputProps={{ placeholder: "ایمیل", disabled }} />

				</div>
				<div style={{ gridColumn: "1 / -1" }}>
					{/* صاحب امضا */}
					<label style={{ display: "flex", gap: 8, alignItems: "center" }}>
						<input type="checkbox" disabled={disabled} {...methods.register("is_signatory")} />
						صاحب امضا
					</label>
				</div>
				<div className="flex justify-end gap-2 mt-4">
					<Button onClick={onClose}>انصراف</Button>
					<Button type="primary" onClick={handleSubmit(onSubmit)} loading={!!submitting} disabled={disabled || !isDirty || isSubmitting}>
						{submitText}
					</Button>
				</div>
			</FormProvider>
		</Form>
	);
}
