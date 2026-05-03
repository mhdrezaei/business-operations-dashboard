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
export function Logo({ className, width }: LogoProps) {
	const navigate = useNavigate();
	const { isDark } = usePreferences();

	return (
		<div
			style={{ height: headerHeight, width: width ? `${width}px` : "100%" }}
			className={clsx("flex items-center justify-center gap-2 cursor-pointer", className)}
			onClick={() => navigate(import.meta.env.VITE_BASE_HOME_PATH)}
		>
			{isDark
				? <DarkLogo width={90} height={56} />
				: <LightLogo width={90} height={56} />}
		</div>
	);
}
