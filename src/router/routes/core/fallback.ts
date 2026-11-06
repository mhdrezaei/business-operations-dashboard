import type { RouteObject } from "react-router";

import { exception403Path } from "#src/router/extra-info";
import { lazy } from "react";

const Forbidden = lazy(() => import("#src/pages/exception/403"));
const NotFound = lazy(() => import("#src/pages/exception/404"));

const routes: RouteObject[] = [
	{
		path: exception403Path,
		id: "403",
		Component: Forbidden,
		handle: {
			title: "403",
			hideInMenu: true,
		},
	},
	{
		path: "*",
		id: "404",
		Component: NotFound,
		handle: {
			title: "404",
			hideInMenu: true,
		},
	},
];

export default routes;
