import type { ProfilePayload } from "./api/profile.api";
import type { MyProfileFormValues } from "./model/profile.schema";

import { BasicButton, BasicContent } from "#src/components/index.js";
import { RHFProText } from "#src/shared/ui/rhf-pro/index.js";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Card } from "antd";
import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { updateProfile } from "./api/profile.api";
import {
	getComparableProfileString,
	mergeProfileValues,
	myProfileUpsertSchema,
	sanitizeProfileInputValue,
	shouldPreventProfileInputKey,
} from "./model/profile.schema";
import { userProfileQuery } from "./queries/profile.queries";

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

	return (
		<FormProvider {...form}>
			<form
				onSubmit={form.handleSubmit(async (values) => {
					setSaving(true);
					try {
						const profile = myProfileUpsertSchema.parse(values);
						await updateProfile({ ...profile } as ProfilePayload);
						form.reset(profile);
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
							<RHFProText name="email" label="ایمیل" />

							<RHFProText
								name="first_name"
								label="نام"
								inputProps={{
									onInput: (event) => {
										event.currentTarget.value = sanitizeProfileInputValue("letters", event.currentTarget.value);
									},
									onKeyDown: (event) => {
										if (shouldPreventProfileInputKey("letters", {
											key: event.key,
											ctrlKey: event.ctrlKey,
											metaKey: event.metaKey,
											altKey: event.altKey,
										})) {
											event.preventDefault();
										}
									},
								}}
							/>
							<RHFProText
								name="last_name"
								label="نام خانوادگی"
								inputProps={{
									onInput: (event) => {
										event.currentTarget.value = sanitizeProfileInputValue("letters", event.currentTarget.value);
									},
									onKeyDown: (event) => {
										if (shouldPreventProfileInputKey("letters", {
											key: event.key,
											ctrlKey: event.ctrlKey,
											metaKey: event.metaKey,
											altKey: event.altKey,
										})) {
											event.preventDefault();
										}
									},
								}}
							/>
							<RHFProText
								name="mobile"
								label="موبایل"
								enableNumericGuard={false}
								inputProps={{
									inputMode: "numeric",
									maxLength: 11,
									onInput: (event) => {
										event.currentTarget.value = sanitizeProfileInputValue("digits", event.currentTarget.value, 11);
									},
									onKeyDown: (event) => {
										if (shouldPreventProfileInputKey("digits", {
											key: event.key,
											value: event.currentTarget.value,
											selectionStart: event.currentTarget.selectionStart,
											selectionEnd: event.currentTarget.selectionEnd,
											maxLength: 11,
											ctrlKey: event.ctrlKey,
											metaKey: event.metaKey,
											altKey: event.altKey,
										})) {
											event.preventDefault();
										}
									},
								}}
							/>
							<RHFProText
								name="national_code"
								label="کد ملی"
								enableNumericGuard={false}
								inputProps={{
									inputMode: "numeric",
									maxLength: 10,
									onInput: (event) => {
										event.currentTarget.value = sanitizeProfileInputValue("digits", event.currentTarget.value, 10);
									},
									onKeyDown: (event) => {
										if (shouldPreventProfileInputKey("digits", {
											key: event.key,
											value: event.currentTarget.value,
											selectionStart: event.currentTarget.selectionStart,
											selectionEnd: event.currentTarget.selectionEnd,
											maxLength: 10,
											ctrlKey: event.ctrlKey,
											metaKey: event.metaKey,
											altKey: event.altKey,
										})) {
											event.preventDefault();
										}
									},
								}}
							/>
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
