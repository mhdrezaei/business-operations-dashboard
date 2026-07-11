import type { InputProps } from "antd";
import type { FieldValues, Path } from "react-hook-form";
import type { CommonFieldProps } from "../types";
import { usePreferences } from "#src/hooks";
import {
	formatNumeric,
	formatWithGrouping,
	numberToWordsByLanguage,
	sanitizeDecimalInput,
	sanitizeNumericInput,
	stripGroupingSeparators,
} from "#src/utils";

import { Form, Input, Tooltip } from "antd";
import React, { useState } from "react";
import { Controller } from "react-hook-form";
import { useSmartControl } from "../utils";

export type RHFProNumberProps<
	TFV extends FieldValues,
	TName extends Path<TFV>,
> = CommonFieldProps<TFV, TName> & {
	inputProps?: Omit<InputProps, "value" | "onChange" | "inputMode">
	formItemProps?: Omit<
		React.ComponentProps<typeof Form.Item>,
		"children" | "help" | "validateStatus"
	>

	enableGrouping?: boolean
	enableWordsTooltip?: boolean
	decimal?: boolean
};

function toNumberOrNull(raw: string): number | null {
	const plain = stripGroupingSeparators(raw).trim();
	if (!plain)
		return null;
	if (!/^-?\d+$/.test(plain))
		return null;
	const n = Number(plain);
	return Number.isFinite(n) ? n : null;
}

function toDecimalOrNull(raw: string): number | null {
	const plain = raw.trim();
	if (!plain || plain === "." || plain === "-" || plain === "-.")
		return null;
	if (!/^-?\d*(?:\.\d*)?$/.test(plain))
		return null;
	const n = Number(plain);
	return Number.isFinite(n) ? n : null;
}

export function RHFProNumber<
	TFV extends FieldValues,
	TName extends Path<TFV>,
>(props: RHFProNumberProps<TFV, TName>) {
	const control = useSmartControl<TFV>(props.control);
	const { language } = usePreferences();

	const [focused, setFocused] = useState(false);
	const [localRaw, setLocalRaw] = useState<string | null>(null);

	return (
		<Controller
			name={props.name}
			control={control}
			render={({ field, fieldState, formState }) => {
				const shouldShowError = formState.isSubmitted || fieldState.isTouched;
				const err = (props.hideError || !shouldShowError) ? undefined : fieldState.error?.message;

				const raw = field.value == null ? "" : String(formatNumeric(field.value));
				const groupingEnabled = !!props.enableGrouping;

				const displayValue = props.decimal
					? (localRaw !== null ? localRaw : (field.value == null ? "" : String(field.value)))
					: (groupingEnabled ? formatWithGrouping(raw, language) : raw);

				const words = props.enableWordsTooltip
					? numberToWordsByLanguage(stripGroupingSeparators(raw), language)
					: "";

				const showTooltip = focused && !!words;

				return (
					<Form.Item
						label={props.label}
						help={err}
						validateStatus={err ? "error" : undefined}
						{...props.formItemProps}
					>
						<Tooltip
							title={words}
							open={showTooltip}
							placement="top"
						>
							<Input
								{...(props.inputProps as any)}
								inputMode={props.decimal ? "decimal" : "numeric"}
								value={displayValue}
								onFocus={() => setFocused(true)}
								onBlur={() => {
									if (props.decimal)
										setLocalRaw(null);
									setFocused(false);
									field.onBlur();
								}}
								onChange={(e) => {
									if (props.decimal) {
										const cleaned = sanitizeDecimalInput(e.target.value);
										setLocalRaw(cleaned);
										field.onChange(toDecimalOrNull(cleaned));
									}
									else {
										const cleaned = sanitizeNumericInput(e.target.value);
										const plain = groupingEnabled
											? stripGroupingSeparators(cleaned)
											: cleaned;
										field.onChange(toNumberOrNull(plain));
									}
								}}
								onBeforeInput={(e) => {
									const data = (e as any).data as string | undefined;
									if (!data)
										return;
									if (props.decimal) {
										if (sanitizeDecimalInput(data) !== data) {
											e.preventDefault();
											return;
										}
										if (data === "." && (localRaw ?? "").includes(".")) {
											e.preventDefault();
										}
									}
									else {
										if (sanitizeNumericInput(data) !== data) {
											e.preventDefault();
										}
									}
								}}
								onPaste={(e) => {
									e.preventDefault();
									const text = e.clipboardData.getData("text") ?? "";
									if (props.decimal) {
										const cleaned = sanitizeDecimalInput(text);
										setLocalRaw(cleaned);
										field.onChange(toDecimalOrNull(cleaned));
									}
									else {
										const cleaned = sanitizeNumericInput(text);
										const plain = groupingEnabled
											? stripGroupingSeparators(cleaned)
											: cleaned;
										field.onChange(toNumberOrNull(plain));
									}
								}}
								ref={field.ref}
								status={err ? "error" : undefined}
								autoComplete="off"
							/>
						</Tooltip>
					</Form.Item>
				);
			}}
		/>
	);
}
