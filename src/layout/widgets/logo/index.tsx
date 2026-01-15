import logo from "#src/assets/svg/logo.svg?url";

import { Typography } from "antd";
import { clsx } from "clsx";
import { useNavigate } from "react-router";

import { headerHeight } from "../../constants";

const { Title } = Typography;

export interface LogoProps {
	sidebarCollapsed: boolean
	className?: string
	width?: number
}

/**
 * @fa ارتفاع 48px
 * @en The height is 48px
 */
export function Logo({ sidebarCollapsed, className, width }: LogoProps) {
	const navigate = useNavigate();

	return (
		<div
			style={{ height: headerHeight, width: width ? `${width}px` : "100%" }}
			className={clsx("flex items-center justify-start gap-2 cursor-pointer", className)}
			onClick={() => navigate(import.meta.env.VITE_BASE_HOME_PATH)}
		>
			<img
				src={logo}
				alt="logo"
				width={32}
				height={32}
			/>

			<Title
				level={1}
				className={clsx("!text-sm !m-0", { hidden: sidebarCollapsed })}
				ellipsis
			>
				{import.meta.env.VITE_GLOB_APP_TITLE}
			</Title>

		</div>
	);
}
