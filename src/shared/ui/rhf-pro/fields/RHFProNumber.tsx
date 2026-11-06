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

function isSafeNumber(n: number | null): boolean {
	return n === null || Math.abs(n) <= Number.MAX_SAFE_INTEGER;
}

/** Groups only the integer part, keeping a trailing "." / fraction digits as typed. */
function formatDecimalWithGrouping(raw: string, language: Parameters<typeof formatWithGrouping>[1]) {
	const [intPart, ...rest] = raw.split(".");
	const grouped = formatWithGrouping(intPart, language);
	return rest.length ? `${grouped}.${rest.join("")}` : grouped;
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

				const decimalRaw = localRaw !== null ? localRaw : (field.value == null ? "" : String(field.value));
				const displayValue = props.decimal
					? (groupingEnabled ? formatDecimalWithGrouping(decimalRaw, language) : decimalRaw)
					: (localRaw === "-" ? "-" : (groupingEnabled ? formatWithGrouping(raw, language) : raw));

				const words = props.enableWordsTooltip
					? numberToWordsByLanguage(stripGroupingSeparators(raw).split(".")[0], language)
					: "";

				const showTooltip = focused && !!words;

				const commit = (text: string) => {
					const plain = stripGroupingSeparators(props.decimal ? sanitizeDecimalInput(text) : sanitizeNumericInput(text));
					const next = props.decimal ? toDecimalOrNull(plain) : toNumberOrNull(plain);
					if (!isSafeNumber(next))
						return;
					// keep an in-progress "-" / "1." visible instead of clearing the value
					setLocalRaw(props.decimal || plain === "-" ? plain : null);
					field.onChange(next);
				};

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
								aria-label={typeof props.label === "string" ? props.label : undefined}
								{...(props.inputProps as any)}
								inputMode={props.decimal ? "decimal" : "numeric"}
								value={displayValue}
								onFocus={() => setFocused(true)}
								onBlur={() => {
									setLocalRaw(null);
									setFocused(false);
									field.onBlur();
								}}
								onChange={e => commit(e.target.value)}
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
									commit(e.clipboardData.getData("text") ?? "");
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
