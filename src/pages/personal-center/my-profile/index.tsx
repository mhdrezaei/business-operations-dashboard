import type { MyProfileFormValues } from "./model/profile.schema";

import { BasicButton, BasicContent } from "#src/components/index.js";
import { RHFProText } from "#src/shared/ui/rhf-pro/index.js";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "antd";
import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { updateProfile } from "./api/profile.api";
import { useMobileChangeOtp } from "./hooks/use-mobile-change-otp";
import {
	getComparableProfileString,
	mergeProfileValues,
	myProfileUpsertSchema,
	normalizeDigits,
	normalizeIranMobile,
	sanitizeProfileFormValues,
	sanitizeProfileInputValue,
	shouldPreventProfileInputKey,
} from "./model/profile.schema";
import { userProfileQuery } from "./queries/profile.queries";
import { MobileChangeOtpModal } from "./ui/MobileChangeOtpModal";

export default function MyProfileForm() {
	const [saving, setSaving] = useState(false);

	const queryClient = useQueryClient();
	const profileQuery = userProfileQuery();
	const userDetail = useQuery(profileQuery).data;

	const defaultValues = useMemo<MyProfileFormValues>(() => ({
		username: userDetail?.username ?? "",
		first_name: userDetail?.first_name ?? "",
		last_name: userDetail?.last_name ?? "",
		email: userDetail?.email ?? "",
		mobile: normalizeIranMobile(userDetail?.mobile ?? ""),
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

	const normalizeProfileForForm = (profile: MyProfileFormValues): MyProfileFormValues => ({
		...profile,
		...(sanitizeProfileFormValues(profile) as MyProfileFormValues),
	});

	const finishProfileUpdate = async (profile: MyProfileFormValues) => {
		const normalizedProfile = normalizeProfileForForm(profile);
		form.reset(normalizedProfile);
		queryClient.setQueryData(profileQuery.queryKey, normalizedProfile);
		await queryClient.invalidateQueries({ queryKey: profileQuery.queryKey });
	};

	const saveProfile = async (profile: MyProfileFormValues) => {
		setSaving(true);
		try {
			const result = await updateProfile({ ...profile });
			await finishProfileUpdate(result.data ?? profile);
			window.$message?.success("اطلاعات پروفایل با موفقیت ذخیره شد");
		}
		finally {
			setSaving(false);
		}
	};

	const mobileChangeOtp = useMobileChangeOtp({ finishProfileUpdate, setSaving });

	return (
		<FormProvider {...form}>
			<form
				onSubmit={form.handleSubmit(async (values) => {
					const profile = myProfileUpsertSchema.parse(values);
					const currentMobile = normalizeDigits(profile.mobile ?? "").replace(/\D/g, "");
					const initialMobile = normalizeDigits(mergedDefaultValues.mobile ?? "").replace(/\D/g, "");

					if (currentMobile !== initialMobile) {
						await mobileChangeOtp.requestMobileOtp(profile);
						return;
					}

					await saveProfile(profile);
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
										event.currentTarget.value = normalizeIranMobile(event.currentTarget.value).slice(0, 11);
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

						<Card variant="outlined" className="mt-6">
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

			<MobileChangeOtpModal {...mobileChangeOtp.modalProps} />
		</FormProvider>
	);
}
