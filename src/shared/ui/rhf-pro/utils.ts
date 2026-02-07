import type { Control, FieldValues } from "react-hook-form";
import { useFormContext } from "react-hook-form";

export function useSmartControl<TFV extends FieldValues>(
	control?: Control<TFV>,
): Control<TFV> {
	const ctx = useFormContext<TFV>();
	return (control ?? ctx.control) as Control<TFV>;
}

export function buildItemStatus(err?: string) {
	if (!err)
		return {};
	return {
		validateStatus: "error" as const,
		help: err,
	};
}
