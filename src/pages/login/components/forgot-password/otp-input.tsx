import type { InputRef } from "antd";
import type { OtpInputProps } from "./otp-input.types";
import { Input, Space } from "antd";

import React, { useEffect, useMemo, useRef } from "react";
import { normalizeDigits } from "./forgot-password.utils";

/** OTP input با 6 باکس + paste + autofocus + backspace (پاک کردن کل OTP) */
export function OtpInput(props: OtpInputProps) {
	const { length = 6, value = "", onChange, disabled, autoFocus } = props;
	const inputsRef = useRef<Array<InputRef | null>>([]);

	// کلیدهای ثابت برای جلوگیری از key تکراری
	const keys = useMemo(
		() => (length === 6 ? ["d1", "d2", "d3", "d4", "d5", "d6"] : Array.from({ length }, (_, i) => `d${i + 1}`)),
		[length],
	);

	const digits = useMemo(() => {
		const v = normalizeDigits(value).replace(/\D/g, "").slice(0, length);
		return Array.from({ length }, (_, i) => v[i] ?? "");
	}, [value, length]);

	useEffect(() => {
		if (!autoFocus || disabled)
			return;

		const firstEmpty = digits.findIndex(d => !d);
		const idx = firstEmpty === -1 ? length - 1 : firstEmpty;
		inputsRef.current[idx]?.focus?.();
	}, [autoFocus, disabled, digits, length]);

	const emit = (arr: string[]) => {
		onChange?.(arr.join(""));
	};

	const focus = (idx: number) => {
		inputsRef.current[idx]?.focus?.();
	};

	const setAt = (idx: number, ch: string) => {
		const arr = [...digits];
		arr[idx] = ch;
		emit(arr);
	};

	const clearAll = () => {
		const arr = Array.from({ length }, () => "");
		emit(arr);
		focus(0);
	};

	return (
		<Space
			className="flex-row-reverse"
			dir="rtl"
			size={8}
			style={{ justifyContent: "center", width: "100%" }}
		>
			{keys.map((k, idx) => (
				<Input
					key={k}
					ref={(r) => {
						inputsRef.current[idx] = r;
					}}
					value={digits[idx]}
					disabled={disabled}
					inputMode="numeric"
					autoComplete="one-time-code"
					maxLength={1}
					placeholder="*"
					style={{
						width: 44,
						height: 44,
						textAlign: "center",
						fontSize: 18,
						fontWeight: 600,
					}}
					onChange={(e) => {
						const v = normalizeDigits(e.target.value).replace(/\D/g, "");
						if (!v) {
							setAt(idx, "");
							return;
						}

						// paste/autofill
						const chars = v.slice(0, length - idx).split("");
						const arr = [...digits];
						for (let i = 0; i < chars.length; i++) {
							arr[idx + i] = chars[i];
						}
						emit(arr);

						const nextIndex = Math.min(idx + chars.length, length - 1);
						focus(nextIndex);
					}}
					onKeyDown={(e) => {
						if (e.key !== "Backspace")
							return;

						// ✅ پاک کردن کل OTP با Backspace روی اولین باکسِ خالی
						if (idx === 0 && !digits[idx]) {
							clearAll();
							e.preventDefault();
							return;
						}

						if (digits[idx]) {
							setAt(idx, "");
						}
						else if (idx > 0) {
							focus(idx - 1);
							setAt(idx - 1, "");
						}
						e.preventDefault();
					}}
					onPaste={(e) => {
						const pasted = normalizeDigits(e.clipboardData.getData("text"))
							.replace(/\D/g, "")
							.slice(0, length);

						if (!pasted)
							return;

						const arr = Array.from({ length }, (_, i) => pasted[i] ?? "");
						emit(arr);
						focus(Math.min(pasted.length, length - 1));
						e.preventDefault();
					}}
				/>
			))}
		</Space>
	);
}
