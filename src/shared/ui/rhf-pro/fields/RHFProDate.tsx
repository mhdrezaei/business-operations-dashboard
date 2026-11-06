import type { Dayjs } from "#src/shared/lib/dayjs-jalali";
import type { FieldValues, Path } from "react-hook-form";
import type { CommonFieldProps } from "../types";
import { dayjs } from "#src/shared/lib/dayjs-jalali";
import { gregorianIsoToJalaliParts, jalaliPartsToGregorianIso } from "#src/shared/lib/jalali-intl";
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
					// تبدیل رشته‌ی میلادی ذخیره‌شده به Dayjs شمسی
					const parts = gregorianIsoToJalaliParts(fieldValue);
					if (parts) {
						pickerValue = dayjs(`${parts.year}-${parts.month}-${parts.day}`, { jalali: true } as never);
					}
				}

				const handleChange = (value: Dayjs | null) => {
					if (valueType === "dayjs") {
						field.onChange(value);
						return;
					}

					// تبدیل Dayjs شمسی به رشته‌ی میلادی ISO
					// (year/month/date خود picker خوانده می‌شود؛ toDate() در jalaliday ساعت تهران را نادرست می‌گیرد)
					const gregorianString = value?.isValid()
						? jalaliPartsToGregorianIso({ year: value.year(), month: value.month() + 1, day: value.date() })
						: null;
					field.onChange(gregorianString ?? "");
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
