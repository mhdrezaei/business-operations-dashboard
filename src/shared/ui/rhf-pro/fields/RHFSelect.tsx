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
	 * وقتی دقیقاً یک گزینه وجود دارد آن را خودکار انتخاب می‌کند.
	 * - true: مقدار نامعتبر را هم با آن جایگزین می‌کند.
	 * - false: غیرفعال.
	 * - پیش‌فرض (تعریف‌نشده): فقط وقتی مقدار خالی است و فیلد اجباری است (بدون allowClear و بدون حالت multiple/tags)، تا فیلدهای اختیاری خودبه‌خود پر نشوند.
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
	/** فقط مقدار خالی را پر می‌کند و مقدار موجود (حتی نامعتبر) را دست نمی‌زند. */
	onlyWhenEmpty?: boolean
}

const isEmptyValue = (value: unknown) => value == null || value === "";

export function SingleOptionSync({ options, value, onSelect, onlyWhenEmpty = false }: SingleOptionSyncProps) {
	const only = options?.length === 1 ? options[0] : null;
	const isSelected = only != null && String(value ?? "") === String(only.value);
	const blocked = onlyWhenEmpty && !isEmptyValue(value);

	useEffect(() => {
		if (only != null && !isSelected && !blocked)
			onSelect(only.value);
	}, [only?.value, isSelected, blocked]);

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
				const selectProps = props.selectProps as { disabled?: boolean, allowClear?: unknown, mode?: string } | undefined;
				const implicitAutoSelect = props.autoSelectSingle === undefined && !selectProps?.allowClear && !selectProps?.mode;
				const autoSelect = (props.autoSelectSingle === true || implicitAutoSelect) && !selectProps?.disabled;

				return (
					<>
						{autoSelect
							? (
								<SingleOptionSync
									options={options}
									value={field.value}
									onlyWhenEmpty={implicitAutoSelect}
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
								showSearch
								optionFilterProp="label"
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
