import type { Resolver } from "react-hook-form";
import type { CompanyPersonFormValues } from "../model/company-people.types";
import { RHFProText, RHFSelect } from "#src/shared/ui/rhf-pro";
import { PlusOutlined } from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button, Form } from "antd";

import { useEffect } from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
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

function FieldArrayLabel({
	label,
	disabled,
	onAdd,
}: {
	label: string
	disabled: boolean
	onAdd: () => void
}) {
	return (
		<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
			<span>{label}</span>
			{!disabled && (
				<Button type="link" size="small" icon={<PlusOutlined />} onClick={onAdd}>
					افزودن
				</Button>
			)}
		</div>
	);
}

export default function CompanyPeopleForm({ disabled, defaultValues, onSubmit, onClose, submitText, submitting }: Props) {
	const methods = useForm<CompanyPersonFormValues>({
		defaultValues,
		resolver: zodResolver(companyPersonSchema) as Resolver<CompanyPersonFormValues>,
		mode: "onTouched",
	});

	const { control, handleSubmit, reset, formState: { isDirty, isSubmitting } } = methods;

	const {
		fields: phoneFields,
		append: appendPhone,
		remove: removePhone,
	} = useFieldArray({
		control,
		name: "phone",
	});

	const {
		fields: emailFields,
		append: appendEmail,
		remove: removeEmail,
	} = useFieldArray({
		control,
		name: "email",
	});

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
						inputProps={{ placeholder: "نام و نام خانوادگی", disabled }}
					/>

					<RHFProText
						name="national_id"
						label="شناسه ملی"
						inputProps={{ placeholder: "شناسه ملی", disabled, inputMode: "numeric" }}
					/>

					<RHFProText
						name="title"
						label="عنوان"
						inputProps={{ placeholder: "عنوان", disabled }}
					/>

					<Form.Item
						label={<FieldArrayLabel label="تلفن" disabled={disabled} onAdd={() => appendPhone({ value: "" })} />}
						style={{ marginBottom: 0 }}
					>
						{phoneFields.map((field, index) => (
							<div key={field.id} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
								<RHFProText
									name={`phone.${index}.value`}
									inputProps={{ placeholder: "تلفن", disabled, inputMode: "numeric" }}
									formItemProps={{ style: { flex: 1, marginBottom: 0 } }}
								/>
								{!disabled && phoneFields.length > 1 && (
									<Button danger type="text" onClick={() => removePhone(index)}>
										حذف
									</Button>
								)}
							</div>
						))}
					</Form.Item>

					<Form.Item
						label={<FieldArrayLabel label="ایمیل" disabled={disabled} onAdd={() => appendEmail({ value: "" })} />}
						style={{ marginBottom: 0 }}
					>
						{emailFields.map((field, index) => (
							<div key={field.id} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
								<RHFProText
									name={`email.${index}.value`}
									inputProps={{ placeholder: "ایمیل", disabled }}
									formItemProps={{ style: { flex: 1, marginBottom: 0 } }}
								/>
								{!disabled && emailFields.length > 1 && (
									<Button danger type="text" onClick={() => removeEmail(index)}>
										حذف
									</Button>
								)}
							</div>
						))}
					</Form.Item>
				</div>

				<div className="col-span-full">
					{/* صاحب امضا */}
					<label className="flex gap-2 items-center">
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
