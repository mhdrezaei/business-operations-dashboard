import type { SelectProps } from "antd";
import type { FieldValues, Path, PathValue } from "react-hook-form";
import type { CommonFieldProps } from "../types";
import { Form, Select } from "antd";
import React from "react";
import { Controller } from "react-hook-form";
import { useSmartControl } from "../utils";

interface Option {
	label: React.ReactNode
	value: string | number
}

export type RHFSelectProps<
	TFV extends FieldValues,
	TName extends Path<TFV>,
	TValue = PathValue<TFV, TName>,
> = CommonFieldProps<TFV, TName> & {
	options?: Option[]
	loading?: boolean

	/**
	 * props مستقیم Select (value/onChange/options/loading داخل wrapper کنترل می‌شود)
	 */
	selectProps?: Omit<SelectProps<TValue>, "value" | "onChange" | "options" | "loading">

	/**
	 * ✅ هوکِ تغییر مقدار (بعد از set شدن مقدار در RHF)
	 * اگر خواستی trigger/validate یا هر کاری بکنی، اینجا انجام بده
	 */
	onValueChange?: (value: TValue, option: unknown) => void | Promise<void>

	/**
	 * props مستقیم Form.Item
	 */
	formItemProps?: Omit<
		React.ComponentProps<typeof Form.Item>,
		"children" | "help" | "validateStatus"
	>
};

export function RHFSelect<
	TFV extends FieldValues,
	TName extends Path<TFV>,
	TValue = PathValue<TFV, TName>,
>(props: RHFSelectProps<TFV, TName, TValue>) {
	const control = useSmartControl<TFV>(props.control);

	return (
		<Controller
			name={props.name}
			control={control}
			render={({ field, fieldState }) => {
				const err = props.hideError ? undefined : fieldState.error?.message;

				return (
					<Form.Item
						label={props.label}
						help={err}
						validateStatus={err ? "error" : undefined}
						{...props.formItemProps}
					>
						<Select<TValue>
							{...(props.selectProps as any)}
							options={(props.options ?? (props.selectProps as any)?.options) as any}
							loading={props.loading ?? (props.selectProps as any)?.loading}
							value={field.value as TValue}
							onChange={async (v, option) => {
								field.onChange(v);
								await props.onValueChange?.(v as TValue, option);
							}}
							onBlur={field.onBlur}
							ref={field.ref as any}
							status={err ? "error" : undefined}
						/>
					</Form.Item>
				);
			}}
		/>
	);
}
