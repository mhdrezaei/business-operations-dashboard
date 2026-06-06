import type { MobileOtpStep } from "../model/mobile-change-otp";
import type { MyProfileFormValues } from "../model/profile.schema";

import { useEffect, useState } from "react";

import { fetchProfile, updateProfile } from "../api/profile.api";
import {
	isPendingCurrentMobileStage,
	isPendingNewMobileStage,
	translateMobileOtpError,
} from "../model/mobile-change-otp";
import { normalizeDigits } from "../model/profile.schema";

interface UseMobileChangeOtpOptions {
	finishProfileUpdate: (profile: MyProfileFormValues) => Promise<void>
	setSaving: (saving: boolean) => void
}

export function useMobileChangeOtp({ finishProfileUpdate, setSaving }: UseMobileChangeOtpOptions) {
	const [verifyingOtp, setVerifyingOtp] = useState(false);
	const [resendingOtp, setResendingOtp] = useState(false);
	const [otpModalOpen, setOtpModalOpen] = useState(false);
	const [currentMobileOtpCode, setCurrentMobileOtpCode] = useState("");
	const [newMobileOtpCode, setNewMobileOtpCode] = useState("");
	const [mobileOtpStep, setMobileOtpStep] = useState<MobileOtpStep>("current");
	const [cooldown, setCooldown] = useState(0);
	const [pendingProfile, setPendingProfile] = useState<MyProfileFormValues | null>(null);

	useEffect(() => {
		if (cooldown <= 0)
			return;

		const id = window.setInterval(() => setCooldown(current => current - 1), 1000);
		return () => window.clearInterval(id);
	}, [cooldown]);

	const resetOtpState = () => {
		setPendingProfile(null);
		setCurrentMobileOtpCode("");
		setNewMobileOtpCode("");
		setMobileOtpStep("current");
	};

	const closeOtpModal = () => {
		setOtpModalOpen(false);
		resetOtpState();
	};

	const requestMobileOtp = async (profile: MyProfileFormValues) => {
		setSaving(true);
		try {
			const result = await updateProfile({ mobile: profile.mobile });
			const pendingCurrent = isPendingCurrentMobileStage(result.errorMessage);
			const pendingNew = isPendingNewMobileStage(result.errorMessage);

			if (result.status === 202 || pendingCurrent || pendingNew) {
				setPendingProfile(profile);
				setCurrentMobileOtpCode("");
				setNewMobileOtpCode("");
				setMobileOtpStep(pendingNew ? "new" : "current");
				setOtpModalOpen(true);
				setCooldown(60);
				window.$message?.success(
					result.status === 202
						? "کد تایید به شماره قبلی شما ارسال شد"
						: translateMobileOtpError(result.errorMessage),
				);
				return;
			}

			if (!result.data) {
				window.$message?.error(translateMobileOtpError(result.errorMessage));
				return;
			}

			await finishProfileUpdate(result.data);
			window.$message?.success("شماره موبایل با موفقیت تغییر کرد");
		}
		finally {
			setSaving(false);
		}
	};

	const confirmCurrentMobileOtp = async () => {
		if (!pendingProfile)
			return;

		const code = normalizeDigits(currentMobileOtpCode).replace(/\D/g, "");
		if (code.length !== 6) {
			window.$message?.error("کد تایید باید ۶ رقم باشد");
			return;
		}

		setVerifyingOtp(true);
		try {
			const result = await updateProfile({
				mobile: pendingProfile.mobile,
				mobile_otp_code: code,
			});

			if (result.status === 202) {
				setMobileOtpStep("new");
				setNewMobileOtpCode("");
				setCooldown(60);
				window.$message?.success("کد شماره قبلی تایید شد. کد ارسال‌شده به شماره جدید را وارد کنید");
				return;
			}

			if (!result.data) {
				window.$message?.error(translateMobileOtpError(result.errorMessage));
				setCurrentMobileOtpCode("");
				return;
			}

			await finishProfileUpdate(result.data ?? await fetchProfile());
			setOtpModalOpen(false);
			resetOtpState();
			window.$message?.success("شماره موبایل با موفقیت تغییر کرد");
		}
		catch {
			setCurrentMobileOtpCode("");
		}
		finally {
			setVerifyingOtp(false);
		}
	};

	const confirmNewMobileOtp = async () => {
		if (!pendingProfile)
			return;

		const newCode = normalizeDigits(newMobileOtpCode).replace(/\D/g, "");
		if (newCode.length !== 6) {
			window.$message?.error("کد تایید باید ۶ رقم باشد");
			return;
		}

		setVerifyingOtp(true);
		try {
			const result = await updateProfile({
				mobile: pendingProfile.mobile,
				mobile_otp_code: newCode,
			});

			if (!result.data) {
				window.$message?.error(translateMobileOtpError(result.errorMessage));
				setNewMobileOtpCode("");
				return;
			}

			await finishProfileUpdate(result.data ?? await fetchProfile());
			setOtpModalOpen(false);
			resetOtpState();
			window.$message?.success("شماره موبایل با موفقیت تغییر کرد");
		}
		catch {
			setNewMobileOtpCode("");
		}
		finally {
			setVerifyingOtp(false);
		}
	};

	const resendMobileOtp = async () => {
		if (!pendingProfile || cooldown > 0)
			return;

		setResendingOtp(true);
		try {
			const result = await updateProfile({ mobile: pendingProfile.mobile });
			if (result.status === 202) {
				if (mobileOtpStep === "new")
					setNewMobileOtpCode("");
				else
					setCurrentMobileOtpCode("");
				setCooldown(60);
				window.$message?.success("کد تایید دوباره ارسال شد");
				return;
			}

			if (isPendingCurrentMobileStage(result.errorMessage) || isPendingNewMobileStage(result.errorMessage)) {
				setMobileOtpStep(isPendingNewMobileStage(result.errorMessage) ? "new" : "current");
				window.$message?.warning(translateMobileOtpError(result.errorMessage));
				return;
			}

			window.$message?.error(translateMobileOtpError(result.errorMessage));
		}
		finally {
			setResendingOtp(false);
		}
	};

	return {
		requestMobileOtp,
		modalProps: {
			open: otpModalOpen,
			verifyingOtp,
			resendingOtp,
			currentMobileOtpCode,
			newMobileOtpCode,
			mobileOtpStep,
			cooldown,
			pendingMobile: pendingProfile?.mobile ?? "",
			onCancel: closeOtpModal,
			onConfirmCurrent: confirmCurrentMobileOtp,
			onConfirmNew: confirmNewMobileOtp,
			onCurrentCodeChange: setCurrentMobileOtpCode,
			onNewCodeChange: setNewMobileOtpCode,
			onResend: resendMobileOtp,
		},
	};
}
