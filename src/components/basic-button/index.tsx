import type { ButtonProps } from "antd";
import type { ReactNode } from "react";
import { Button } from "antd";

interface BasicButtonProps extends ButtonProps {
	children?: ReactNode
}

export function BasicButton(props: BasicButtonProps) {
	const { children } = props;

	// پاک کردن ويژگي هاي سفارشي
	const params: Partial<BasicButtonProps> = { ...props };

	return (
		<Button
			type="primary"
			{...params}
		>
			{children}
		</Button>
	);
}
