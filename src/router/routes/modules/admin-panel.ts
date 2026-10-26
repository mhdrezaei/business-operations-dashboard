import type { AppRouteRecordRaw } from "#src/router/types";

import { SidebarManagementIcon } from "#src/icons/local-icons";
import { ContainerLayout } from "#src/layout";
import { $t } from "#src/locales";

import { userManagement } from "#src/router/extra-info";
import { ApartmentOutlined, AuditOutlined, BellOutlined, HistoryOutlined, SafetyOutlined, UserOutlined } from "@ant-design/icons";
import { createElement, lazy } from "react";

const ListUsers = lazy(() => import("#src/pages/user-management/UsersList"));
const ListRoles = lazy(() => import("#src/pages/user-management/RolesList"));
const AuditLogs = lazy(() => import("#src/pages/user-management/AuditLogsList"));
const NotificationRules = lazy(() => import("#src/pages/user-management/NotificationRules"));
const SignFlowRules = lazy(() => import("#src/pages/user-management/SignFlowRules"));
const TelecomFrameMasterData = lazy(() => import("#src/pages/user-management/TelecomFrameMasterData"));
const SalesAgencyExpenseTitles = lazy(() => import("#src/pages/user-management/SalesAgencyExpenseTitles"));
// const EditContractPage = lazy(() => import("#src/pages/user-management/edit"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/admin-panel",
		Component: ContainerLayout,
		handle: {
			icon: createElement(SidebarManagementIcon),
			title: $t("common.menu.adminPanel"),
			order: userManagement,
		},
		children: [
			{
				path: "/admin-panel/userManagement",
				Component: ListUsers,
				handle: {
					icon: createElement(UserOutlined),
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
					icon: createElement(SafetyOutlined),
					title: $t("common.menu.role"),
					adminAccess: "roles",
				},
			},
			{
				path: "/admin-panel/audit-logs",
				Component: AuditLogs,
				handle: {
					icon: createElement(HistoryOutlined),
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
			{
				path: "/admin-panel/sign-flow-rules",
				Component: SignFlowRules,
				handle: {
					icon: createElement(AuditOutlined),
					title: "قوانین گردش امضای قرارداد",
					adminAccess: "policies",
				},
			},
			{
				path: "/admin-panel/sales-agency/expense-titles",
				Component: SalesAgencyExpenseTitles,
				handle: {
					icon: createElement(AuditOutlined),
					title: "عنوان‌های هزینه‌ی عاملیت فروش",
					accessDomain: "contracts",
					accessAction: ["view", "create", "update"],
					serviceCode: "sales_agency",
				},
			},
			{
				path: "/admin-panel/telecom-frame/master-data",
				Component: TelecomFrameMasterData,
				handle: {
					icon: createElement(ApartmentOutlined),
					title: $t("common.menu.telecomFrameMasterData"),
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
