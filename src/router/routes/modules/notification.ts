import type { AppRouteRecordRaw } from "#src/router/types";
import { ContainerLayout } from "#src/layout";
import { $t } from "#src/locales";
import { BellOutlined } from "@ant-design/icons";
import { createElement, lazy } from "react";

const NotificationInboxPage = lazy(() => import("#src/pages/notifications"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/notifications",
		Component: ContainerLayout,
		handle: {
			icon: createElement(BellOutlined),
			title: $t("widgets.notifications"),
			hideInMenu: false,
			ignoreAccess: false,
		},
		children: [
			{
				path: "/notifications/inbox",
				Component: NotificationInboxPage,
				handle: {
					icon: createElement(BellOutlined),
					title: $t("widgets.notifications"),
					hideInMenu: false,
					ignoreAccess: true,
				},
			},
		],
	},
];

export default routes;
