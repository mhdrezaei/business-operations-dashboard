import type { ReactNode } from "react";
import { ConfigProvider, theme } from "antd";
import clsx from "clsx";
import { useContext } from "react";

interface FormActionBarProps {
	primaryActions: ReactNode
	secondaryActions?: ReactNode
	className?: string
}

export function FormActionBar({
	primaryActions,
	secondaryActions,
	className,
}: FormActionBarProps) {
	const { token } = theme.useToken();
	const antdContext = useContext(ConfigProvider.ConfigContext);
	const configuredCardRadius = antdContext.theme?.components?.Card?.borderRadiusLG;
	const actionBarRadius = typeof configuredCardRadius === "number"
		? configuredCardRadius
		: token.borderRadiusLG;

	return (
		<div
			className={clsx(
				"flex w-full flex-wrap items-center justify-between gap-3",
				className,
			)}
			style={{
				padding: token.paddingLG,
				border: `${token.lineWidth}px solid ${token.colorBorderSecondary}`,
				borderRadius: actionBarRadius,
				background: token.colorBgContainer,
			}}
		>
			<div className="flex flex-wrap items-center gap-2">
				{secondaryActions}
			</div>
			<div className="flex flex-wrap items-center gap-2">
				{primaryActions}
			</div>
		</div>
	);
}
