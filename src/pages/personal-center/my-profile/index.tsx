import type { ProfilePayload } from "./api/profile.api";
import type { MyProfileFormValues } from "./model/profile.form.types";
import { BasicButton, BasicContent } from "#src/components/index.js";
import { RHFProText } from "#src/shared/ui/rhf-pro/index.js";
import { ProCard } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { Col, Row } from "antd";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { updateProfile } from "./api/profile.api";
import { userProfileQuery } from "./queries/profile.queries";

export default function MyProfileForm() {
	const [saving, setSaving] = useState(false);

	const userDetail = useQuery(userProfileQuery()).data;
	const defaultValues: MyProfileFormValues = {
		username: userDetail?.username ?? "",
		first_name: userDetail?.first_name ?? "",
		last_name: userDetail?.last_name ?? "",
		email: userDetail?.email ?? "",
		mobile: userDetail?.mobile ?? "",
		national_code: userDetail?.national_code ?? "",

	};

	// const dynamicResolver: Resolver<MyProfileFormValues> = useCallback(
	// 	async (values, context, options) => {
	// 		const schema = baseSchema;
	// 		const resolver = zodResolver(schema) as unknown as Resolver<MyProfileFormValues>;
	// 		return resolver(values, context, options);
	// 	},
	// 	[],
	// );

	const form = useForm<MyProfileFormValues>({ defaultValues });
	return (
		<FormProvider {...form}>
			<form
				onSubmit={form.handleSubmit(async (values) => {
					setSaving(true);
					try {
						const payload: ProfilePayload = { ...values };

						await updateProfile(payload);
					}
					finally {
						setSaving(false);
					}
				})}
			>
				<ProCard>
					<BasicContent className="w-full">
						<Row gutter={16}>
							<Col span={12}>
							</Col>
						</Row>
						<div className="grid grid-cols-2 gap-3">
							<RHFProText name="username" label="نام کاربری" />
							<RHFProText name="email" label="ایمیل" />

							<RHFProText name="first_name" label="نام" />
							<RHFProText name="last_name" label="نام خانوادگی" />

							<RHFProText name="mobile" label="موبایل" />
							<RHFProText name="national_code" label="کد ملی" />

						</div>
						<ProCard bordered>
							<div className="grid grid-cols-3 gap-3 ">
								<RHFProText
									name="password"

									label="رمز فعلی"
									inputProps={{ type: "password", defaultValue: "" }}
								/>

								<RHFProText
									name="newPassword"
									label="رمز جدید"
									inputProps={{ type: "password", defaultValue: "" }}
								/>

								<RHFProText
									name="ConfirmNewPassword"
									label="تکرار رمز جدید"
									inputProps={{ type: "password", defaultValue: "" }}
								/>
							</div>
						</ProCard>
					</BasicContent>
				</ProCard>
				<div className="flex justify-end gap-2 mt-2">
					<BasicButton
						htmlType="submit"
						type="primary"
						loading={saving}
					>
						ذخیره
					</BasicButton>
					<BasicButton>انصراف</BasicButton>
				</div>
			</form>
		</FormProvider>
	);
}

// import { BasicContent, FormAvatarItem } from "#src/components";
// import { useUserStore } from "#src/store";

// import {
// 	ProForm,
// 	ProFormDigit,
// 	ProFormText,
// 	ProFormTextArea,
// } from "@ant-design/pro-components";
// import { Form, Input } from "antd";

// export default function Profile() {
// 	const currentUser = useUserStore();
// 	const getAvatarURL = () => {
// 		if (currentUser) {
// 			if (currentUser.avatar) {
// 				return currentUser.avatar;
// 			}
// 			const url = "https://avatar.vercel.sh/blur.svg?text=2";
// 			return url;
// 		}
// 		return "";
// 	};

// 	const handleFinish = async () => {
// 		window.$message?.success("به‌روزرسانی اطلاعات پایه با موفقیت انجام شد");
// 	};

// 	return (
// 		<BasicContent className="max-w-md ml-10">
// 			<h3>اطلاعات من</h3>
// 			<ProForm
// 				layout="vertical"
// 				onFinish={handleFinish}
// 				initialValues={{
// 					...currentUser,
// 					avatar: getAvatarURL(),
// 				}}
// 				requiredMark
// 			>
// 				<Form.Item
// 					name="avatar"
// 					label="آواتار"
// 					rules={[
// 						{
// 							required: true,
// 							message: "لطفاً نام نمایشی خود را وارد کنید!",
// 						},
// 					]}
// 				>
// 					<FormAvatarItem />
// 				</Form.Item>
// 				<ProFormText
// 					name="username"
// 					label="نام کاربری"
// 					rules={[
// 						{
// 							required: true,
// 							message: "لطفاً نام کاربری خود را وارد کنید!",
// 						},
// 					]}
// 				/>
// 				<ProFormText
// 					name="email"
// 					label="ایمیل"
// 					rules={[
// 						{
// 							required: true,
// 							message: "لطفاً ایمیل خود را وارد کنید!",
// 						},
// 					]}
// 				/>
// 				<ProFormDigit
// 					name="phoneNumber"
// 					label="شماره تماس"
// 					rules={[
// 						{
// 							required: true,
// 							message: "لطفاً شماره تماس خود را وارد کنید!",
// 						},
// 					]}
// 				>
// 					<Input type="tel" allowClear />
// 				</ProFormDigit>
// 				<ProFormTextArea
// 					allowClear
// 					name="description"
// 					label="معرفی شخصی"
// 					placeholder="معرفی شخصی"
// 				/>
// 			</ProForm>
// 		</BasicContent>
// 	);
// };
