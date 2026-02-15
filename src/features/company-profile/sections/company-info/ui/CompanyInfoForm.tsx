import type { Resolver } from "react-hook-form";
import type { CompanyInfoFormValues } from "../model/company-info.types";
import {
	RHFProDate,
	RHFProText,
	RHFProTextArea,
	RHFSelect,
} from "#src/shared/ui/rhf-pro";

import RHFFieldArrayText from "#src/shared/ui/rhf-pro/fields/RHFFieldArrayText.js";
import { ProCard } from "@ant-design/pro-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form } from "antd";

import React from "react";

import { FormProvider, useForm } from "react-hook-form";
import {
	COOPERATION_STATUS_OPTIONS,
	INFO_VERIFICATION_STATUS_OPTIONS,
	LEGAL_PERSON_TYPE_OPTIONS,
	SETTLEMENT_TERM_OPTIONS,
	VAT_STATUS_OPTIONS,
} from "../model/company-info.constants";

import { companyInfoSchema } from "../model/company-info.schema";
import CompanyInfoMapField from "./CompanyInfoMapField";
import CompanyInfoSocialLinksField from "./CompanyInfoSocialLinksField";

interface Props {
	disabled: boolean
	defaultValues: CompanyInfoFormValues
	onSubmit: (values: CompanyInfoFormValues) => void | Promise<void>
}

export default function CompanyInfoForm({ disabled, defaultValues, onSubmit }: Props) {
	const methods = useForm<CompanyInfoFormValues>({
		defaultValues,
		resolver: zodResolver(companyInfoSchema as any) as unknown as Resolver<CompanyInfoFormValues>,
		mode: "onBlur",
	});

	const { handleSubmit } = methods;

	return (
		<Form layout="vertical" className="space-y-3">
			<FormProvider {...methods}>
				<ProCard bordered title="اطلاعات پایه">
					<div className="grid grid-cols-2 gap-x-4">
						<RHFProText name="legal_name" label="نام حقوقی" inputProps={{ placeholder: "نام حقوقی", disabled }} />
						<RHFProText name="brand_name" label="نام برند" inputProps={{ placeholder: "نام برند", disabled }} />

						<RHFProText name="national_id" label="شناسه ملی" inputProps={{ placeholder: "شناسه ملی", disabled }} />
						<RHFSelect
							name="legal_person_type"
							label="نوع شخصیت حقوقی"
							selectProps={{ placeholder: "انتخاب کنید", allowClear: true, disabled }}
							options={LEGAL_PERSON_TYPE_OPTIONS}
						/>

						<RHFProText name="tax_national_id" label="شناسه مالیاتی" inputProps={{ placeholder: "شناسه مالیاتی", disabled }} />
					</div>
				</ProCard>

				<ProCard bordered title="ثبت شرکت">
					<div className="mt-6 grid grid-cols-2 gap-x-4">
						<RHFProText name="registration_number" label="شماره ثبت" inputProps={{ placeholder: "شماره ثبت", disabled }} />
						<RHFProText name="tax_registration_number" label="شماره ثبت مالیاتی" inputProps={{ placeholder: "شماره ثبت مالیاتی", disabled }} />

						<RHFProText name="registration_place" label="محل ثبت" inputProps={{ placeholder: "محل ثبت", disabled }} />
						<RHFProDate name="registration_date" label="تاریخ ثبت" itemProps={{ placeholder: "تاریخ ثبت", disabled }} />

						<RHFProText name="branch_code" label="کد شعبه" inputProps={{ placeholder: "کد شعبه", disabled }} />
					</div>
				</ProCard>

				<ProCard bordered title="آدرس و نقشه">
					<div className="mt-6 grid grid-cols-2 gap-x-4">
						<RHFProText name="postal_code" label="کد پستی" inputProps={{ placeholder: "کد پستی", disabled }} />
						<RHFProText name="map_address" label="آدرس روی نقشه" inputProps={{ placeholder: "آدرس روی نقشه", disabled }} />

						<div className="col-span-2">
							<RHFProTextArea name="legal_address" label="آدرس حقوقی" textAreaProps={{ disabled }} />
						</div>

						<div className="col-span-2">
							<CompanyInfoMapField disabled={disabled} />
						</div>
					</div>
				</ProCard>

				<ProCard bordered title="راهای ارتباطی">
					<div className="mt-6 grid grid-cols-2 gap-x-4">
						<RHFFieldArrayText name="phone" label="تلفن" disabled={disabled} />
						<RHFFieldArrayText name="mobile" label="موبایل" disabled={disabled} />
						<RHFFieldArrayText name="email" label="ایمیل" disabled={disabled} />
						<RHFFieldArrayText name="fax" label="فکس" disabled={disabled} />
						<RHFProText name="website" label="وبسایت" inputProps={{ placeholder: "وبسایت", disabled }} />
					</div>
				</ProCard>

				<ProCard bordered title="مالی و مالیات">
					<div className="mt-6 grid grid-cols-2 gap-x-4">
						<RHFProText name="economic_code" label="کد اقتصادی" inputProps={{ placeholder: "کد اقتصادی", disabled }} />
						<RHFProText name="tax_file_number" label="شماره پرونده مالیاتی" inputProps={{ placeholder: "شماره پرونده مالیاتی", disabled }} />
						<RHFProText name="tax_office" label="اداره مالیاتی" inputProps={{ placeholder: "اداره مالیاتی", disabled }} />

						<RHFSelect
							name="vat_status"
							label="وضعیت ارزش افزوده"
							selectProps={{ placeholder: "انتخاب کنید", allowClear: true, disabled }}
							options={VAT_STATUS_OPTIONS}
						/>
					</div>
				</ProCard>

				<div className="mt-6 grid grid-cols-2 gap-x-4">
					<RHFSelect
						name="cooperation_status"
						label="وضعیت همکاری"
						selectProps={{ placeholder: "انتخاب کنید", allowClear: true, disabled }}
						options={COOPERATION_STATUS_OPTIONS}
					/>
					<RHFSelect
						name="settlement_term"
						label="شرایط تسویه"
						selectProps={{ placeholder: "انتخاب کنید", allowClear: true, disabled }}
						options={SETTLEMENT_TERM_OPTIONS}
					/>

					<RHFProDate name="cooperation_start_date" label="تاریخ شروع همکاری" itemProps={{ placeholder: "تاریخ شروع همکاری", disabled }} />
					<RHFProText name="financial_commitment_cap" label="سقف تعهد مالی" inputProps={{ placeholder: "سقف تعهد مالی", disabled }} />

					<RHFProText name="working_hours" label="ساعات کاری" inputProps={{ placeholder: "ساعات کاری", disabled }} />
				</div>

				<div className="mt-6 grid grid-cols-2 gap-x-4">
					<RHFProText name="internal_code" label="کد داخلی" inputProps={{ placeholder: "کد داخلی", disabled }} />

					<RHFSelect
						name="info_verification_status"
						label="وضعیت تایید اطلاعات"
						selectProps={{ placeholder: "در انتظار", allowClear: true, disabled }}
						options={INFO_VERIFICATION_STATUS_OPTIONS}
					/>

					<div className="col-span-2">
						<RHFProTextArea name="internal_note" label="یادداشت داخلی" textAreaProps={{ disabled, rows: 4 }} />
					</div>
				</div>

				<div className="mt-6">
					<CompanyInfoSocialLinksField disabled={disabled} />
				</div>

				<Button
					type="primary"
					onClick={handleSubmit(values => onSubmit(values as unknown as CompanyInfoFormValues))}
				>
					ذخیره تغییرات
				</Button>
			</FormProvider>
		</Form>
	);
}
