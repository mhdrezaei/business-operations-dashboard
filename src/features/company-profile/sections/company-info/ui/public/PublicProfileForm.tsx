import type { Resolver } from "react-hook-form";
import type { PublicProfileFormValues } from "../../model/public/company-public.mappers";

import {
	RHFProText,
	RHFProTextArea,
} from "#src/shared/ui/rhf-pro";
import RHFFieldArrayText from "#src/shared/ui/rhf-pro/fields/RHFFieldArrayText.js";
import { ProCard } from "@ant-design/pro-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, theme } from "antd";
import React from "react";

import { FormProvider, useForm } from "react-hook-form";
import CompanyInfoMapField from "../../../company-info/ui/CompanyInfoMapField";

import CompanyInfoSocialLinksField from "../../../company-info/ui/CompanyInfoSocialLinksField";
import { publicProfileSchema } from "../../model/public/company-public.schema";

interface Props {
	disabled: boolean
	defaultValues: PublicProfileFormValues
	onSubmit: (values: PublicProfileFormValues) => void | Promise<void>
}

export default function PublicProfileForm({ disabled, defaultValues, onSubmit }: Props) {
	const { useToken } = theme;
	const { token } = useToken();

	const methods = useForm<PublicProfileFormValues>({
		defaultValues,
		resolver: zodResolver(publicProfileSchema as any) as unknown as Resolver<PublicProfileFormValues>,
		mode: "onBlur",
	});

	const { handleSubmit } = methods;

	return (
		<Form layout="vertical" className="space-y-4">
			<FormProvider {...methods}>
				<ProCard bordered title="اطلاعات عمومی شرکت" style={{ backgroundColor: token.colorBgMask }}>
					<div className="grid grid-cols-2 gap-x-4">
						<RHFProText name="legal_name" label="نام حقوقی" inputProps={{ placeholder: "نام حقوقی", disabled }} />
						<RHFProText name="brand_name" label="نام برند" inputProps={{ placeholder: "نام برند", disabled }} />
					</div>
				</ProCard>

				<ProCard bordered title="آدرس و نقشه" style={{ backgroundColor: token.colorBgMask }}>
					<div className="grid grid-cols-2 gap-x-4">
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

				<ProCard bordered title="راه‌های ارتباطی" style={{ backgroundColor: token.colorBgMask }}>
					<div className="grid grid-cols-2 gap-x-4">
						<RHFFieldArrayText name="phone" label="تلفن" disabled={disabled} />
						<RHFFieldArrayText name="mobile" label="موبایل" disabled={disabled} />
						<RHFFieldArrayText name="email" label="ایمیل" disabled={disabled} />
						<RHFFieldArrayText name="fax" label="فکس" disabled={disabled} />
						<RHFProText name="website" label="وبسایت" inputProps={{ placeholder: "وبسایت", disabled }} />
						<RHFProText name="working_hours" label="ساعات کاری" inputProps={{ placeholder: "ساعات کاری", disabled }} />
					</div>
				</ProCard>

				<ProCard bordered title="شبکه‌های اجتماعی" style={{ backgroundColor: token.colorBgMask }}>
					<div className="mt-6">
						<CompanyInfoSocialLinksField disabled={disabled} />
					</div>
				</ProCard>

				<Button type="primary" onClick={handleSubmit(values => onSubmit(values))}>
					ذخیره تغییرات
				</Button>
			</FormProvider>
		</Form>
	);
}
