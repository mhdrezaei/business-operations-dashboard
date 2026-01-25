import type { ProFormItemProps } from "@ant-design/pro-components";
import type { Control, FieldValues, Path } from "react-hook-form";

export interface CommonFieldProps<TFV extends FieldValues, TName extends Path<TFV>> {
	name: TName
	label?: React.ReactNode
	control?: Control<TFV>
	itemProps?: Omit<ProFormItemProps, "name" | "label">
	hideError?: boolean
}
