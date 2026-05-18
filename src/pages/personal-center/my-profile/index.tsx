import type { ProfilePayload } from "./api/profile.api";
import type { MyProfileFormValues } from "./model/profile.form.types";
import { BasicButton, BasicContent } from "#src/components/index.js";
import { RHFProText } from "#src/shared/ui/rhf-pro/index.js";
import { useQuery } from "@tanstack/react-query";
import { Card, Col, Form, Input, Row } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { updateProfile } from "./api/profile.api";
import { userProfileQuery } from "./queries/profile.queries";

type TextFieldName = "first_name" | "last_name";
type DigitFieldName = "mobile" | "national_code";

const lettersOnlyPattern = /^[\p{L}\s]+$/u;
const emailPattern = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;

function normalizeDigits(value: string) {
	return value
		.replace(/[\u06F0-\u06F9]/g, digit => String(digit.charCodeAt(0) - 1776))
		.replace(/[\u0660-\u0669]/g, digit => String(digit.charCodeAt(0) - 1632));
}

function keepLettersOnly(value: string) {
	return Array.from(value).filter(char => /[\p{L}\s]/u.test(char)).join("");
}

function keepDigitsOnly(value: string, maxLength: number) {
	return normalizeDigits(value).replace(/\D/g, "").slice(0, maxLength);
}

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

	const form = useForm<MyProfileFormValues>({
		defaultValues,
		mode: "onBlur",
	});
	const { isDirty } = form.formState;

	useEffect(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	function renderEmailField() {
		const message = "ساختار ایمیل درست نیست";

		return (
			<Controller
				name="email"
				control={form.control}
				rules={{
					validate: value => !value || emailPattern.test(value) || message,
				}}
				render={({ field, fieldState }) => (
					<Form.Item
						label="ایمیل"
						help={fieldState.error?.message}
						validateStatus={fieldState.error ? "error" : undefined}
					>
						<Input
							value={field.value ?? ""}
							onChange={(event) => {
								field.onChange(event.target.value);
								form.clearErrors("email");
							}}
							onBlur={() => {
								field.onBlur();
								void form.trigger("email");
							}}
							ref={field.ref}
							status={fieldState.error ? "error" : undefined}
							autoComplete="email"
						/>
					</Form.Item>
				)}
			/>
		);
	}

	function renderLettersField(name: TextFieldName, label: string) {
		const message = `${label} فقط باید شامل حروف باشد`;

		return (
			<Controller
				name={name}
				control={form.control}
				rules={{
					validate: value => !value || lettersOnlyPattern.test(value) || message,
				}}
				render={({ field, fieldState }) => (
					<Form.Item
						label={label}
						help={fieldState.error?.message}
						validateStatus={fieldState.error ? "error" : undefined}
					>
						<Input
							value={field.value ?? ""}
							onBeforeInput={(event) => {
								const data = (event as any).data as string | undefined;
								if (!data || keepLettersOnly(data) === data)
									return;

								event.preventDefault();
								form.setError(name, { type: "pattern", message });
							}}
							onPaste={(event) => {
								event.preventDefault();
								const text = event.clipboardData.getData("text") ?? "";
								const cleaned = keepLettersOnly(text);

								if (cleaned !== text)
									form.setError(name, { type: "pattern", message });
								else
									form.clearErrors(name);

								const target = event.currentTarget;
								const start = target.selectionStart ?? target.value.length;
								const end = target.selectionEnd ?? target.value.length;
								field.onChange(target.value.slice(0, start) + cleaned + target.value.slice(end));
							}}
							onChange={(event) => {
								const nextValue = event.target.value;
								const cleaned = keepLettersOnly(nextValue);

								if (cleaned !== nextValue)
									form.setError(name, { type: "pattern", message });
								else
									form.clearErrors(name);

								field.onChange(cleaned);
							}}
							onBlur={() => {
								field.onBlur();
								void form.trigger(name);
							}}
							ref={field.ref}
							status={fieldState.error ? "error" : undefined}
							autoComplete="off"
						/>
					</Form.Item>
				)}
			/>
		);
	}

	function renderDigitField(name: DigitFieldName, label: string, length: number, message: string) {
		return (
			<Controller
				name={name}
				control={form.control}
				rules={{
					validate: value => String(value ?? "").length === length || message,
				}}
				render={({ field, fieldState }) => (
					<Form.Item
						label={label}
						help={fieldState.error?.message}
						validateStatus={fieldState.error ? "error" : undefined}
					>
						<Input
							value={field.value ?? ""}
							inputMode="numeric"
							maxLength={length}
							onBeforeInput={(event) => {
								const data = (event as any).data as string | undefined;
								if (!data)
									return;

								const target = event.currentTarget;
								const start = target.selectionStart ?? target.value.length;
								const end = target.selectionEnd ?? target.value.length;
								const cleaned = keepDigitsOnly(data, length);
								const nextLength = target.value.length - (end - start) + cleaned.length;

								if (cleaned !== normalizeDigits(data) || nextLength > length)
									event.preventDefault();
							}}
							onPaste={(event) => {
								event.preventDefault();
								const text = event.clipboardData.getData("text") ?? "";
								const target = event.currentTarget;
								const start = target.selectionStart ?? target.value.length;
								const end = target.selectionEnd ?? target.value.length;
								const merged = target.value.slice(0, start) + text + target.value.slice(end);

								field.onChange(keepDigitsOnly(merged, length));
								form.clearErrors(name);
							}}
							onChange={(event) => {
								field.onChange(keepDigitsOnly(event.target.value, length));
								form.clearErrors(name);
							}}
							onBlur={(event) => {
								field.onBlur();
								if (event.target.value.length !== length)
									void form.trigger(name);
							}}
							ref={field.ref}
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
						const payload: ProfilePayload = { ...values };

						await updateProfile(payload);
						form.reset(values);
					}
					finally {
						setSaving(false);
					}
				})}
			>
				<Card>
					<BasicContent className="w-full">
						<Row gutter={16}>
							<Col span={12}>
							</Col>
						</Row>
						<div className="grid grid-cols-2 gap-3">
							<RHFProText name="username" label="نام کاربری" />
							{renderEmailField()}

							{renderLettersField("first_name", "نام")}
							{renderLettersField("last_name", "نام خانوادگی")}

							{renderDigitField("mobile", "موبایل", 11, "شماره موبایل باید 11 رقم باشد")}
							{renderDigitField("national_code", "کد ملی", 10, "کد ملی باید 10 رقم باشد")}

						</div>
						<Card bordered>
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
						</Card>
					</BasicContent>
				</Card>
				<div className="flex justify-end gap-2 mt-2">
					<BasicButton
						htmlType="submit"
						type="primary"
						loading={saving}
						disabled={!isDirty || saving}
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
