import type { UploadProps } from "antd";
import type { FieldValues, Path } from "react-hook-form";
import type { CommonFieldProps } from "../types";
import { InboxOutlined } from "@ant-design/icons";
import { Button, Form, theme, Upload } from "antd";
import React from "react";

import { Controller } from "react-hook-form";
import { buildItemStatus, useSmartControl } from "../utils";

export type RHFProUploadButtonProps<TFV extends FieldValues, TName extends Path<TFV>> = CommonFieldProps<TFV, TName> & {
	uploadProps?: Omit<UploadProps, "fileList" | "onChange">
	buttonText?: string
	variant?: "button" | "dragger"
	draggerTitle?: React.ReactNode
	draggerHint?: React.ReactNode
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
	const { token } = theme.useToken();

	return (
		<Controller
			name={props.name}
			control={control}
			render={({ field, fieldState }) => {
				const err = props.hideError ? undefined : fieldState.error?.message;
				const status = buildItemStatus(err);

				const fileList = props.mapValueToFileList?.(field.value) ?? ((field.value ?? []) as UploadProps["fileList"]);
				const handleChange: NonNullable<UploadProps["onChange"]> = (info) => {
					const nextList = info.fileList;
					if (props.mapFileListToValue) {
						field.onChange(props.mapFileListToValue(nextList));
					}
					else {
						field.onChange(nextList);
					}
				};

				return (
					<Form.Item label={props.label} {...props.itemProps} {...status}>
						{props.variant === "dragger"
							? (
								<Upload.Dragger
									{...props.uploadProps}
									fileList={fileList}
									onChange={handleChange}
								>
									<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: token.marginXS }}>
										<InboxOutlined style={{ color: token.colorPrimary, fontSize: token.fontSizeHeading1 }} />
										<div style={{ color: token.colorPrimary, fontWeight: token.fontWeightStrong }}>
											{props.draggerTitle ?? "فایل‌ها را بکشید یا برای انتخاب کلیک کنید"}
										</div>
										{props.draggerHint
											? <div style={{ color: token.colorTextTertiary }}>{props.draggerHint}</div>
											: null}
									</div>
								</Upload.Dragger>
							)
							: (
								<Upload
									{...props.uploadProps}
									fileList={fileList}
									onChange={handleChange}
								>
									<Button>{props.buttonText ?? "آپلود"}</Button>
								</Upload>
							)}
					</Form.Item>
				);
			}}
		/>
	);
}
