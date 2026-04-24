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
};

// تبدیل رشته میلادی "YYYY-MM-DD" به شیء Date در منطقه زمانی محلی
function parseLocalGregorian(dateStr: string): Date | null {
	if (!dateStr)
		return null;
	const parts = dateStr.split("-");
	if (parts.length !== 3)
		return null;
	const year = Number.parseInt(parts[0], 10);
	const month = Number.parseInt(parts[1], 10) - 1; // months 0-index
	const day = Number.parseInt(parts[2], 10);
	const date = new Date(year, month, day);
	// اعتبارسنجی
	if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
		return date;
	}
	return null;
}

// تبدیل شیء Date به رشته میلادی "YYYY-MM-DD" در منطقه زمانی محلی
function formatLocalGregorian(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function RHFProDate<TFV extends FieldValues, TName extends Path<TFV>>(
	props: RHFProDateProps<TFV, TName>,
) {
	const control = useSmartControl<TFV>(props.control);

	const valueType = props.valueType ?? "string";

	return (
		<Controller
			name={props.name}
			control={control}
			render={({ field, fieldState }) => {
				const err = props.hideError ? undefined : fieldState.error?.message;
				const status = buildItemStatus(err);

				// مقدار dayjs برای نمایش در DatePicker (شمسی)
				let pickerValue: Dayjs | null = null;
				const fieldValue = field.value;

				if (valueType === "dayjs" && fieldValue) {
					pickerValue = fieldValue as Dayjs;
				}
				else if (typeof fieldValue === "string" && fieldValue) {
					// تبدیل رشته میلادی ذخیره‌شده به شیء Date محلی و سپس به Dayjs شمسی
					const localDate = parseLocalGregorian(fieldValue);
					if (localDate) {
						pickerValue = dayjs(localDate);
					}
				}

				const handleChange = (value: Dayjs | null) => {
					if (valueType === "dayjs") {
						field.onChange(value);
						return;
					}

					// تبدیل Dayjs شمسی به رشته میلادی محلی
					if (value && typeof value.toDate === "function") {
						const gregorianDate = value.toDate(); // تبدیل شمسی → میلادی (شیء Date محلی)
						const gregorianString = formatLocalGregorian(gregorianDate);
						field.onChange(gregorianString);
					}
					else {
						field.onChange("");
					}
				};

				return (
					<ProForm.Item label={props.label} {...props.itemProps} {...status}>
						<DatePicker
							className="w-full"
							getPopupContainer={(trigger: { parentElement: any }) => trigger.parentElement!}
							{...props.pickerProps}
							value={pickerValue}
							onChange={handleChange}
							onBlur={field.onBlur}
						/>
					</ProForm.Item>
				);
			}}
		/>
	);
}
