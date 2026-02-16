import { Button, Form, Input } from "antd";
import React from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

interface Props {
	name: string // مثلا "phone"
	label: string // مثلا "تلفن"
	disabled?: boolean
}

export default function RHFFieldArrayText({ name, label, disabled }: Props) {
	const { control, register, formState } = useFormContext();
	const { fields, append, remove } = useFieldArray({ control, name });

	const error = (formState.errors as any)?.[name];

	return (
		<Form.Item label={label} validateStatus={error ? "error" : ""} help={error?.message}>
			{fields.map((f, idx) => (
				<div key={f.id} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
					<Input disabled={disabled} {...register(`${name}.${idx}` as const)} />
					<Button danger type="text" disabled={disabled} onClick={() => remove(idx)}>
						حذف
					</Button>
				</div>
			))}
			<Button type="dashed" block disabled={disabled} onClick={() => append("")}>
				افزودن مقدار
			</Button>
		</Form.Item>
	);
}
