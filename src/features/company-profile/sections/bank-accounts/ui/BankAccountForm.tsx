import type { InputRef } from "antd";
import type { BankAccountFormValues } from "../model/bank-accounts.types";
import { RHFProText } from "#src/shared/ui/rhf-pro";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, Input } from "antd";
import React, { useEffect, useMemo, useRef } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import {
	detectBankNameByCardNumber,
	getIbanDigits,
	normalizeBankDigits,
	normalizeCardNumber,
	normalizeIban,
} from "../model/bank-accounts.constants";
import { bankAccountSchema } from "../model/bank-accounts.schema";

interface SegmentedNumericInputProps {
	value: string
	onChange: (value: string) => void
	onBlur?: () => void
	segments: number[]
	disabled?: boolean
	prefix?: React.ReactNode
	autoFocus?: boolean
	showSeparators?: boolean
}

function SegmentedNumericInput({
	value,
	onChange,
	onBlur,
	segments,
	disabled,
	prefix,
	autoFocus,
	showSeparators,
}: SegmentedNumericInputProps) {
	const inputsRef = useRef<Array<InputRef | null>>([]);
	const totalLength = useMemo(() => segments.reduce((sum, length) => sum + length, 0), [segments]);

	const parts = useMemo(() => {
		const digits = normalizeBankDigits(value).replace(/\D/g, "").slice(0, totalLength);
		let cursor = 0;
		return segments.map((length) => {
			const part = digits.slice(cursor, cursor + length);
			cursor += length;
			return part;
		});
	}, [segments, totalLength, value]);

	useEffect(() => {
		if (!autoFocus || disabled)
			return;

		const firstEmpty = parts.findIndex((part, index) => part.length < segments[index]);
		const targetIndex = firstEmpty === -1 ? segments.length - 1 : firstEmpty;
		inputsRef.current[targetIndex]?.focus?.();
	}, [autoFocus, disabled, parts, segments]);

	const emit = (nextParts: string[]) => {
		onChange(nextParts.join("").slice(0, totalLength));
	};

	const focus = (index: number) => {
		if (index < 0 || index >= segments.length)
			return;
		inputsRef.current[index]?.focus?.();
	};

	const distributeFromIndex = (startIndex: number, rawValue: string) => {
		const digits = normalizeBankDigits(rawValue).replace(/\D/g, "");
		const nextParts = [...parts];

		if (!digits) {
			nextParts[startIndex] = "";
			emit(nextParts);
			return;
		}

		let cursor = 0;
		for (let index = startIndex; index < segments.length; index++) {
			const partLength = segments[index];
			nextParts[index] = digits.slice(cursor, cursor + partLength);
			cursor += partLength;
			if (cursor >= digits.length)
				break;
		}

		const nextValue = nextParts.join("").slice(0, totalLength);
		onChange(nextValue);

		let consumed = digits.length;
		let focusIndex = startIndex;
		while (focusIndex < segments.length - 1 && consumed > segments[focusIndex]) {
			consumed -= segments[focusIndex];
			focusIndex += 1;
		}

		if (digits.length >= segments[startIndex] && focusIndex < segments.length - 1)
			focus(focusIndex + (consumed === segments[focusIndex] ? 1 : 0));
	};

	return (
		<div style={{ direction: "ltr", width: "100%", display: "flex", justifyContent: "flex-start" }}>
			<div
				dir="ltr"
				style={{
					width: "100%",
					display: "flex",
					alignItems: "center",
					justifyContent: "flex-start",
					flexDirection: "row",
					gap: 8,
				}}
			>
				{prefix}
				{segments.map((segmentLength, index) => (
					<React.Fragment key={`${segmentLength}-${index}`}>
						<Input
							ref={(ref) => {
								inputsRef.current[index] = ref;
							}}
							value={parts[index]}
							disabled={disabled}
							inputMode="numeric"
							autoComplete="off"
							maxLength={segmentLength}
							placeholder={"•".repeat(segmentLength)}
							dir="ltr"
							style={{
								width: segmentLength === 2 ? 56 : 84,
								textAlign: "center",
								direction: "ltr",
								fontWeight: 600,
								fontVariantNumeric: "tabular-nums",
							}}
							onChange={(event) => {
								distributeFromIndex(index, event.target.value);
							}}
							onKeyDown={(event) => {
								if (event.key !== "Backspace")
									return;

								if (parts[index])
									return;

								if (index > 0) {
									const nextParts = [...parts];
									nextParts[index - 1] = nextParts[index - 1].slice(0, -1);
									emit(nextParts);
									focus(index - 1);
									event.preventDefault();
								}
							}}
							onPaste={(event) => {
								distributeFromIndex(index, event.clipboardData.getData("text"));
								event.preventDefault();
							}}
							onBlur={onBlur}
						/>
						{showSeparators && index < segments.length - 1
							? (
								<span style={{ color: "var(--ant-colorTextDescription)", userSelect: "none" }}>-</span>
							)
							: null}
					</React.Fragment>
				))}
			</div>
		</div>
	);
}

interface Props {
	disabled: boolean
	defaultValues: BankAccountFormValues
	onSubmit: (values: BankAccountFormValues) => void | Promise<void>
}

export default function BankAccountForm({ disabled, defaultValues, onSubmit }: Props) {
	const methods = useForm<BankAccountFormValues>({
		defaultValues,
		resolver: zodResolver(bankAccountSchema),
		mode: "onBlur",
	});

	const { control, handleSubmit, setValue } = methods;

	return (
		<Form layout="vertical">
			<FormProvider {...methods}>
				<div className="grid grid-cols-2 gap-x-4 mt-4">
					<Controller
						name="card_number"
						control={control}
						render={({ field, fieldState }) => (
							<Form.Item
								label="شماره کارت *"
								help={fieldState.error?.message}
								validateStatus={fieldState.error ? "error" : undefined}
							>
								<SegmentedNumericInput
									value={String(field.value ?? "")}
									onChange={(nextValue) => {
										const nextCardNumber = normalizeCardNumber(nextValue);
										field.onChange(nextCardNumber);
										setValue("bank_name", detectBankNameByCardNumber(nextCardNumber), {
											shouldDirty: true,
											shouldValidate: true,
										});
									}}
									onBlur={field.onBlur}
									disabled={disabled}
									segments={[4, 4, 4, 4]}
									autoFocus
								/>
							</Form.Item>
						)}
					/>

					<Controller
						name="bank_name"
						control={control}
						render={({ field, fieldState }) => (
							<Form.Item
								label="نام بانک *"
								help={fieldState.error?.message}
								validateStatus={fieldState.error ? "error" : undefined}
							>
								<Input
									value={String(field.value ?? "")}
									placeholder="نام بانک"
									disabled
									readOnly
									style={{ textAlign: "right" }}
								/>
							</Form.Item>
						)}
					/>

					<RHFProText
						name="account_holder_name"
						label="نام صاحب حساب *"
						inputProps={{ placeholder: "نام صاحب حساب", disabled }}
					/>
					<RHFProText
						name="account_number"
						label="شماره حساب"
						inputProps={{ placeholder: "شماره حساب", disabled }}
					/>

					<div style={{ gridColumn: "1 / -1" }}>
						<Controller
							name="iban"
							control={control}
							render={({ field, fieldState }) => (
								<Form.Item
									label="شماره شبا"
									help={fieldState.error?.message}
									validateStatus={fieldState.error ? "error" : undefined}
								>
									<SegmentedNumericInput
										value={getIbanDigits(String(field.value ?? ""))}
										onChange={nextValue => field.onChange(normalizeIban(nextValue))}
										onBlur={field.onBlur}
										disabled={disabled}
										segments={[2, 4, 4, 4, 4, 4, 2]}
										showSeparators
										prefix={(
											<Input
												value="IR"
												readOnly
												disabled
												style={{
													width: 56,
													direction: "ltr",
													textAlign: "center",
													fontWeight: 600,
													fontVariantNumeric: "tabular-nums",
												}}
											/>
										)}
									/>
								</Form.Item>
							)}
						/>
					</div>
				</div>

				<div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
					<Button onClick={() => methods.reset(defaultValues)} disabled={disabled}>
						پاکسازی فرم
					</Button>

					<Button type="primary" onClick={handleSubmit(onSubmit)} loading={disabled}>
						ثبت حساب
					</Button>
				</div>
			</FormProvider>
		</Form>
	);
}
