import type { AppRouteRecordRaw } from "#src/router/types";

import { ContainerLayout } from "#src/layout";
import { $t } from "#src/locales";

import { userManagement } from "#src/router/extra-info";
import { BellOutlined } from "@ant-design/icons";
import { createElement, lazy } from "react";

const ListUsers = lazy(() => import("#src/pages/user-management/UsersList"));
const ListRoles = lazy(() => import("#src/pages/user-management/RolesList"));
const AuditLogs = lazy(() => import("#src/pages/user-management/AuditLogsList"));
const NotificationRules = lazy(() => import("#src/pages/user-management/NotificationRules"));
// const EditContractPage = lazy(() => import("#src/pages/user-management/edit"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/admin-panel",
		Component: ContainerLayout,
		handle: {
			icon: "SafetyOutlined",
			title: $t("common.menu.adminPanel"),
			order: userManagement,
			adminAccess: "audit_logs",
		},
		children: [
			{
				path: "/admin-panel/userManagement",
				Component: ListUsers,
				handle: {
					icon: "FileTextOutlined",
					title: $t("common.menu.userManagement"),
					adminAccess: "users",
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
					adminAccess: "roles",
				},
			},
			{
				path: "/admin-panel/audit-logs",
				Component: AuditLogs,
				handle: {
					icon: "HistoryOutlined",
					title: $t("common.menu.auditLogs"),
					adminAccess: "audit_logs",
				},
			},
			{
				path: "/admin-panel/notification-rules",
				Component: NotificationRules,
				handle: {
					icon: createElement(BellOutlined),
					title: $t("common.menu.notificationRules"),
					adminAccess: "policies",
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
