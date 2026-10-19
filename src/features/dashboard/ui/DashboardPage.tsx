import { BasicContent } from "#src/components";
import { SidebarDashboardIcon } from "#src/icons/local-icons";
import { usePreferencesStore } from "#src/store";
import { useKeepAliveContext } from "keepalive-for-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { DashboardWidgetsSection } from "./DashboardWidgetsSection";
import { useDashboardBorderStyle } from "./shell/dashboard-border";
import "./dashboard.css";

/** Management dashboard: KPI strip, charts and tables of service performance, income and contracts. */
export function DashboardPage() {
	const { t } = useTranslation();
	const borderStyle = useDashboardBorderStyle();
	const setPreferences = usePreferencesStore(state => state.setPreferences);
	// The page is cached by the tab bar: `active` turns true on every return to its tab, not only on mount.
	const { active } = useKeepAliveContext();
	// The menu is collapsed whenever the page is shown so the cards and charts get the full width; the user can reopen it.
	useEffect(() => {
		if (active)
			setPreferences("sidebarCollapsed", true);
	}, [active, setPreferences]);

	return (
		<BasicContent>
			{/* The side gutters on wide screens leave room for the floating range/service panels. */}
			<div className="px-0 py-2 md:px-2 min-[1500px]:px-[196px]" style={borderStyle}>
				<main className="flex flex-col gap-6 min-w-0 mx-auto w-full max-w-[1600px] dash-rise-in">
					<div className="flex items-center gap-3">
						<div className="grid place-items-center w-[42px] h-[42px] rounded-xl text-white text-xl shrink-0 bg-gradient-to-br from-primary to-primaryActive">
							<SidebarDashboardIcon />
						</div>
						<div>
							<h1 className="m-0 text-2xl font-semibold tracking-tight text-colorText">{t("dashboard.page.title")}</h1>
							<p className="m-0 text-[13.5px] text-colorTextSecondary">{t("dashboard.page.subtitle")}</p>
						</div>
					</div>
					<DashboardWidgetsSection active={active} />
				</main>
			</div>
		</BasicContent>
	);
}
