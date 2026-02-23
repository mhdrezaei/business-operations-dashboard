import type { Step } from "./code-login.constants";
import { fetchOtpLogin, fetchRequestOtp } from "#src/api/user";
import { BasicButton } from "#src/components";
import { IR_MOBILE_PHONE_REGEXP } from "#src/constants/regular-expressions";

import { useAuthStore } from "#src/store";
import { EditOutlined, LeftOutlined } from "@ant-design/icons";
import { Button, Form, Input, Space, Typography } from "antd";
import React, { useContext, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";
import { FormModeContext } from "../../form-mode-context";
import { FORM_INITIAL_VALUES } from "./code-login.constants";
import { normalizeDigits, toApiMobile } from "./code-login.utils";
import { OtpInput } from "./otp-input";

const { Title, Text } = Typography;

export function CodeLogin() {
	const { t } = useTranslation();
	const { setFormMode } = useContext(FormModeContext);

	const [form] = Form.useForm();
	const [step, setStep] = useState<Step>("mobile");

	const [sending, setSending] = useState(false);
	const [verifying, setVerifying] = useState(false);
	const [cooldown, setCooldown] = useState(0);

	const mobile = Form.useWatch("mobile", form);
	const otp = Form.useWatch("otp", form);

	const apiMobile = useMemo(() => toApiMobile(mobile ?? ""), [mobile]);
	const isMobileValid = useMemo(() => IR_MOBILE_PHONE_REGEXP.test(apiMobile), [apiMobile]);

	// countdown timer
	useEffect(() => {
		if (cooldown <= 0)
			return;
		const id = window.setInterval(() => setCooldown(s => s - 1), 1000);
		return () => window.clearInterval(id);
	}, [cooldown]);

	const sendCode = async () => {
		const cleaned = toApiMobile(form.getFieldValue("mobile") ?? "");

		if (!IR_MOBILE_PHONE_REGEXP.test(cleaned)) {
			form.setFields([{ name: "mobile", errors: [t("form.mobile.invalid")] }]);
			return;
		}

		try {
			setSending(true);
			await fetchRequestOtp({ mobile: cleaned });

			window.$message?.success(t("authority.sendCode"));
			setStep("otp");
			setCooldown(60);

			form.setFieldsValue({ otp: "" });
		}
		catch (e: any) {
			window.$message?.error(e?.message ?? t("common.error"));
		}
		finally {
			setSending(false);
		}
	};

	const verify = async () => {
		const cleaned = toApiMobile(form.getFieldValue("mobile") ?? "");
		const code = normalizeDigits(form.getFieldValue("otp") ?? "").replace(/\D/g, "");

		if (!IR_MOBILE_PHONE_REGEXP.test(cleaned)) {
			setStep("mobile");
			return;
		}

		if (code.length !== 6) {
			form.setFields([{ name: "otp", errors: [t("form.code.invalid")] }]);
			return;
		}

		try {
			setVerifying(true);

			const res = await fetchOtpLogin({ mobile: cleaned, otp_code: code });

			useAuthStore.setState({
				access: res.access,
				refresh: res.refresh,
			});

			window.$message?.success(t("common.success"));
		}
		catch (e: any) {
			window.$message?.error(e?.message ?? t("common.error"));
			form.setFieldsValue({ otp: "" });
		}
		finally {
			setVerifying(false);
		}
	};

	// auto-submit after entering 6-digit code
	useEffect(() => {
		if (step !== "otp")
			return;

		const code = normalizeDigits(otp ?? "").replace(/\D/g, "");
		if (code.length === 6 && !verifying) {
			verify();
		}
	}, [otp, step]);

	return (
		<>
			<Space direction="vertical" style={{ width: "100%" }} size={4}>
				<Title level={3} style={{ marginBottom: 0 }}>
					{t("authority.codeLogin")}
				</Title>

				{step === "otp" && (
					<Text type="secondary">
						{t("authority.mobile")}
						:
						{" "}
						<Text strong>{toApiMobile(mobile ?? "")}</Text>
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
				)}
			</Space>

			<Form
				form={form}
				layout="vertical"
				initialValues={FORM_INITIAL_VALUES}
				onFinish={() => {
					if (step === "mobile")
						return sendCode();
					return verify();
				}}
				style={{ marginTop: 16 }}
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
										const cleaned = toApiMobile(val ?? "");
										if (!cleaned)
											return;
										if (!IR_MOBILE_PHONE_REGEXP.test(cleaned)) {
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
								style={{ direction: "ltr" }}
								size="large"
							/>
						</Form.Item>

						<Button
							block
							type="primary"
							size="large"
							loading={sending}
							disabled={!isMobileValid}
							onClick={() => form.submit()}
						>
							{sending ? t("common.loading") : t("authority.sendCode")}
						</Button>
					</>
				)}

				{step === "otp" && (
					<>
						<Form.Item
							label={t("authority.code")}
							name="otp"
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
							<OtpInput length={6} autoFocus disabled={verifying} />
						</Form.Item>

						<Space direction="vertical" style={{ width: "100%" }} size={8}>
							<Button
								block
								type="primary"
								size="large"
								htmlType="submit"
								loading={verifying}
								disabled={normalizeDigits(otp ?? "").replace(/\D/g, "").length !== 6}
							>
								{t("authority.login")}
							</Button>

							<Button
								block
								type="default"
								size="large"
								disabled={cooldown > 0 || sending}
								loading={sending}
								onClick={sendCode}
							>
								{cooldown > 0
									? t("authority.sendText", { second: cooldown })
									: t("authority.resendCode")}
							</Button>
						</Space>
					</>
				)}

				<div className="text-sm text-center" style={{ marginTop: 12 }}>
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
