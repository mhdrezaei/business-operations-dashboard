import type { Step } from "./forgot-password.constants";
import type { ForgotPasswordFormType } from "./forgot-password.types";
import { fetchForgotPasswordConfirm, fetchForgotPasswordRequest } from "#src/api/user";

import { BasicButton } from "#src/components";
import { IR_MOBILE_PHONE_REGEXP } from "#src/constants/regular-expressions";
import { EditOutlined, LeftOutlined } from "@ant-design/icons";
import { useCountDown } from "ahooks";
import { Button, Form, Input, Space, Typography } from "antd";

import React, { useContext, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FormModeContext } from "../../form-mode-context";
import { FORM_INITIAL_VALUES } from "./forgot-password.constants";
import { normalizeDigits, toApiMobile } from "./forgot-password.utils";
import { OtpInput } from "./otp-input";

const { Title, Text } = Typography;

export function ForgotPassword() {
	const { t } = useTranslation();
	const { setFormMode } = useContext(FormModeContext);

	const [step, setStep] = useState<Step>("mobile");
	const [loading, setLoading] = useState(false);
	const [targetDate, setTargetDate] = useState<number>(0);

	const [countdown] = useCountDown({
		targetDate,
		onEnd: () => setTargetDate(0),
	});

	const [form] = Form.useForm<ForgotPasswordFormType>();

	const mobile = Form.useWatch("mobile", form);
	const otpCode = Form.useWatch("otp_code", form);

	const cleanedMobile = useMemo(() => toApiMobile(mobile ?? ""), [mobile]);
	const isMobileValid = useMemo(() => IR_MOBILE_PHONE_REGEXP.test(cleanedMobile), [cleanedMobile]);

	const otpDigitsLen = useMemo(
		() => normalizeDigits(otpCode ?? "").replace(/\D/g, "").length,
		[otpCode],
	);

	const sendOtp = async () => {
		const m = toApiMobile(form.getFieldValue("mobile") ?? "");

		if (!IR_MOBILE_PHONE_REGEXP.test(m)) {
			form.setFields([{ name: "mobile", errors: [t("form.mobile.invalid")] }]);
			return;
		}

		try {
			setLoading(true);
			await fetchForgotPasswordRequest({ mobile: m });

			// OTP معتبر ۱۰ دقیقه
			setTargetDate(Date.now() + 1000 * 60 * 10);

			setStep("confirm");
			form.setFieldsValue({ otp_code: "", new_password: "", new_password_confirm: "" });

			window.$message?.success(t("authority.sendCode"));
		}
		catch (e: any) {
			window.$message?.error(e?.message ?? t("common.error"));
		}
		finally {
			setLoading(false);
		}
	};

	const confirmReset = async () => {
		const m = toApiMobile(form.getFieldValue("mobile") ?? "");
		const otp_code = normalizeDigits(form.getFieldValue("otp_code") ?? "").replace(/\D/g, "");
		const new_password = form.getFieldValue("new_password") ?? "";
		const new_password_confirm = form.getFieldValue("new_password_confirm") ?? "";

		if (!IR_MOBILE_PHONE_REGEXP.test(m)) {
			setStep("mobile");
			return;
		}

		if (otp_code.length !== 6) {
			form.setFields([{ name: "otp_code", errors: [t("form.code.invalid")] }]);
			return;
		}

		if (!new_password) {
			form.setFields([{ name: "new_password", errors: [t("form.password.required")] }]);
			return;
		}

		if (new_password !== new_password_confirm) {
			form.setFields([{ name: "new_password_confirm", errors: [t("form.password.notMatch")] }]);
			return;
		}

		try {
			setLoading(true);
			await fetchForgotPasswordConfirm({ mobile: m, otp_code, new_password });

			window.$message?.success(t("common.success"));
			setFormMode("login");
		}
		catch (e: any) {
			window.$message?.error(e?.message ?? t("common.error"));
			form.setFieldsValue({ otp_code: "" });
		}
		finally {
			setLoading(false);
		}
	};

	return (
		<>
			<Space direction="vertical">
				<Title level={3}>
					{t("authority.forgotPassword")}
				</Title>
			</Space>

			<Form
				name="forgotForm"
				form={form}
				layout="vertical"
				initialValues={FORM_INITIAL_VALUES}
				onFinish={() => {
					if (step === "mobile")
						return sendOtp();
					return confirmReset();
				}}
			>
				{step === "mobile" && (
					<>
						<Form.Item
							label={t("authority.mobile")}
							name="mobile"
							normalize={normalizeDigits}
							rules={[
								{ required: true, message: t("form.mobile.required") },
								{
									validator: async (_, val) => {
										const m = toApiMobile(val ?? "");
										if (!m)
											return;
										if (!IR_MOBILE_PHONE_REGEXP.test(m)) {
											throw new Error(t("form.mobile.invalid"));
										}
									},
								},
							]}
						>
							<Input
								inputMode="numeric"
								autoComplete="tel"
								placeholder="09xxxxxxxxx"
								className="[direction:ltr]"
								size="large"
							/>
						</Form.Item>

						<Form.Item>
							<Button
								block
								type="primary"
								htmlType="submit"
								loading={loading}
								disabled={!isMobileValid}
							>
								{t("authority.sendCode")}
							</Button>
						</Form.Item>
					</>
				)}

				{step === "confirm" && (
					<>
						<div className="mb-3">
							<Text type="secondary">
								{t("authority.codeSentTo", { mobile })}
								{" "}
								<Text strong className="[direction:ltr] [unicode-bidi:plaintext]">
									{cleanedMobile}
								</Text>
								{" "}
								<Button
									type="link"
									size="small"
									icon={<EditOutlined />}
									onClick={() => setStep("mobile")}
								>
									{t("common.edit")}
								</Button>
							</Text>
						</div>

						<Form.Item
							label={t("authority.code")}
							name="otp_code"
							rules={[
								{ required: true, message: t("form.code.required") },
								{
									validator: async (_, val) => {
										const code = normalizeDigits(val ?? "").replace(/\D/g, "");
										if (code && code.length !== 6) {
											throw new Error(t("form.code.invalid"));
										}
									},
								},
							]}
						>
							<OtpInput length={6} autoFocus disabled={loading} />
						</Form.Item>

						<Form.Item
							label={t("authority.newPassword")}
							name="new_password"
							rules={[{ required: true, message: t("form.password.required") }]}
						>
							<Input.Password placeholder={t("form.password.required")} size="large" />
						</Form.Item>

						<Form.Item
							label={t("authority.newPasswordConfirm")}
							name="new_password_confirm"
							dependencies={["new_password"]}
							rules={[
								{ required: true, message: t("form.password.required") },
								({ getFieldValue }) => ({
									validator(_, value) {
										const p1 = getFieldValue("new_password");
										if (!value || value === p1)
											return Promise.resolve();
										return Promise.reject(new Error(t("form.password.notMatch")));
									},
								}),
							]}
						>
							<Input.Password placeholder={t("form.password.required")} size="large" />
						</Form.Item>

						<div className="flex items-center justify-between text-xs opacity-80 mb-3">
							<span>{t("authority.remainingTime")}</span>
							<span className="[direction:ltr]">
								{targetDate ? new Date(countdown).toISOString().slice(14, 19) : "00:00"}
							</span>
						</div>

						<Space direction="vertical" className="w-full" size={8}>
							<Button
								block
								type="primary"
								htmlType="submit"
								loading={loading}
								disabled={otpDigitsLen !== 6}
							>
								{t("authority.confirmAndChangePassword")}
							</Button>

							<Button
								block
								type="default"
								disabled={countdown > 0 || loading}
								loading={loading}
								onClick={sendOtp}
							>
								{countdown > 0
									? t("authority.retryAfterText", { count: Math.floor(countdown / 1000) })
									: t("authority.resendCode")}
							</Button>
						</Space>
					</>
				)}

				<div className="text-sm text-center mt-3">
					<BasicButton
						type="link"
						icon={<LeftOutlined />}
						className="px-1"
						onPointerDown={() => setFormMode("login")}
					>
						{t("common.back")}
					</BasicButton>
				</div>
			</Form>
		</>
	);
}
