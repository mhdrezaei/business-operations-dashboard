import type { ProfilePayload } from "./api/profile.api";
import type { MyProfileFormValues } from "./model/profile.schema";

import { BasicButton, BasicContent } from "#src/components/index.js";
import { RHFProText } from "#src/shared/ui/rhf-pro/index.js";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Card, Form, Input } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";

import { updateProfile } from "./api/profile.api";
import {
	getComparableProfileString,
	keepDigitsOnly,
	keepLettersOnly,
	mergeProfileValues,
	myProfileUpsertSchema,
} from "./model/profile.schema";
import { userProfileQuery } from "./queries/profile.queries";

type TextFieldName = "first_name" | "last_name";
type DigitFieldName = "mobile" | "national_code";

export default function MyProfileForm() {
	const [saving, setSaving] = useState(false);

	const userDetail = useQuery(userProfileQuery()).data;

	const defaultValues = useMemo<MyProfileFormValues>(() => ({
		username: userDetail?.username ?? "",
		first_name: userDetail?.first_name ?? "",
		last_name: userDetail?.last_name ?? "",
		email: userDetail?.email ?? "",
		mobile: userDetail?.mobile ?? "",
		national_code: userDetail?.national_code ?? "",
		password: "",
		newPassword: "",
		ConfirmNewPassword: "",
	}), [userDetail]);

	const mergedDefaultValues = useMemo(() => defaultValues, [defaultValues]);

	const form = useForm<MyProfileFormValues>({
		defaultValues: mergedDefaultValues,
		mode: "onBlur",
		resolver: zodResolver(myProfileUpsertSchema),
	});

	const watchedValues = useWatch({ control: form.control });

	const isDirty = useMemo(() => {
		const currentMerged = mergeProfileValues(mergedDefaultValues, watchedValues as Partial<MyProfileFormValues>);
		return getComparableProfileString(currentMerged) !== getComparableProfileString(mergedDefaultValues);
	}, [mergedDefaultValues, watchedValues]);

	useEffect(() => {
		form.reset(mergedDefaultValues);
	}, [mergedDefaultValues, form]);

	function renderEmailField() {
		return (
			<Controller
				name="email"
				control={form.control}
				render={({ field, fieldState }) => (
					<Form.Item
						label="ایمیل"
						help={fieldState.error?.message}
						validateStatus={fieldState.error ? "error" : undefined}
					>
						<Input
							{...field}
							value={field.value ?? ""}
							status={fieldState.error ? "error" : undefined}
							autoComplete="email"
						/>
					</Form.Item>
				)}
			/>
		);
	}

	function renderLettersField(name: TextFieldName, label: string) {
		return (
			<Controller
				name={name}
				control={form.control}
				render={({ field, fieldState }) => (
					<Form.Item
						label={label}
						help={fieldState.error?.message}
						validateStatus={fieldState.error ? "error" : undefined}
					>
						<Input
							{...field}
							value={field.value ?? ""}
							onChange={e => field.onChange(keepLettersOnly(e.target.value))}
							status={fieldState.error ? "error" : undefined}
							autoComplete="off"
						/>
					</Form.Item>
				)}
			/>
		);
	}

	function renderDigitField(name: DigitFieldName, label: string, length: number) {
		return (
			<Controller
				name={name}
				control={form.control}
				render={({ field, fieldState }) => (
					<Form.Item
						label={label}
						help={fieldState.error?.message}
						validateStatus={fieldState.error ? "error" : undefined}
					>
						<Input
							{...field}
							value={field.value ?? ""}
							inputMode="numeric"
							maxLength={length}
							onChange={e => field.onChange(keepDigitsOnly(e.target.value, length))}
							status={fieldState.error ? "error" : undefined}
							autoComplete="off"
						/>
					</Form.Item>
				)}
			/>
		);
	}
	return (
		<FormProvider {...form}>
			<form
				onSubmit={form.handleSubmit(async (values) => {
					setSaving(true);
					try {
						await updateProfile({ ...values } as ProfilePayload);
						form.reset(values);
					}
					finally {
						setSaving(false);
					}
				})}
			>
				<Card>
					<BasicContent className="w-full">
						<div className="grid grid-cols-2 gap-3">
							<RHFProText name="username" label="نام کاربری" />
							{renderEmailField()}

							{renderLettersField("first_name", "نام")}
							{renderLettersField("last_name", "نام خانوادگی")}
							{renderDigitField("mobile", "موبایل", 11)}
							{renderDigitField("national_code", "کد ملی", 10)}
						</div>

						<Card bordered className="mt-6">
							<div className="grid grid-cols-3 gap-3">
								<RHFProText name="password" label="رمز فعلی" inputProps={{ type: "password" }} />
								<RHFProText name="newPassword" label="رمز جدید" inputProps={{ type: "password" }} />
								<RHFProText name="ConfirmNewPassword" label="تکرار رمز جدید" inputProps={{ type: "password" }} />
							</div>
						</Card>
					</BasicContent>
				</Card>

				<div className="flex justify-end gap-2 mt-6">
					<BasicButton htmlType="button" onClick={() => form.reset(mergedDefaultValues)}>
						انصراف
					</BasicButton>
					<BasicButton
						htmlType="submit"
						type="primary"
						loading={saving}
						disabled={!isDirty || saving}
					>
						ذخیره
					</BasicButton>
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
