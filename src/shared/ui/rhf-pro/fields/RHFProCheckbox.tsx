import type { CheckboxProps } from "antd";
import type { FieldValues, Path } from "react-hook-form";
import type { CommonFieldProps } from "../types";
import { ProForm } from "@ant-design/pro-components";
import { Checkbox } from "antd";
import React from "react";

import { Controller } from "react-hook-form";
import { buildItemStatus, useSmartControl } from "../utils";

export type RHFProCheckboxProps<TFV extends FieldValues, TName extends Path<TFV>> = CommonFieldProps<TFV, TName> & {
	checkboxProps?: Omit<CheckboxProps, "checked" | "onChange">
	/** متن کنار چک‌باکس (اگر label بالا نمی‌خوای) */
	checkboxLabel?: React.ReactNode
};

export function RHFProCheckbox<TFV extends FieldValues, TName extends Path<TFV>>(
	props: RHFProCheckboxProps<TFV, TName>,
) {
	const control = useSmartControl<TFV>(props.control);

	return (
		<Controller
			name={props.name}
			control={control}
			render={({ field, fieldState }) => {
				const err = props.hideError ? undefined : fieldState.error?.message;
				const status = buildItemStatus(err);

				return (
					<ProForm.Item label={props.label} {...props.itemProps} {...status}>
						<Checkbox
							{...props.checkboxProps}
							checked={!!field.value}
							onChange={e => field.onChange(e.target.checked)}
							onBlur={field.onBlur}
							ref={field.ref}
						>
							{props.checkboxLabel}
						</Checkbox>
					</ProForm.Item>
				);
			}}
		/>
	);
}
