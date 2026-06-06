import type { MobileOtpStep } from "../model/mobile-change-otp";

import { BasicButton } from "#src/components/index.js";
import { Modal, Space, Typography } from "antd";

import { OtpInput } from "../../../login/components/code-login/otp-input";
import { normalizeDigits } from "../model/profile.schema";

const { Text } = Typography;

interface MobileChangeOtpModalProps {
	open: boolean
	verifyingOtp: boolean
	resendingOtp: boolean
	currentMobileOtpCode: string
	newMobileOtpCode: string
	mobileOtpStep: MobileOtpStep
	cooldown: number
	pendingMobile: string
	onCancel: () => void
	onConfirmCurrent: () => void
	onConfirmNew: () => void
	onCurrentCodeChange: (value: string) => void
	onNewCodeChange: (value: string) => void
	onResend: () => void
}

function normalizeOtpCode(value: string) {
	return normalizeDigits(value).replace(/\D/g, "").slice(0, 6);
}

export function MobileChangeOtpModal({
	open,
	verifyingOtp,
	resendingOtp,
	currentMobileOtpCode,
	newMobileOtpCode,
	mobileOtpStep,
	cooldown,
	pendingMobile,
	onCancel,
	onConfirmCurrent,
	onConfirmNew,
	onCurrentCodeChange,
	onNewCodeChange,
	onResend,
}: MobileChangeOtpModalProps) {
	const currentCodeLength = normalizeOtpCode(currentMobileOtpCode).length;
	const newCodeLength = normalizeOtpCode(newMobileOtpCode).length;
	const isCurrentStep = mobileOtpStep === "current";

	return (
		<Modal
			title="تایید تغییر شماره موبایل"
			open={open}
			okText="تایید کد"
			cancelText="انصراف"
			confirmLoading={verifyingOtp}
			okButtonProps={{ disabled: isCurrentStep ? currentCodeLength !== 6 : newCodeLength !== 6 }}
			onOk={isCurrentStep ? onConfirmCurrent : onConfirmNew}
			onCancel={onCancel}
		>
			<Space direction="vertical" className="w-full" size={16}>
				<div className="rounded-md border border-gray-200 p-4">
					<Space direction="vertical" className="w-full" size={12}>
						<Text strong>کد ارسال‌شده به شماره قبلی</Text>
						<Text type="secondary">ابتدا کدی را وارد کنید که برای شماره قبلی شما ارسال شده است.</Text>
						<OtpInput
							length={6}
							autoFocus={isCurrentStep}
							value={currentMobileOtpCode}
							disabled={verifyingOtp || !isCurrentStep}
							onChange={value => onCurrentCodeChange(normalizeOtpCode(value))}
						/>
					</Space>
				</div>

				<div className="rounded-md border border-gray-200 p-4">
					<Space direction="vertical" className="w-full" size={12}>
						<Text strong>کد ارسال‌شده به شماره جدید</Text>
						<Text type="secondary">
							بعد از تایید کد اول، کد شماره جدید
							{" "}
							<Text strong>{pendingMobile}</Text>
							{" "}
							را اینجا وارد کنید.
						</Text>
						<OtpInput
							length={6}
							autoFocus={!isCurrentStep}
							value={newMobileOtpCode}
							disabled={verifyingOtp || isCurrentStep}
							onChange={value => onNewCodeChange(normalizeOtpCode(value))}
						/>
						{isCurrentStep && (
							<Text type="secondary">این بخش بعد از تایید کد شماره قبلی فعال می‌شود.</Text>
						)}
					</Space>
				</div>

				<BasicButton
					htmlType="button"
					block
					loading={resendingOtp}
					disabled={cooldown > 0 || resendingOtp}
					onClick={onResend}
				>
					{cooldown > 0 ? `ارسال مجدد تا ${cooldown} ثانیه دیگر` : "ارسال مجدد کد"}
				</BasicButton>
			</Space>
		</Modal>
	);
}
