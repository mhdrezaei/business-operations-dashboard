import type { TabItemProps } from "#src/store";
import type { TabsProps } from "antd";

import { useCurrentRoute } from "#src/hooks";
import { removeTrailingSlash } from "#src/router/utils";
import { useAccessStore, usePreferencesStore, useTabsStore } from "#src/store";
import { isString } from "#src/utils";

import { RedoOutlined } from "@ant-design/icons";
import { Button, Tabs } from "antd";
import { clsx } from "clsx";
import { isValidElement, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";

import { tabbarHeight } from "../constants";
import { DraggableTabBar } from "./components/draggable-tab-bar";
import { TabMaximize } from "./components/tab-maximize";
import { TabOptions } from "./components/tab-options";
import { TabActionKeys, useDropdownMenu } from "./hooks/use-dropdown-menu";
import { useStyles } from "./style";

/**
 * کامپوننت LayoutTabbar
 * براي رندر و مديريت ناوبري تب هاي برنامه
 */
export default function LayoutTabbar() {
	// const { token } = theme.useToken();
	const classes = useStyles();
	const navigate = useNavigate();
	const location = useLocation();
	const { t } = useTranslation();
	const currentRoute = useCurrentRoute();

	const { tabbarStyleType, tabbarShowMaximize, tabbarShowMore } = usePreferencesStore();
	const { flatRouteList } = useAccessStore();
	const { activeKey, isRefresh, setActiveKey, setIsRefresh, openTabs, addTab, insertBeforeTab } = useTabsStore();
	const [items, onClickMenu] = useDropdownMenu();

	const tabItems: TabItemProps[] = Array.from(openTabs.values()).map((item) => {
		const tabLabel = item.newTabTitle ?? item.label;
		return {
			...item,
			label: (
				<div className="relative flex items-center gap-1">
					{isString(tabLabel) ? t(tabLabel) : tabLabel}
				</div>
			),
		};
	});

	/**
	 * بازنشاني خودکار وضعيت رفرش
	 */
	useEffect(() => {
		if (isRefresh) {
			const timer = setTimeout(() => {
				setIsRefresh(false);
			}, 500);

			return () => clearTimeout(timer);
		}
	}, [isRefresh, setIsRefresh]);

	/**
	 * رسيدگي به تغيير تب
	 * @param {string} key - کليد تب انتخاب شده
	 */
	const handleChangeTabs = useCallback((key: string) => {
		const historyState = openTabs.get(key)?.historyState || { search: "", hash: "" };
		navigate(key + historyState.search + historyState.hash);
	}, [openTabs]);

	/**
	 * رسيدگي به ويرايش تب (بستن)
	 * @param {React.MouseEvent | React.KeyboardEvent | string} key - کليد تب ويرايش شده
	 * @param {string} action - عمل ويرايش، فقط "remove"
	 */
	const handleEditTabs = useCallback<Required<TabsProps>["onEdit"]>((key, action) => {
		if (action === "remove") {
			onClickMenu(TabActionKeys.CLOSE, key as string);
		}
	}, [onClickMenu]);

	/**
	 * رندر سفارشي نوار تب و افزودن منوي راست کليک
	 * @param {object} tabBarProps - ويژگي هاي نوار تب
	 * @param {React.ComponentType} DefaultTabBar - کامپوننت پيش فرض نوار تب
	 * @returns {JSX.Element} نوار تب رندر شده
	 */
	const renderTabBar = useCallback<Required<TabsProps>["renderTabBar"]>((tabBarProps, DefaultTabBar) => {
		return (
			<DraggableTabBar
				DefaultTabBar={DefaultTabBar}
				tabBarProps={tabBarProps}
				items={items}
				tabItems={tabItems}
				onClickMenu={onClickMenu}
			/>
		);
	}, [tabItems, items, onClickMenu]);

	/**
	 * توليد محتواي اضافه نوار تب
	 */
	const tabBarExtraContent = useMemo(() => ({
		right: (
			<div className="flex items-center" style={{ height: tabbarHeight }}>
				<Button
					icon={(
						<RedoOutlined
							rotate={270}
							className={clsx({ "animate-spin": isRefresh })}
						/>
					)}
					size="middle"
					type="text"
					className={clsx("rounded-none h-full border-l  border-l-colorBorderSecondary")}
					onClick={() => onClickMenu(TabActionKeys.REFRESH, activeKey)}
				/>
				{tabbarShowMaximize ? (<TabMaximize className="h-full border-l rounded-none border-l-colorBorderSecondary" />) : null}
				{tabbarShowMore ? (<TabOptions activeKey={activeKey} className="h-full border-l rtl:border-l-0 rounded-none border-l-colorBorderSecondary" />) : null}
			</div>
		),
	}), [isRefresh, activeKey, onClickMenu, tabbarShowMore, tabbarShowMaximize]);

	/**
	 * اگر تب فعال بسته شود، به مسير مناسب برو
	 *
	 * هشدار: به جز ورود اوليه (مثلا لاگين)، در پروژه از navigate(import.meta.env.VITE_BASE_HOME_PATH)
	 * به جاي navigate("/") استفاده کنيد، دلايل:
	 * 1. ناوبري به "/" باعث رندر مجدد کامپوننت ريشه مي شود
	 * 2. اين کامپوننت تغييرات location را درست گوش نمي دهد
	 * 3. وضعيت activeKey روي تب قبلي مي ماند (نمايش نادرست)
	 * 4. location.pathname جديد است اما activeKey همان قبلي، که باعث ناوبري اشتباه مي شود
	 */
	useEffect(() => {
		/**
		 * اعمال زير باعث بسته شدن تب فعال مي شود:
		 * 1. بستن تب فعلي
		 * 2. استفاده از بستن چپ/راست/ساير/همه، که تب فعال را مي بندد
		 *
		 * در اين حالت activeKey جديد است اما location.pathname هنوز به روز نشده؛
		 * با navigate به تب فعال جديد برو تا نمايش درست بماند.
		 *
		 * در ورود اوليه، activeKey خالي است و ناوبري خودکار انجام نمي شود
		 */
		const historyState = openTabs.get(activeKey)?.historyState || { search: "", hash: "" };
		const activeFullPath = activeKey + historyState.search + historyState.hash;
		const currentFullpath = location.pathname + location.search + location.hash;
		if (activeKey.length > 0 && activeFullPath !== currentFullpath) {
			navigate(activeFullPath);
		}
	}, [activeKey]);

	/**
	 * اگر کاربر صفحه را رفرش کرد و تب پيش فرض نبود، تب پيش فرض را اضافه کن
	 */
	useEffect(() => {
		// بررسي نبودن تب پيش فرض
		const isDefaultTabMissing = !Array.from(openTabs.keys()).includes(import.meta.env.VITE_BASE_HOME_PATH);

		if (isDefaultTabMissing) {
			const routeTitle = flatRouteList[import.meta.env.VITE_BASE_HOME_PATH]?.handle?.title;
			insertBeforeTab(import.meta.env.VITE_BASE_HOME_PATH, {
				key: import.meta.env.VITE_BASE_HOME_PATH,
				label: isValidElement(routeTitle) ? routeTitle?.props?.children : routeTitle,
				closable: false,
				draggable: false,
			});
		}
	}, [openTabs, insertBeforeTab, flatRouteList]);

	/**
	 * گوش دادن به تغيير مسير، افزودن تب و فعال سازي تب
	 */
	useEffect(() => {
		const activePath = location.pathname;
		const normalizedPath = removeTrailingSlash(activePath);
		// tabbarEnable باعث mount/unmount مي شود؛ اگر normalizedPath با activeKey برابر است از addTab تکراري جلوگيري کن
		if (normalizedPath !== activeKey) {
			setActiveKey(normalizedPath);

			const routeTitle = currentRoute.handle?.title;

			addTab(normalizedPath, {
				key: normalizedPath,
				// label را string کن تا در sessionStorage ذخيره شود
				label: isValidElement(routeTitle) ? routeTitle?.props?.children : routeTitle,
				historyState: { search: location.search, hash: location.hash },
				/* مسير پيش فرض بعد از ورود قابل بستن و درگ نيست */
				closable: normalizedPath !== import.meta.env.VITE_BASE_HOME_PATH,
				draggable: normalizedPath !== import.meta.env.VITE_BASE_HOME_PATH,
			});
		}
	}, [location, currentRoute, setActiveKey, addTab]);

	return (
		<div className={classes.tabsContainer}>
			<Tabs
				className={clsx(
					classes.resetTabs,
					tabbarStyleType === "brisk" ? classes.brisk : "",
					tabbarStyleType === "plain" ? classes.plain : "",
					tabbarStyleType === "chrome" ? classes.chrome : "",
					tabbarStyleType === "card" ? classes.card : "",
				)}
				size="small"
				hideAdd
				animated
				onChange={handleChangeTabs}
				activeKey={removeTrailingSlash(activeKey)}
				type="editable-card"
				onEdit={handleEditTabs}
				items={tabItems}
				renderTabBar={renderTabBar}
				tabBarExtraContent={tabBarExtraContent}
			/>
		</div>
	);
}
