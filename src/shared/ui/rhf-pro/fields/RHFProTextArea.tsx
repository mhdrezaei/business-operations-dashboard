import type { FieldValues, Path } from "react-hook-form";
import type { CommonFieldProps } from "../types";
import { Form, Input } from "antd";
import React from "react";

import { Controller } from "react-hook-form";
import { useSmartControl } from "../utils";

type AntTextAreaProps = React.ComponentProps<typeof Input.TextArea>;

export type RHFProTextAreaProps<
	TFV extends FieldValues,
	TName extends Path<TFV>,
> = CommonFieldProps<TFV, TName> & {
	/** اسم استاندارد */
	textAreaProps?: Omit<AntTextAreaProps, "value" | "onChange">

	/** ✅ alias برای اینکه کدهای قبلی خطا ندهند */
	textareaProps?: Omit<AntTextAreaProps, "value" | "onChange">

	/** props مستقیم Form.Item */
	formItemProps?: Omit<React.ComponentProps<typeof Form.Item>, "children" | "help" | "validateStatus">
};

export function RHFProTextArea<TFV extends FieldValues, TName extends Path<TFV>>(
	props: RHFProTextAreaProps<TFV, TName>,
) {
	const control = useSmartControl<TFV>(props.control);

	// ✅ اگر textareaProps داده شد هم قبول کن
	const mergedTextAreaProps = (props.textAreaProps ?? props.textareaProps) as AntTextAreaProps | undefined;

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
						<Input.TextArea
							{...(mergedTextAreaProps as any)}
							value={(field.value ?? "") as any}
							onChange={e => field.onChange(e.target.value)}
							onBlur={field.onBlur}
							ref={field.ref}
							status={err ? "error" : undefined}
						/>
					</Form.Item>
				);
			}}
		/>
	);
}
