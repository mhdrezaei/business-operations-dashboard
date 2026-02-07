import type { UploadProps } from "antd";
import type { FieldValues, Path } from "react-hook-form";
import type { CommonFieldProps } from "../types";
import { ProForm } from "@ant-design/pro-components";
import { Button, Upload } from "antd";
import React from "react";

import { Controller } from "react-hook-form";
import { buildItemStatus, useSmartControl } from "../utils";

export type RHFProUploadButtonProps<TFV extends FieldValues, TName extends Path<TFV>> = CommonFieldProps<TFV, TName> & {
	uploadProps?: Omit<UploadProps, "fileList" | "onChange">
	buttonText?: string
	/**
	 * اگر می‌خوای مقدار ذخیره‌شده در فرم چیزی غیر از fileList باشه
	 * مثلا فقط ids یا urls
	 */
	mapFileListToValue?: (fileList: UploadProps["fileList"]) => unknown
	/**
	 * اگر mapFileListToValue دادی، برای نمایش هم باید map برعکس داشته باشی
	 * (اختیاری) در اکثر سناریوها نیاز نیست و همون fileList ذخیره میشه.
	 */
	mapValueToFileList?: (value: unknown) => UploadProps["fileList"]
};

export function RHFProUploadButton<TFV extends FieldValues, TName extends Path<TFV>>(
	props: RHFProUploadButtonProps<TFV, TName>,
) {
	const control = useSmartControl<TFV>(props.control);

	return (
		<Controller
			name={props.name}
			control={control}
			render={({ field, fieldState }) => {
				const err = props.hideError ? undefined : fieldState.error?.message;
				const status = buildItemStatus(err);

				const fileList = props.mapValueToFileList?.(field.value) ?? ((field.value ?? []) as UploadProps["fileList"]);

				return (
					<ProForm.Item label={props.label} {...props.itemProps} {...status}>
						<Upload
							{...props.uploadProps}
							fileList={fileList}
							onChange={(info) => {
								const nextList = info.fileList;
								if (props.mapFileListToValue) {
									field.onChange(props.mapFileListToValue(nextList));
								}
								else {
									field.onChange(nextList);
								}
							}}
						>
							<Button>{props.buttonText ?? "آپلود"}</Button>
						</Upload>
					</ProForm.Item>
				);
			}}
		/>
	);
}
