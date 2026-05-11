import { PageError } from "#src/components";
import { notificationUnreadCountQuery } from "#src/features/notification/queries/notifications.queries";
import { usePreferences } from "#src/hooks";
import { AuthGuard } from "#src/router/guard";
import { whiteRouteNames } from "#src/router/routes";
import { useAuthStore, useUserStore } from "#src/store";
import { isString, NProgress, toggleHtmlClass } from "#src/utils";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useMatches } from "react-router";

/**
 * @fa کامپوننت چيدمان ريشه
 * @en Root layout component
 */
export default function LayoutRoot() {
	const matches = useMatches();
	const { t } = useTranslation();
	const location = useLocation();
	const { language, isDark, enableDynamicTitle } = usePreferences();
	const isLogin = useAuthStore(state => Boolean(state.access));
	const isAuthorized = useUserStore(state => Boolean(state.id));
	const unreadCountQuery = useQuery({
		...notificationUnreadCountQuery(),
		enabled: isLogin,
	});

	/* document title */
	useEffect(() => {
		if (!enableDynamicTitle) {
			return;
		}
		/**
		 * @fa authGuardDependencies وابستگي useEffect براي دريافت اطلاعات کاربر است؛ اگر true باشد و مسير 404 باشد، document.title تغيير نمي کند
		 * @en authGuardDependencies is the dependency of useEffect that will request user information. If it's true,
		 */
		const authGuardDependencies = !whiteRouteNames.includes(location.pathname) && isLogin && !isAuthorized;
		if (!authGuardDependencies) {
			const currentRoute = matches[matches.length - 1];
			const documentTitle = currentRoute.handle?.title as React.ReactElement | string;
			const rawTitle = isString(documentTitle) ? documentTitle : documentTitle?.props?.children;
			const baseTitle = t(rawTitle) || document.title;
			const unreadCount = isLogin ? unreadCountQuery.data ?? 0 : 0;
			document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle;
		}
	}, [enableDynamicTitle, language, location, matches, isLogin, isAuthorized, t, unreadCountQuery.data]);

	/* tailwind theme */
	useEffect(() => {
		if (isDark) {
			toggleHtmlClass("dark").add();
		}
		else {
			toggleHtmlClass("dark").remove();
		}
	}, [isDark]);

	/**
	 * @fa بستن نوار پيشرفت بارگذاري صفحه، همراه با loader و shouldRevalidate مسير ROOT_ROUTE_ID
	 * @en Close the page loading progress bar, used with the loader and shouldRevalidate of the ROOT_ROUTE_ID route
	 */
	useEffect(() => {
		NProgress.done();
	}, [location.pathname]);

	return (
		<ErrorBoundary FallbackComponent={PageError}>
			<AuthGuard>
				<Outlet />
			</AuthGuard>
		</ErrorBoundary>
	);
}
