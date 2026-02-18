import type { AppRouteRecordRaw } from "#src/router/types";

import { ContainerLayout } from "#src/layout";
import { $t } from "#src/locales";

import { company } from "#src/router/extra-info";
import { lazy } from "react";

const CompaniesPage = lazy(() => import("#src/pages/companies/"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/company",
		Component: ContainerLayout,
		handle: {
			icon: "SafetyOutlined",
			title: $t("common.menu.companies"),
			order: company,
		},
		children: [
			{
				path: "/company/management",
				Component: CompaniesPage,
				handle: {
					icon: "FileTextOutlined",
					title: $t("common.menu.companiesManagement"),
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
