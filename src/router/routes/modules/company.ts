import type { AppRouteRecordRaw } from "#src/router/types";

import { SidebarCompanyIcon } from "#src/icons/local-icons";
import { ContainerLayout } from "#src/layout";
import { $t } from "#src/locales";

import { company } from "#src/router/extra-info";
import { TeamOutlined } from "@ant-design/icons";
import { createElement, lazy } from "react";

const CompaniesPage = lazy(() => import("#src/pages/companies/"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/company",
		Component: ContainerLayout,
		handle: {
			icon: createElement(SidebarCompanyIcon),
			title: $t("common.menu.companies"),
			order: company,
			accessDomain: "company_profile",
			accessAction: "view",
		},
		children: [
			{
				path: "/company/management",
				Component: CompaniesPage,
				handle: {
					icon: createElement(TeamOutlined),
					title: $t("common.menu.companiesManagement"),
					accessDomain: "company_profile",
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
