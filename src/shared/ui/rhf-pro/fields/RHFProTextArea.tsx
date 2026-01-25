import type { FieldValues, Path } from "react-hook-form";
import type { CommonFieldProps } from "../types";
import { ProForm } from "@ant-design/pro-components";
import { Input } from "antd";
import React from "react";

import { Controller } from "react-hook-form";
import { buildItemStatus, useSmartControl } from "../utils";

type AntTextAreaProps = React.ComponentProps<typeof Input.TextArea>;

export type RHFProTextAreaProps<TFV extends FieldValues, TName extends Path<TFV>> = CommonFieldProps<TFV, TName> & {
	textAreaProps?: Omit<AntTextAreaProps, "value" | "onChange">
};

export function RHFProTextArea<TFV extends FieldValues, TName extends Path<TFV>>(
	props: RHFProTextAreaProps<TFV, TName>,
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
						<Input.TextArea
							{...props.textAreaProps}
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
