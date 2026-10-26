import type { AppRouteRecordRaw } from "#src/router/types";
import { SidebarPredictIcon } from "#src/icons/local-icons";
import { ContainerLayout } from "#src/layout";
import { prediction } from "#src/router/extra-info";
import {
	FileAddOutlined,
	TableOutlined,
} from "@ant-design/icons";
import { createElement, lazy } from "react";

const CreatePredictionPage = lazy(() => import("#src/pages/predictions/"));
const PredictionListPage = lazy(() => import("#src/pages/predictions/list/"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/predictions",
		Component: ContainerLayout,
		handle: {
			icon: createElement(SidebarPredictIcon),
			title: "\u067E\u06CC\u0634 \u0628\u06CC\u0646\u06CC \u0639\u0645\u0644\u06A9\u0631\u062F",
			order: prediction,
			accessDomain: "predictions",
			accessAction: "view",
		},
		children: [

			{
				path: "/predictions/new",
				Component: CreatePredictionPage,
				handle: {
					icon: createElement(FileAddOutlined),
					title: "\u062B\u0628\u062A \u067E\u06CC\u0634 \u0628\u06CC\u0646\u06CC",
					accessDomain: "predictions",
					accessAction: "create",
				},
			},
			{
				path: "/predictions/list",
				Component: PredictionListPage,
				handle: {
					icon: createElement(TableOutlined),
					title: "\u0648\u06CC\u0631\u0627\u06CC\u0634 \u067E\u06CC\u0634 \u0628\u06CC\u0646\u06CC\u200C\u0647\u0627",
					accessDomain: "predictions",
					accessAction: "update",
				},
			},
		],
	},
];

export default routes;
