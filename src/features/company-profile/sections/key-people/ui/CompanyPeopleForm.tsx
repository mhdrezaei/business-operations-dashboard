import type { Resolver } from "react-hook-form";
import type { CompanyPersonFormValues } from "../model/company-people.types";
import { RHFProText, RHFSelect } from "#src/shared/ui/rhf-pro";
import RHFFieldArrayText from "#src/shared/ui/rhf-pro/fields/RHFFieldArrayText.js";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button, Form } from "antd";
// src/features/company-profile/sections/key-people/ui/CompanyPeopleForm.tsx
import React from "react";

import { FormProvider, useForm } from "react-hook-form";
import { COMPANY_PERSON_ROLE_OPTIONS } from "../model/company-people.constants";
import { companyPersonSchema } from "../model/company-people.schema";

interface Props {
	disabled: boolean
	defaultValues: CompanyPersonFormValues
	submitText: string
	onSubmit: (values: CompanyPersonFormValues) => void | Promise<void>
	submitting?: boolean
}

export default function CompanyPeopleForm({ disabled, defaultValues, onSubmit, submitText, submitting }: Props) {
	const methods = useForm<CompanyPersonFormValues>({
		defaultValues,
		resolver: (zodResolver(companyPersonSchema as any) as unknown) as Resolver<CompanyPersonFormValues>,
		mode: "onBlur",
	});

	const { handleSubmit } = methods;

	return (
		<Form layout="vertical">
			<FormProvider {...methods}>
				<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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

					<div style={{ gridColumn: "1 / -1" }}>
						{/* صاحب امضا */}
						<label style={{ display: "flex", gap: 8, alignItems: "center" }}>
							<input type="checkbox" disabled={disabled} {...methods.register("is_signatory")} />
							صاحب امضا
						</label>
					</div>

					<div style={{ gridColumn: "1 / -1" }}>
						<RHFFieldArrayText name="phone" label="تلفن" disabled={disabled} />
					</div>

					<div style={{ gridColumn: "1 / -1" }}>
						<RHFFieldArrayText name="email" label="ایمیل" disabled={disabled} />
					</div>
				</div>

				<Button type="primary" onClick={handleSubmit(onSubmit)} loading={!!submitting} disabled={disabled}>
					{submitText}
				</Button>
			</FormProvider>
		</Form>
	);
}
