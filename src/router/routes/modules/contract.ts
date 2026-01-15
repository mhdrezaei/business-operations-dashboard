import type { AppRouteRecordRaw } from "#src/router/types";

import { accessControlCodes } from "#src/hooks/use-access/constants";
import { ContainerLayout } from "#src/layout";
import { $t } from "#src/locales";
import { contract } from "#src/router/extra-info";

import { lazy } from "react";

const ContractsPage = lazy(() => import("#src/pages/contracts/"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/contracts",
		Component: ContainerLayout,
		handle: {
			icon: "SafetyOutlined",
			title: $t("common.menu.contractsManangement"),
			order: contract,
		},
		children: [
			{
				path: "/contracts/new",
				Component: ContractsPage,
				handle: {
					icon: "FileTextOutlined",
					title: $t("common.menu.newContract"),
					roles: ["admin"],
					permissions: [
						accessControlCodes.get,
						accessControlCodes.add,
						accessControlCodes.update,
						accessControlCodes.update,
					],
				},
			},
		],
	},
];

export default routes;
