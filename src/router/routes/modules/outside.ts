import type { AppRouteRecordRaw } from "#src/router/types";

import { ContainerLayout } from "#src/layout";
import { $t } from "#src/locales";
import { outside } from "#src/router/extra-info";

import { AntDesignOutlined, ContainerOutlined } from "@ant-design/icons";
import { createElement } from "react";

const routes: AppRouteRecordRaw[] = [
	{
		path: "/outside",
		Component: ContainerLayout,
		handle: {
			icon: "OutsidePageIcon",
			title: $t("common.menu.outside"),
			order: outside,
		},
		children: [
			{
				path: "/outside/embedded",
				Component: () => { return ""; },
				handle: {
					icon: "EmbeddedIcon",
					title: $t("common.menu.embedded"),
				},
				children: [
					{
						path: "/outside/embedded/ant-design",
						Component: () => { return ""; },
						handle: {
							icon: createElement(AntDesignOutlined),
							title: $t("common.menu.antd"),
							// iframeLink: "https://ant.design/",
						},
					},
					{
						path: "/outside/embedded/project-docs",
						Component: () => { return ""; },
						handle: {
							icon: createElement(ContainerOutlined),
							title: $t("common.menu.projectDocs"),
							// iframeLink: "https://condorheroblog.github.io/react-antd-admin/docs/",
						},
					},
				],
			},
			// {
			// 	path: "/outside/external-link",
			// 	Component: () => { return ""; },
			// 	handle: {
			// 		icon: "ExternalIcon",
			// 		title: $t("common.menu.externalLink"),
			// 	},
			// 	children: [
			// 		{
			// 			path: "/outside/external-link/react-docs",
			// 			Component: () => { return ""; },
			// 			handle: {
			// 				icon: createElement(RiReactjsLine),
			// 				title: $t("common.menu.reactDocs"),
			// 				// externalLink: "https://react.dev/",
			// 			},
			// 		},
			// 	],
			// },
		],
	},
];

export default routes;
