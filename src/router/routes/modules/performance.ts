import type { AppRouteRecordRaw } from "#src/router/types";
import { ContainerLayout } from "#src/layout";
import { $t } from "#src/locales";
import { performance } from "#src/router/extra-info";
import { IssuesCloseOutlined } from "@ant-design/icons/lib";
import { createElement, lazy } from "react";

const CreatePerformancePage = lazy(() => import("#src/pages/performances/"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/performances",
		Component: ContainerLayout,
		handle: {
			icon: createElement(IssuesCloseOutlined),
			title: $t("common.menu.performanceManagement"),
			order: performance,
			accessDomain: "contracts",
			accessAction: "view",
		},
		children: [
			{
				path: "/performances/new",
				Component: CreatePerformancePage,
				handle: {
					icon: "FileTextOutlined",
					title: $t("common.menu.newPerformance"),
					accessDomain: "contracts",
					accessAction: "create",
				},
			},
		],
	},
];

export default routes;
