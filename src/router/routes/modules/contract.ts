import type { AppRouteRecordRaw } from "#src/router/types";

import { ContainerLayout } from "#src/layout";
import { $t } from "#src/locales";

import { contract } from "#src/router/extra-info";
import { lazy } from "react";

const CreateContractPage = lazy(() => import("#src/pages/contracts/"));
const EditContractPage = lazy(() => import("#src/pages/contracts/edit"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/contracts",
		Component: ContainerLayout,
		handle: {
			icon: "SafetyOutlined",
			title: $t("common.menu.contractsManangement"),
			order: contract,
			accessDomain: "contracts",
			accessAction: "view",
		},
		children: [
			{
				path: "/contracts/new",
				Component: CreateContractPage,
				handle: {
					icon: "FileTextOutlined",
					title: $t("common.menu.newContract"),
					accessDomain: "contracts",
					accessAction: "create",
					// roles: ["admin"],
					// permissions: [
					// 	accessControlCodes.get,
					// 	accessControlCodes.add,
					// 	accessControlCodes.update,
					// 	accessControlCodes.update,
					// ],
				},
			},
			{
				path: "/contracts/edit",
				Component: EditContractPage,
				handle: {
					icon: "FileTextOutlined",
					title: $t("common.menu.editContract"),
					accessDomain: "contracts",
					accessAction: "view",
					// roles: ["admin"],
					// permissions: [
					// 	accessControlCodes.get,
					// 	accessControlCodes.add,
					// 	accessControlCodes.update,
					// 	accessControlCodes.update,
					// ],
				},
			},
		],
	},
];

export default routes;
