import type { AppRouteRecordRaw } from "#src/router/types";
import { SidebarPredictIcon } from "#src/icons/local-icons";
import { ContainerLayout } from "#src/layout";
import { $t } from "#src/locales";
import { prediction } from "#src/router/extra-info";
import { createIndexRedirectRoute } from "#src/router/utils/index-redirect-route";
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
			title: $t("common.menu.predictionManagement"),
			order: prediction,
			accessDomain: "predictions",
			accessAction: "view",
		},
		children: [
			createIndexRedirectRoute(),

			{
				path: "/predictions/new",
				Component: CreatePredictionPage,
				handle: {
					icon: createElement(FileAddOutlined),
					title: $t("common.menu.newPrediction"),
					accessDomain: "predictions",
					accessAction: "create",
				},
			},
			{
				path: "/predictions/list",
				Component: PredictionListPage,
				handle: {
					icon: createElement(TableOutlined),
					title: $t("common.menu.editPredictions"),
					accessDomain: "predictions",
					accessAction: "view",
				},
			},
		],
	},
];

export default routes;
