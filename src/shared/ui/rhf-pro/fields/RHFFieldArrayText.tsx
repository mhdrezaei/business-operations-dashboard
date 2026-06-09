import { Button, Form, Input } from "antd";
import React from "react";
import { useController, useFormContext } from "react-hook-form";

interface Props {
	name: string
	label: string
	disabled?: boolean
}

function getErrorMessage(error: unknown): string | undefined {
	if (!error)
		return undefined;
	if (typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string")
		return (error as { message: string }).message;
	if (Array.isArray(error)) {
		const itemError = error.find(Boolean);
		return getErrorMessage(itemError);
	}
	return undefined;
}

export default function RHFFieldArrayText({ name, label, disabled }: Props) {
	const { control, formState } = useFormContext();
	const { field } = useController({ control, name });
	const values = Array.isArray(field.value) ? field.value : [];

	const error = (formState.errors as any)?.[name];
	const errorMessage = getErrorMessage(error);

	function updateValues(nextValues: string[]) {
		field.onChange(nextValues);
	}

	return (
		<Form.Item label={label} validateStatus={errorMessage ? "error" : ""} help={errorMessage}>
			{values.map((value, idx) => (
				<div key={`${name}-${idx}`} className="flex gap-2 mb-2">
					<Input
						disabled={disabled}
						value={value}
						onBlur={field.onBlur}
						onChange={event => updateValues(values.map((item, itemIdx) => itemIdx === idx ? event.target.value : item))}
					/>
					<Button danger type="text" disabled={disabled} onClick={() => updateValues(values.filter((_, itemIdx) => itemIdx !== idx))}>
						حذف
					</Button>
				</div>
			))}
			<Button type="dashed" block disabled={disabled} onClick={() => updateValues([...values, ""])}>
				افزودن مقدار
			</Button>
		</Form.Item>
	);
}
