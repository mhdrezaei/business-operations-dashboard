import type { InputProps } from "antd";
import type { FieldValues, Path } from "react-hook-form";
import type { CommonFieldProps } from "../types";
import { usePreferences } from "#src/hooks";
import {
	formatWithGrouping,
	numberToWordsByLanguage,
	sanitizeNumericInput,
	stripGroupingSeparators,
} from "#src/utils";

import { Form, Input, Tooltip } from "antd";
import React from "react";
import { Controller } from "react-hook-form";
import { useSmartControl } from "../utils";

export type RHFProTextProps<
	TFV extends FieldValues,
	TName extends Path<TFV>,
> = CommonFieldProps<TFV, TName> & {
	inputProps?: Omit<InputProps, "value" | "onChange">
	formItemProps?: Omit<
		React.ComponentProps<typeof Form.Item>,
		"children" | "help" | "validateStatus"
	>

	/** پیش‌فرض true وقتی inputMode="numeric" */
	enableNumericGuard?: boolean

	/** جداکننده هزارگان (کاما) - فقط وقتی numericGuard فعال باشد معنی دارد */
	enableGrouping?: boolean
};

export function RHFProText<
	TFV extends FieldValues,
	TName extends Path<TFV>,
>(props: RHFProTextProps<TFV, TName>) {
	const control = useSmartControl<TFV>(props.control);
	const { language } = usePreferences();

	return (
		<Controller
			name={props.name}
			control={control}
			render={({ field, fieldState }) => {
				const err = props.hideError ? undefined : fieldState.error?.message;

				const rawValue = (field.value ?? "") as string;
				const inputMode = props.inputProps?.inputMode;

				const numericGuardEnabled
					= (props.enableNumericGuard ?? true) && inputMode === "numeric";
				const groupingEnabled = numericGuardEnabled && !!props.enableGrouping;

				const displayValue = groupingEnabled
					? formatWithGrouping(rawValue, language)
					: rawValue;

				const words = numericGuardEnabled
					? numberToWordsByLanguage(stripGroupingSeparators(rawValue), language)
					: "";

				const tooltipTitle = words || undefined;

				return (
					<Form.Item
						label={props.label}
						help={err}
						validateStatus={err ? "error" : undefined}
						{...props.formItemProps}
					>
						<Tooltip
							title={tooltipTitle}
							open={tooltipTitle ? undefined : false}
							placement="top"
						>
							<Input
								{...(props.inputProps as any)}
								value={displayValue}
								onChange={(e) => {
									const next = e.target.value;

									if (!numericGuardEnabled) {
										field.onChange(next);
										return;
									}

									const cleaned = sanitizeNumericInput(next);

									field.onChange(
										groupingEnabled
											? stripGroupingSeparators(cleaned)
											: cleaned,
									);
								}}
								onBeforeInput={(e) => {
									if (!numericGuardEnabled)
										return;

									const data = (e as any).data as string | undefined;
									if (!data)
										return;

									const cleaned = sanitizeNumericInput(data);
									if (cleaned !== data)
										e.preventDefault();
								}}
								onPaste={(e) => {
									if (!numericGuardEnabled)
										return;

									e.preventDefault();
									const text = e.clipboardData.getData("text") ?? "";
									const cleaned = sanitizeNumericInput(text);

									const nextChunk = groupingEnabled
										? stripGroupingSeparators(cleaned)
										: cleaned;

									const target = e.currentTarget;
									const start = target.selectionStart ?? target.value.length;
									const end = target.selectionEnd ?? target.value.length;

									const merged = target.value.slice(0, start) + nextChunk + target.value.slice(end);

									field.onChange(
										groupingEnabled
											? stripGroupingSeparators(merged)
											: merged,
									);
								}}
								onBlur={field.onBlur}
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
