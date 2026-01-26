import { fetchAsyncRoutes } from "#src/api/user";
import { useCurrentRoute } from "#src/hooks";
import { hideLoading, setupLoading } from "#src/plugins";
import { exception403Path, exception404Path, exception500Path, loginPath } from "#src/router/extra-info";
import { accessRoutes, whiteRouteNames } from "#src/router/routes";
import { isSendRoutingRequest } from "#src/router/routes/config";
import { generateRoutesByFrontend, generateRoutesFromBackend } from "#src/router/utils";
import { useAccessStore, useAuthStore, usePreferencesStore, useUserStore } from "#src/store";

import { useEffect } from "react";
import { matchRoutes, Navigate, useLocation, useNavigate, useSearchParams } from "react-router";

import { removeDuplicateRoutes } from "./utils";

/**
 * @fa فهرست سفيد مسيرها: 1. بدون بررسي مجوز 2. بدون درخواست، مثل API اطلاعات کاربر
 * @en Routes whitelist 1. No permission verification, 2. Will not trigger requests, such as user information interface
 * @example "privacy-policy", "terms-of-service" and so on.
 */
const noLoginWhiteList = Array.from(whiteRouteNames).filter(item => item !== loginPath);

interface AuthGuardProps {
	children?: React.ReactNode
}

/**
 * @fa کامپوننت AuthGuard براي اعتبارسنجي مجوز؛ ترتيب کد مهم است و نبايد تغيير کند
 * @en AuthGuard component, used for permission verification. The order of the code is important and should not be arbitrarily adjusted
 */
export function AuthGuard({ children }: AuthGuardProps) {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const currentRoute = useCurrentRoute();
	const { pathname, search } = useLocation();
	const isLogin = useAuthStore(state => Boolean(state.access));
	const isAuthorized = useUserStore(state => Boolean(state.id));
	const getUserInfo = useUserStore(state => state.getUserInfo);
	const userRoles = useUserStore(state => state.roles);
	const { setAccessStore, isAccessChecked, routeList } = useAccessStore();
	const { enableBackendAccess, enableFrontendAceess } = usePreferencesStore(state => state);

	const isPathInNoLoginWhiteList = noLoginWhiteList.includes(pathname);

	/**
	 * @fa دريافت غيرهمزمان اطلاعات کاربر و تنظيمات مسير
	 * @en Fetch user information and route configuration asynchronously
	 */
	useEffect(() => {
		async function fetchUserInfoAndRoutes() {
			/**
			 * @fa انتقال ورود براي جلوگيري از چشمک
			 * @en Login redirect, prevent flicker
			 */
			setupLoading();

			/**
			 * @fa ايجاد آرايه خالي براي Promise ها
			 * @en Initialize an empty array to hold Promise objects
			 */
			const promises = [];

			/**
			 * @fa دريافت اطلاعات کاربر
			 * @en Fetch user information
			 */
			promises.push(getUserInfo());

			/**
			 * @fa اگر مسيرهاي بک اند فعال و از API جدا دريافت مي شوند، درخواست ارسال کن
			 * @en If backend routing is enabled and the route is obtained from a separate interface, then initiate a request
			 */
			if (enableBackendAccess && isSendRoutingRequest) {
				promises.push(fetchAsyncRoutes());
			}

			const results = await Promise.allSettled(promises);
			const [userInfoResult, routeResult] = results;
			const routes = [];
			const latestRoles = [];
			/**
			 * @fa دريافت اطلاعات نقش از API کاربر
			 * @en Fetch role information from the user interface
			 */
			// if (userInfoResult.status === "fulfilled" && "roles" in userInfoResult.value) {
			if (userInfoResult.status === "fulfilled" && userInfoResult?.value) {
				// latestRoles.push(...userInfoResult.value?.roles ?? []);
				latestRoles.push("admin");
			}
			console.warn(userInfoResult && userInfoResult, "xxxxxxxx");
			/**
			 * @fa بک اند فعال است و مسيرها از API کاربر دريافت مي شود
			 * @en If backend routing is enabled and the route is obtained from the user interface
			 */
			if (enableBackendAccess && !isSendRoutingRequest && userInfoResult.status === "fulfilled" && "menus" in userInfoResult.value) {
				routes.push(...await generateRoutesFromBackend(userInfoResult.value?.menus ?? []));
			}
			/**
			 * @fa بک اند فعال است و مسيرها از API جدا دريافت مي شود
			 * @en If backend routing is enabled and the route is obtained from a separate interface
			 */
			if (enableBackendAccess && isSendRoutingRequest && routeResult.status === "fulfilled" && "result" in routeResult.value) {
				routes.push(...await generateRoutesFromBackend(routeResult.value?.result ?? []));
			}

			/**
			 * @fa مسيرهاي فرانت اند فعال است
			 * @en If frontend routing is enabled
			 */
			if (enableFrontendAceess) {
				routes.push(...generateRoutesByFrontend(accessRoutes, latestRoles));
			}

			const uniqueRoutes = removeDuplicateRoutes(routes);
			setAccessStore(uniqueRoutes);

			const hasError = results.some(result => result.status === "rejected");
			/**
			 * @fa درخواست شبکه شکست خورد، به صفحه 500 برو
			 * @en Network request failed, redirect to 500 page
			 */
			if (hasError) {
				const unAuthorized = results.some((result: any) => result.reason.response.status === 401);
				if (!unAuthorized) {
					return navigate(exception500Path);
				}
			}

			/**
			 *
			 * @fa در حالت مسير پويا آيا بايد مسير فعلي را جايگزين کرد؟
			 * 1. ورود مرورگر به مسير پويا مثل /system/user
			 * 2. مسير پويا هنوز اضافه نشده، آدرس /system/user است اما مسير fallback (path = "*") تطبيق مي شود
			 * 3. پس از افزودن مسير پويا، با replace مسير فعلي را جايگزين کن تا دوباره تطبيق شود
			 *
			 * Refer:https://router.vuejs.org/guide/advanced/dynamic-routing#Adding-routes
			 *
			 * @en Under the condition of dynamic routing, do you need to replace the current route?
			 * 1. Browser navigation into a dynamic routing address, such as /system/user
			 * 2. The dynamic route is not added to the route, so the address bar is still /system/user but the matched route is the fallback (path = "*") route
			 * 3. After adding the dynamic route, use replace to replace the current route and trigger the program to match /system/user again
			 */
			navigate(`${pathname}${search}`, {
				replace: true,
				/**
				 * @fa مطمئن شو قبل از جايگزيني مسير، صفحه 404 نمايش داده نشود (در 3G ممکن است چشمک بزند)
				 * @en Ensure that the 404 page will not be displayed before replacing the route
				 */
				flushSync: true,
			});
		}
		/**
		 * @fa فقط در شرايط زير منطق دريافت اطلاعات کاربر و مسير اجرا مي شود
		 * 1. خارج از فهرست سفيد مسير
		 * 2. وارد شده
		 * 3. اطلاعات کاربر و مسير دريافت نشده
		 *
		 * @en The logic of obtaining user information and routes is only executed under the following conditions
		 * 1. Not in the route whitelist
		 * 2. Logged in
		 * 3. Unable to obtain user information and route information
		 *
		 */
		if (!whiteRouteNames.includes(pathname) && isLogin && !isAuthorized) {
			fetchUserInfoAndRoutes();
		}
	}, [pathname, isLogin, isAuthorized]);

	/**
	 * @fa فهرست سفيد مسيرها
	 * @en Route whitelist
	 * @see {noLoginWhiteList}
	 */
	if (isPathInNoLoginWhiteList) {
		hideLoading();
		return children;
	}

	/**
	 * @fa منطق پردازش در حالت وارد نشده
	 * @en Processing logic under unlogged conditions
	 */
	/* --------------- Start ------------------ */
	if (!isLogin) {
		hideLoading();
		// اگر وارد نشده و صفحه مقصد ورود نيست، به ورود برو
		if (pathname !== loginPath) {
			// اگر طول pathname بيشتر از 1 است، مسير فعلي را به redirect اضافه کن
			const redirectPath = pathname.length > 1 ? `${loginPath}?redirect=${pathname}${search}` : loginPath;
			return (
				<Navigate
					to={redirectPath}
					replace
				/>
			);
		}
		// اگر وارد نشده و مقصد ورود است، همان صفحه بماند
		else {
			return children;
		}
	}
	/* --------------- End ------------------ */

	/**
	 * @fa منطق پردازش در حالت وارد شده
	 * @en Processing logic under logged conditions
	 */
	/* --------------- Start ------------------ */

	/**
	 * @fa در حالت وارد شده اگر مسير login بود، به خانه برو
	 * اين بخش قبل از اطلاعات کاربر است چون login اطلاعات کاربر را درخواست نمي کند
	 *
	 * @en Under logged conditions, match the login route and jump to the home page
	 * Put it before user information, because the login route will not request user information, so put it in front to judge
	 */
	if (pathname === loginPath) {
		/**
		 * @example login?redirect=/system/user
		 */
		const redirectPath = searchParams.get("redirect");
		if (redirectPath?.length && redirectPath !== pathname) {
			return (
				<Navigate
					to={redirectPath}
					replace
				/>
			);
		}
		return (
			<Navigate
				to={import.meta.env.VITE_BASE_HOME_PATH}
				replace
			/>
		);
	}

	/**
	 * @fa منتظر دريافت اطلاعات کاربر
	 * @en  Waiting for user information to be obtained
	 */
	if (!isAuthorized) {
		return null;
	}
	/**
	 * @fa منتظر دريافت اطلاعات مسير
	 * @en Waiting for route information to be obtained
	 */
	if (!isAccessChecked) {
		return null;
	}

	/**
	 * @fa پنهان کردن انيميشن بارگذاري
	 * @en Hide loading animation
	 */
	hideLoading();

	/**
	 * @fa اگر مسير ريشه است به صفحه اصلي برو (پس از دريافت اطلاعات کاربر، براي جلوگيري از درخواست دوباره)
	 * @en If it is the root route, jump to the home page (jump to the default home page after obtaining user information to prevent requesting twice for user information interface)
	 * @fa pathname نسبت به import.meta.env.BASE_URL است، پس مسير ريشه "/" نسبت به BASE_URL است
	 * @en pathname returns the path relative to import.meta.env.BASE_URL, so here is the root route "/" relative to BASE_URL
	 */
	if (pathname === "/") {
		return (
			<Navigate
				to={import.meta.env.VITE_BASE_HOME_PATH}
				replace
			/>
		);
	}

	/* --------------- End ------------------ */

	/**
	 * @fa منطق بررسي مجوز مسير
	 * @en Route permission verification logic
	 */
	const routeRoles = currentRoute?.handle?.roles;
	const ignoreAccess = currentRoute?.handle?.ignoreAccess;

	/**
	 * @fa ناديده گرفتن بررسي مجوز
	 * @en Ignore permission verification
	 */
	if (ignoreAccess === true) {
		return children;
	}

	const matches = matchRoutes(
		routeList,
		pathname,
		/**
		 * @fa pathname نسبت به import.meta.env.BASE_URL است، پس نيازي به basename نيست
		 * @en pathname returns the path relative to import.meta.env.BASE_URL, so there is no need to specify the third parameter basename
		 */
	) ?? [];

	const hasChildren = matches[matches.length - 1]?.route?.children?.filter(item => !item.index)?.length;
	/**
	 * @fa اگر مسير فعلي زيرمسير دارد، به صفحه 404 برو
	 * @en If the current route has sub-routes, jump to the 404 page
	 */
	if (hasChildren && hasChildren > 0) {
		return (
			<Navigate
				to={exception404Path}
				replace
			/>
		);
	}

	/**
	 * @fa بررسي مجوز نقش
	 * @en Role permission verification
	 */
	const hasRoutePermission = userRoles.some(role => routeRoles?.includes(role));
	/**
	 * @fa منطق بررسي مجوز:
	 * 1. اگر مسير roles نداشت، بدون مجوز محسوب مي شود (مثل ignoreAccess = true)
	 * 2. اگر مجوز تاييد نشود، ناوبري لغو و به صفحه 403 برو
	 *
	 * @en Role permission verification logic:
	 * 1. If there is no role on the route, it is considered as a permissionless route, equivalent to ignoreAccess being true
	 * 2. For routes that do not pass permission verification, cancel the current route navigation and jump to the 403 page
	 */
	if (routeRoles && routeRoles.length && !hasRoutePermission) {
		return (
			<Navigate
				to={exception403Path}
				replace
			/>
		);
	}

	return children;
}
/**
 * مراحل بررسي صحت مسيريابي:
 * 1. در حالت عدم ورود، مسير login را وارد کنيد
 * 2. در حالت عدم ورود، مسير غير از login را وارد کنيد
 * 3. در حالت ورود، خروج از سيستم و دوباره ورود
 * 4. يک صفحه غير از home را انتخاب کنيد، localStorage را پاک کنيد، صفحه را رفرش و سپس وارد شويد
 * 5. در حالت ورود، مسير login را وارد کنيد
 * 6. در حالت ورود، مسير غير از login را وارد کنيد
 * 7. در حالت ورود، http://localhost:3333 را وارد کنيد، به /home برويد و API کاربر يک بار فراخواني شود
 * 8. در حالت ورود، http://localhost:3333/ را وارد کنيد، به /home برويد و API کاربر يک بار فراخواني شود
 * 9. در حالت ورود، http://localhost:3333/home را وارد کنيد، به /home برويد و API کاربر يک بار فراخواني شود
 */
