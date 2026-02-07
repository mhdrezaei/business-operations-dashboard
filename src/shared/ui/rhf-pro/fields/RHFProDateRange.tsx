import type { Dayjs } from "dayjs";
import type { FieldValues, Path } from "react-hook-form";
import type { CommonFieldProps } from "../types";
import { dayjs } from "#src/shared/lib/dayjs-jalali";
import { ProForm } from "@ant-design/pro-components";
import { DatePicker } from "antd-jalali";

import React from "react";
import { Controller } from "react-hook-form";
import { buildItemStatus, useSmartControl } from "../utils";

type ValueType = "string" | "dayjs";
type DayjsRange = [Dayjs | null, Dayjs | null];
type StringRange = [string, string];

export type RHFProDateRangeProps<
	TFV extends FieldValues,
	TName extends Path<TFV>,
> = CommonFieldProps<TFV, TName> & {
	valueType?: ValueType
	dateFormat?: string

	// تایپ صحیح برای antd-jalali
	pickerProps?: Omit<
		React.ComponentProps<(typeof DatePicker)["RangePicker"]>,
    "value" | "onChange"
	>
};

export function RHFProDateRange<
	TFV extends FieldValues,
	TName extends Path<TFV>,
>(props: RHFProDateRangeProps<TFV, TName>) {
	const control = useSmartControl<TFV>(props.control);
	const valueType = props.valueType ?? "string";
	const format = props.dateFormat ?? "YYYY-MM-DD";

	const RangePicker = DatePicker.RangePicker;

	return (
		<Controller
			name={props.name}
			control={control}
			render={({ field, fieldState }) => {
				const err = props.hideError ? undefined : fieldState.error?.message;
				const status = buildItemStatus(err);

				const pickerValue: DayjsRange
					= valueType === "dayjs"
						? ((field.value as DayjsRange) ?? [null, null])
						: Array.isArray(field.value)
							? [
								field.value[0]
									? dayjs(field.value[0]).calendar("jalali")
									: null,
								field.value[1]
									? dayjs(field.value[1]).calendar("jalali")
									: null,
							]
							: [null, null];

				const handleChange = (v: DayjsRange | null) => {
					const next: DayjsRange = v ?? [null, null];

					if (valueType === "dayjs") {
						// اگر خواستی داخل فرم dayjs نگه داری (شمسی)
						field.onChange(next);
						return;
					}

					// ذخیره برای backend به میلادی
					const str: StringRange = [
						next[0] ? next[0].calendar("gregory").format(format) : "",
						next[1] ? next[1].calendar("gregory").format(format) : "",
					];

					field.onChange(str);
				};

				return (
					<ProForm.Item label={props.label} {...props.itemProps} {...status}>
						<RangePicker
							{...props.pickerProps}
							value={pickerValue as any}
							onChange={(v: DayjsRange | null) => handleChange(v)}
							onBlur={field.onBlur}
						/>
					</ProForm.Item>
				);
			}}
		/>
	);
}
