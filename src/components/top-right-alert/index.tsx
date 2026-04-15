import type { ReactNode } from "react";
import { notification } from "#src/utils";
import { useEffect } from "react";

interface Props {
	alertKey: string
	type?: "success" | "info" | "warning" | "error"
	message: ReactNode
	description?: ReactNode
	open?: boolean
	duration?: number
}

export function TopRightAlert({
	alertKey,
	type = "info",
	message,
	description,
	open = true,
	duration = 0,
}: Props) {
	useEffect(() => {
		if (!open) {
			notification.destroy(alertKey);
			return;
		}

		(notification[type] as any)?.({
			key: alertKey,
			message,
			description,
			duration,
		});

		return () => {
			notification.destroy(alertKey);
		};
	}, [alertKey, type, message, description, open, duration]);

	return null;
}
