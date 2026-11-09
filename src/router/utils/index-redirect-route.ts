import type { AppRouteRecordRaw } from "#src/router/types";

import { createElement } from "react";
import { Navigate } from "react-router";

/** Index child for a menu group that has no page of its own, so the bare group path (e.g. /company) lands on `to` instead of a blank layout. */
export function createIndexRedirectRoute(to = "/home"): AppRouteRecordRaw {
	return {
		index: true,
		element: createElement(Navigate, { to, replace: true }),
		handle: { title: "", hideInMenu: true },
	};
}
