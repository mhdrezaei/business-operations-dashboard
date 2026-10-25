// src/shared/ui/rhf-pro/fields/RHFSelect.tsx
import type { SelectProps } from "antd";
import type { FieldValues, Path, PathValue } from "react-hook-form";
import type { CommonFieldProps } from "../types";
import { Form, Select } from "antd";
import React, { useEffect } from "react";
import { Controller } from "react-hook-form";
import { useSmartControl } from "../utils";

interface Option {
	label: React.ReactNode
	value: string | number
}

export type RHFSelectProps<
	TFV extends FieldValues,
	TName extends Path<TFV>,
	TValue = PathValue<TFV, TName>,
> = CommonFieldProps<TFV, TName> & {
	options?: Option[]
	loading?: boolean

	/**
	 * props مستقیم Select (value/onChange/options/loading داخل wrapper کنترل می‌شود)
	 */
	selectProps?: Omit<SelectProps<TValue>, "value" | "onChange" | "options" | "loading">

	/**
	 * ✅ هوکِ تغییر مقدار (بعد از set شدن مقدار در RHF)
	 * اگر خواستی trigger/validate یا هر کاری بکنی، اینجا انجام بده
	 */
	onValueChange?: (value: TValue, option: unknown) => void | Promise<void>

	/**
	 * وقتی دقیقاً یک گزینه وجود دارد آن را خودکار انتخاب می‌کند (و مقدار نامعتبر را با آن جایگزین می‌کند)
	 */
	autoSelectSingle?: boolean

	/**
	 * props مستقیم Form.Item
	 */
	formItemProps?: Omit<
		React.ComponentProps<typeof Form.Item>,
		"children" | "help" | "validateStatus"
	>
};

interface SingleOptionSyncProps {
	options: Option[] | undefined
	value: unknown
	onSelect: (value: string | number) => void
}

export function SingleOptionSync({ options, value, onSelect }: SingleOptionSyncProps) {
	const only = options?.length === 1 ? options[0] : null;
	const isSelected = only != null && String(value ?? "") === String(only.value);

	useEffect(() => {
		if (only != null && !isSelected)
			onSelect(only.value);
	}, [only?.value, isSelected]);

	return null;
}

export function RHFSelect<
	TFV extends FieldValues,
	TName extends Path<TFV>,
	TValue = PathValue<TFV, TName>,
>(props: RHFSelectProps<TFV, TName, TValue>) {
	const control = useSmartControl<TFV>(props.control);

	return (
		<Controller
			name={props.name}
			control={control}
			render={({ field, fieldState, formState }) => {
				const shouldShowError = formState.isSubmitted || fieldState.isTouched;
				const err = (props.hideError || !shouldShowError) ? undefined : fieldState.error?.message;

				const options = (props.options ?? (props.selectProps as any)?.options) as Option[] | undefined;

				return (
					<>
						{props.autoSelectSingle && !(props.selectProps as { disabled?: boolean } | undefined)?.disabled
							? (
								<SingleOptionSync
									options={options}
									value={field.value}
									onSelect={(v) => {
										field.onChange(v);
										void props.onValueChange?.(v as TValue, options?.[0]);
									}}
								/>
							)
							: null}
						<Form.Item
							label={props.label}
							help={err}
							validateStatus={err ? "error" : undefined}
							{...props.formItemProps}
						>
							<Select<TValue>
								{...(props.selectProps as any)}
								options={options as any}
								loading={props.loading ?? (props.selectProps as any)?.loading}
								value={field.value as TValue}
								onChange={async (v, option) => {
									field.onChange(v);
									await props.onValueChange?.(v as TValue, option);
								}}
								onBlur={field.onBlur}
								ref={field.ref as any}
								status={err ? "error" : undefined}
							/>
						</Form.Item>
					</>
				);
			}}
		/>
	);
}
