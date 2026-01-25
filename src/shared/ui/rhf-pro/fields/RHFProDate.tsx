import type { Dayjs } from "#src/shared/lib/dayjs-jalali";
import type { FieldValues, Path } from "react-hook-form";
import type { CommonFieldProps } from "../types";
import { dayjs } from "#src/shared/lib/dayjs-jalali";
import { ProForm } from "@ant-design/pro-components";
import { DatePicker } from "antd-jalali";

import React from "react";
import { Controller } from "react-hook-form";
import { buildItemStatus, useSmartControl } from "../utils";

type ValueType = "string" | "dayjs";

export type RHFProDateProps<
	TFV extends FieldValues,
	TName extends Path<TFV>,
> = CommonFieldProps<TFV, TName> & {
	valueType?: ValueType
	dateFormat?: string

	// نکته: props را از خود antd-jalali بگیر
	pickerProps?: Omit<
		React.ComponentProps<typeof DatePicker>,
    "value" | "onChange"
	>

	toPickerValue?: (value: unknown) => Dayjs | null
	fromPickerValue?: (value: Dayjs | null) => unknown
};

export function RHFProDate<TFV extends FieldValues, TName extends Path<TFV>>(
	props: RHFProDateProps<TFV, TName>,
) {
	const control = useSmartControl<TFV>(props.control);

	const valueType = props.valueType ?? "string";
	const format = props.dateFormat ?? "YYYY-MM-DD";

	return (
		<Controller
			name={props.name}
			control={control}
			render={({ field, fieldState }) => {
				const err = props.hideError ? undefined : fieldState.error?.message;
				const status = buildItemStatus(err);

				// value داخل فرم: معمولاً Gregorian string
				// برای نمایش شمسی باید به jalali calendar تبدیل شود
				const pickerValue: Dayjs | null = props.toPickerValue
					? props.toPickerValue(field.value)
					: valueType === "dayjs"
						? ((field.value as Dayjs | null) ?? null)
						: typeof field.value === "string" && field.value
							? dayjs(field.value).calendar("jalali")
							: null;

				const handleChange = (v: Dayjs | null) => {
					if (props.fromPickerValue) {
						field.onChange(props.fromPickerValue(v));
						return;
					}

					if (valueType === "dayjs") {
						// اگر تصمیم گرفتی داخل فرم dayjs نگه داری، همین v (jalali) رو ذخیره می‌کنی
						field.onChange(v);
					}
					else {
						// ذخیره برای backend به میلادی
						field.onChange(v ? v.calendar("gregory").format(format) : "");
					}
				};

				return (
					<ProForm.Item label={props.label} {...props.itemProps} {...status}>
						<DatePicker
							{...props.pickerProps}
							value={pickerValue as any}
							onChange={(v: Dayjs | null) => handleChange(v)}
							onBlur={field.onBlur}
						/>
					</ProForm.Item>
				);
			}}
		/>
	);
}
