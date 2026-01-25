import type { InputProps } from "antd";
import type { FieldValues, Path } from "react-hook-form";
import type { CommonFieldProps } from "../types";
import { ProForm } from "@ant-design/pro-components";
import { Input } from "antd";
import React from "react";

import { Controller } from "react-hook-form";
import { buildItemStatus, useSmartControl } from "../utils";

export type RHFProTextProps<TFV extends FieldValues, TName extends Path<TFV>> = CommonFieldProps<TFV, TName> & {
	inputProps?: Omit<InputProps, "value" | "onChange">
};

export function RHFProText<TFV extends FieldValues, TName extends Path<TFV>>(
	props: RHFProTextProps<TFV, TName>,
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
						<Input
							{...props.inputProps}
							value={field.value ?? ""}
							onChange={e => field.onChange(e.target.value)}
							onBlur={field.onBlur}
							ref={field.ref}

						/>
					</ProForm.Item>
				);
			}}
		/>
	);
}
