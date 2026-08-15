import DarkLogo from "#src/assets/svg/dark-logo";
import LightLogo from "#src/assets/svg/light-logo";
import { usePreferences } from "#src/hooks";
import { clsx } from "clsx";
import { useNavigate } from "react-router";
import { headerHeight } from "../../constants";

export interface LogoProps {
	sidebarCollapsed: boolean
	className?: string
	width?: number
}

/**
 * @fa ارتفاع 48px
 * @en The height is 48px
 */
export function Logo({ className, width, sidebarCollapsed }: LogoProps) {
	const navigate = useNavigate();
	const { isDark } = usePreferences();
	const logoWidth = sidebarCollapsed ? 44 : 90;
	return (
		<div
			style={{
				height: headerHeight,
				width: width ? `${width}px` : "100%",
			}}
			className={clsx(
				"flex items-center gap-2 cursor-pointer max-w-80",
				sidebarCollapsed ? "justify-center" : "justify-start",
				className,
			)}
			onClick={() => navigate(import.meta.env.VITE_BASE_HOME_PATH)}
		>
			{isDark
				? <DarkLogo width={logoWidth} height={44} compact={sidebarCollapsed} />
				: <LightLogo width={logoWidth} height={44} compact={sidebarCollapsed} />}
		</div>
	);
}
