import type { AppRouteRecordRaw } from "#src/router/types";

import { SidebarContractIcon } from "#src/icons/local-icons";
import { ContainerLayout } from "#src/layout";
import { $t } from "#src/locales";

import { contract } from "#src/router/extra-info";
import { EditOutlined, EyeOutlined, FileAddOutlined, SnippetsOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { createElement, lazy } from "react";

const CreateContractPage = lazy(() => import("#src/pages/contracts/"));
const EditContractPage = lazy(() => import("#src/pages/contracts/edit"));
const EditContractFormPage = lazy(() => import("#src/pages/contracts/edit-contract"));
const ContractPreviewPage = lazy(() => import("#src/pages/contracts/preview"));
const ContractTemplate = lazy(() => import("#src/pages/contracts/contract-template"));
const SignFlowListPage = lazy(() => import("#src/pages/contracts/sign-flows"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/contracts",
		Component: ContainerLayout,
		handle: {
			icon: createElement(SidebarContractIcon),
			title: $t("common.menu.contractsManangement"),
			order: contract,
			accessDomain: "contracts",
			accessAction: "view",
		},
		children: [
			{
				path: "/contracts/sign-flows",
				Component: SignFlowListPage,
				handle: {
					icon: createElement(UnorderedListOutlined),
					title: "گردش‌های امضای قرارداد",
					accessDomain: "contracts",
					accessAction: "view",
				},
			},
			{
				path: "/contracts/new",
				Component: CreateContractPage,
				handle: {
					icon: createElement(FileAddOutlined),
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
				path: "/contracts/list",
				Component: EditContractPage,
				handle: {
					icon: createElement(UnorderedListOutlined),
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
			{
				path: "/contracts/:contractId/preview",
				Component: ContractPreviewPage,
				handle: {
					icon: createElement(EyeOutlined),
					title: "پیش‌نمایش قرارداد",
					hideInMenu: true,
					currentActiveMenu: "/contracts/list",
					accessDomain: "contracts",
					accessAction: "view",
					keepAlive: false,
				},
			},
			{
				path: "/contracts/:contractId/edit",
				Component: EditContractFormPage,
				handle: {
					icon: createElement(EditOutlined),
					title: $t("common.menu.editContractForm"),
					hideInMenu: true,
					currentActiveMenu: "/contracts/list",
					accessDomain: "contracts",
					accessAction: "update",
					keepAlive: false,
				},
			},
			{
				path: "/contracts/template",
				Component: ContractTemplate,
				handle: {
					icon: createElement(SnippetsOutlined),
					title: $t("common.menu.contractTemplate"),
					accessDomain: "contracts",
					accessAction: "view",
					keepAlive: false,
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
