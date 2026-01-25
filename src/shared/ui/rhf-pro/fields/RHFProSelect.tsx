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
	 * props مستقیم Form.Item (اختیاری)
	 * اگر خواستی colon, tooltip, extra, required, labelCol, wrapperCol...
	 */
	formItemProps?: Omit<React.ComponentProps<typeof Form.Item>, "children" | "help" | "validateStatus">
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
						// ✅ پیام خطا دقیقاً زیر فیلد
						help={err}
						// ✅ حالت قرمز (Form.Item)
						validateStatus={err ? "error" : undefined}
						// ✅ اگر required می‌خواهی، از formItemProps بده
						{...props.formItemProps}
					>
						<Select<TValue>
							{...(props.selectProps as any)}
							options={(props.options ?? (props.selectProps as any)?.options) as any}
							loading={props.loading ?? (props.selectProps as any)?.loading}
							value={field.value as TValue}
							onChange={v => field.onChange(v)}
							onBlur={field.onBlur}
							ref={field.ref as any}
							// ✅ حالت قرمز روی کنترل (antd v5)
							status={err ? "error" : undefined}
						/>
					</Form.Item>
				);
			}}
		/>
	);
}
