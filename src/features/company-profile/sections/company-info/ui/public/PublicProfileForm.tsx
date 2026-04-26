import type { Resolver } from "react-hook-form";
import type { PublicProfileFormValues } from "../../model/public/company-public.mappers";

import {
	RHFProText,
	RHFProTextArea,
} from "#src/shared/ui/rhf-pro";
import RHFFieldArrayText from "#src/shared/ui/rhf-pro/fields/RHFFieldArrayText.js";
import { ProCard } from "@ant-design/pro-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form } from "antd";
import React, { useEffect } from "react";

import { FormProvider, useForm } from "react-hook-form";
import CompanyInfoMapField from "../../../company-info/ui/CompanyInfoMapField";
import CompanyInfoSocialLinksField from "../../../company-info/ui/CompanyInfoSocialLinksField";

import { publicProfileSchema } from "../../model/public/company-public.schema";

interface Props {
	disabled: boolean
	defaultValues: PublicProfileFormValues
	onSubmit: (values: PublicProfileFormValues) => void | Promise<void>
}

export default function PublicProfileForm({ defaultValues, onSubmit }: Props) {
	const methods = useForm<PublicProfileFormValues>({
		defaultValues,
		resolver: zodResolver(publicProfileSchema as any) as unknown as Resolver<PublicProfileFormValues>,
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
				<ProCard bordered title="اطلاعات عمومی شرکت" className="bg-bgMask">
					<div className="grid grid-cols-2 gap-x-4">
						<RHFProText
							name="legal_name"
							label="نام حقوقی"
							inputProps={{ placeholder: "نام حقوقی" }}
						/>
						<RHFProText
							name="brand_name"
							label="نام برند"
							inputProps={{ placeholder: "نام برند" }}
						/>
					</div>
				</ProCard>

				<ProCard bordered title="آدرس و نقشه" className="bg-bgMask">
					<div className="grid grid-cols-2 gap-x-4">
						<RHFProText
							name="postal_code"
							label="کد پستی"
							inputProps={{ placeholder: "کد پستی" }}
						/>
						<RHFProText
							name="map_address"
							label="آدرس روی نقشه"
							inputProps={{ placeholder: "آدرس روی نقشه" }}
						/>

						<div className="col-span-2">
							<RHFProTextArea
								name="legal_address"
								label="آدرس حقوقی"
							/>
						</div>

						<div className="col-span-2">
							<CompanyInfoMapField />
						</div>
					</div>
				</ProCard>

				<ProCard bordered title="راه‌های ارتباطی" className="bg-bgMask">
					<div className="grid grid-cols-2 gap-x-4">
						<RHFFieldArrayText name="phone" label="تلفن" />
						<RHFFieldArrayText name="mobile" label="موبایل" />
						<RHFFieldArrayText name="email" label="ایمیل" />
						<RHFFieldArrayText name="fax" label="فکس" />

						<RHFProText
							name="website"
							label="وبسایت"
							inputProps={{ placeholder: "وبسایت" }}
						/>
						<RHFProText
							name="working_hours"
							label="ساعات کاری"
							inputProps={{ placeholder: "ساعات کاری" }}
						/>
					</div>
				</ProCard>

				<ProCard bordered title="شبکه‌های اجتماعی" className="bg-bgMask">
					<div className="mt-6">
						<CompanyInfoSocialLinksField />
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
