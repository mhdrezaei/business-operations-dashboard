import type { SliderSingleProps } from "antd";
import type { FieldValues, Path } from "react-hook-form";
import type { CommonFieldProps } from "../types";
import { ProForm } from "@ant-design/pro-components";
import { Slider } from "antd";
import React from "react";

import { Controller } from "react-hook-form";
import { buildItemStatus, useSmartControl } from "../utils";

export type RHFProSliderProps<TFV extends FieldValues, TName extends Path<TFV>> = CommonFieldProps<TFV, TName> & {
	sliderProps?: Omit<SliderSingleProps, "value" | "onChange">
};

export function RHFProSlider<TFV extends FieldValues, TName extends Path<TFV>>(
	props: RHFProSliderProps<TFV, TName>,
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
						<Slider
							{...props.sliderProps}
							value={typeof field.value === "number" ? field.value : 0}
							onChange={v => field.onChange(v)}
							onBlur={field.onBlur}
						/>
					</ProForm.Item>
				);
			}}
		/>
	);
}
