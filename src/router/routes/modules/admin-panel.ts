import type { AppRouteRecordRaw } from "#src/router/types";

import { ContainerLayout } from "#src/layout";
import { $t } from "#src/locales";

import { userManagement } from "#src/router/extra-info";
import { lazy } from "react";

const ListUsers = lazy(() => import("#src/pages/user-management/UsersList"));
const ListRoles = lazy(() => import("#src/pages/user-management/RolesList"));
// const EditContractPage = lazy(() => import("#src/pages/user-management/edit"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/admin-panel",
		Component: ContainerLayout,
		handle: {
			icon: "SafetyOutlined",
			title: $t("common.menu.adminPanel"),
			order: userManagement,
			accessDomain: "contracts",
			accessAction: "view",
		},
		children: [
			{
				path: "/admin-panel/userManagement",
				Component: ListUsers,
				handle: {
					icon: "FileTextOutlined",
					title: $t("common.menu.userManagement"),
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
				path: "/admin-panel/roles",
				Component: ListRoles,
				handle: {
					icon: "TeamOutlined",
					title: $t("common.menu.role"),
					accessDomain: "contracts",
					accessAction: "view",
				},
			},
			// {
			// 	path: "/contracts/edit",
			// 	Component: EditContractPage,
			// 	handle: {
			// 		icon: "FileTextOutlined",
			// 		title: $t("common.menu.editContract"),
			// 		accessDomain: "contracts",
			// 		accessAction: "view",
			// roles: ["admin"],
			// permissions: [
			// 	accessControlCodes.get,
			// 	accessControlCodes.add,
			// 	accessControlCodes.update,
			// 	accessControlCodes.update,
			// ],
			// },
			// },
		],
	},
];

export default routes;
