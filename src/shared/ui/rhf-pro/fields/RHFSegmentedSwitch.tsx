import type { SegmentedProps } from "antd";
import type { FieldValues, Path } from "react-hook-form";
import type { CommonFieldProps } from "../types";
import { ConfigProvider, Form, Segmented, theme } from "antd";
import clsx from "clsx";
import React from "react";
import { Controller } from "react-hook-form";
import { useSmartControl } from "../utils";
import "./RHFSegmentedSwitch.css";

type SegmentedValue = string | number;

export type RHFSegmentedSwitchProps<
	TFV extends FieldValues,
	TName extends Path<TFV>,
	TValue extends SegmentedValue = SegmentedValue,
> = CommonFieldProps<TFV, TName> & {
	options: SegmentedProps<TValue>["options"]
	segmentedProps?: Omit<SegmentedProps<TValue>, "options" | "value" | "onChange">
	formItemProps?: Omit<
		React.ComponentProps<typeof Form.Item>,
		"children" | "help" | "label" | "validateStatus"
	>
	onValueChange?: (value: TValue) => void | Promise<void>
};

type SegmentedSwitchCssVariables = React.CSSProperties & {
	"--rhf-segmented-border-color": string
	"--rhf-segmented-border-radius": string
	"--rhf-segmented-disabled-text-color": string
	"--rhf-segmented-hover-color": string
	"--rhf-segmented-selected-color": string
	"--rhf-segmented-selected-hover-color": string
	"--rhf-segmented-selected-text-color": string
	"--rhf-segmented-text-color": string
};

export function RHFSegmentedSwitch<
	TFV extends FieldValues,
	TName extends Path<TFV>,
	TValue extends SegmentedValue = SegmentedValue,
>(props: RHFSegmentedSwitchProps<TFV, TName, TValue>) {
	const control = useSmartControl<TFV>(props.control);
	const antdContext = React.useContext(ConfigProvider.ConfigContext);
	const { token } = theme.useToken();
	const cardBorderColor = antdContext.theme?.components?.Card?.colorBorderSecondary;

	return (
		<Controller
			name={props.name}
			control={control}
			render={({ field, fieldState, formState }) => {
				const shouldShowError = formState.isSubmitted || fieldState.isTouched;
				const error = props.hideError || !shouldShowError ? undefined : fieldState.error?.message;
				const switchStyle: SegmentedSwitchCssVariables = {
					...props.segmentedProps?.style,
					"--rhf-segmented-border-color": error
						? token.colorError
						: typeof cardBorderColor === "string"
							? cardBorderColor
							: token.colorPrimaryBorder,
					"--rhf-segmented-border-radius": `${token.borderRadius}px`,
					"--rhf-segmented-disabled-text-color": token.colorTextDisabled,
					"--rhf-segmented-hover-color": token.colorPrimaryBg,
					"--rhf-segmented-selected-color": token.colorPrimary,
					"--rhf-segmented-selected-hover-color": token.colorPrimaryHover,
					"--rhf-segmented-selected-text-color": token.colorTextLightSolid,
					"--rhf-segmented-text-color": token.colorTextSecondary,
				};

				return (
					<Form.Item
						label={props.label}
						help={error}
						validateStatus={error ? "error" : undefined}
						{...props.formItemProps}
					>
						<Segmented<TValue>
							{...props.segmentedProps}
							block={props.segmentedProps?.block ?? true}
							options={props.options}
							value={(field.value ?? undefined) as TValue | undefined}
							onChange={async (value) => {
								field.onChange(value);
								await props.onValueChange?.(value);
							}}
							onBlur={field.onBlur}
							ref={field.ref}
							aria-invalid={Boolean(error)}
							className={clsx("rhf-segmented-switch", props.segmentedProps?.className)}
							style={switchStyle}
						/>
					</Form.Item>
				);
			}}
		/>
	);
}
