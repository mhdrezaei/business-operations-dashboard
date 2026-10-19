import type { AppRouteRecordRaw } from "#src/router/types";
import { SidebarDashboardIcon } from "#src/icons/local-icons";
import { ContainerLayout } from "#src/layout";
import { $t } from "#src/locales";
import { dashboard } from "#src/router/extra-info";
import { createElement, lazy } from "react";

const Dashboard = lazy(() => import("#src/pages/dashboard"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/dashboard",
		Component: ContainerLayout,
		handle: {
			order: dashboard,
			title: $t("common.menu.managementDashboard"),
			icon: createElement(SidebarDashboardIcon, { style: { fontSize: 24 } }),
		},
		children: [
			{
				index: true,
				Component: Dashboard,
				handle: {
					title: $t("common.menu.managementDashboard"),
					icon: createElement(SidebarDashboardIcon, { style: { fontSize: 24 } }),
				},
			},
		],
	},
];

export default routes;
