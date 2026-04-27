import type { AppRouteRecordRaw } from "#src/router/types";
import { ContainerLayout } from "#src/layout";
import { $t } from "#src/locales";
import UnregisteredPerformancePage from "#src/pages/performances/unregistered.js";
import { performance } from "#src/router/extra-info";
import { IssuesCloseOutlined } from "@ant-design/icons/lib";
import { createElement, lazy } from "react";

const CreatePerformancePage = lazy(() => import("#src/pages/performances/"));
const EditPerformancePage = lazy(() => import("#src/pages/performances/edit"));
const PerformanceReportPage = lazy(() => import("#src/pages/performances/report"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/performances",
		Component: ContainerLayout,
		handle: {
			icon: createElement(IssuesCloseOutlined),
			title: $t("common.menu.performanceManagement"),
			order: performance,
			accessDomain: "performances",
			accessAction: "view",
		},
		children: [
			{
				path: "/performances/new",
				Component: CreatePerformancePage,
				handle: {
					icon: "FileTextOutlined",
					title: $t("common.menu.newPerformance"),
					accessDomain: "performances",
					accessAction: "create",
				},
			},
			{
				path: "/performances/edit",
				Component: EditPerformancePage,
				handle: {
					icon: "FileTextOutlined",
					title: $t("common.menu.editPerformance"),
					accessDomain: "performances",
					accessAction: "view",
				},
			},
			{
				path: "/performances/unregistered",
				Component: UnregisteredPerformancePage,
				handle: {
					icon: "FileTextOutlined",
					title: $t("common.menu.unregisteredPerformances"),
					accessDomain: "performances",
					accessAction: "view",
				},
			},
			{
				path: "/performances/report",
				Component: PerformanceReportPage,
				handle: {
					icon: "FileTextOutlined",
					title: $t("common.menu.performanceReports"),
					accessDomain: "performances",
					accessAction: "view",
				},
			},
		],
	},
];

export default routes;
