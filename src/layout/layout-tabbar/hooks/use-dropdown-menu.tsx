import type { MenuProps } from "antd";
import { useTabsStore } from "#src/store";
import {
	CloseOutlined,
	RedoOutlined,
	SwapOutlined,
	VerticalAlignBottomOutlined,
	VerticalAlignMiddleOutlined,
	VerticalAlignTopOutlined,
} from "@ant-design/icons";
import { useKeepAliveContext } from "keepalive-for-react";
import { useCallback, useMemo } from "react";

import { useTranslation } from "react-i18next";

const homePath = import.meta.env.VITE_BASE_HOME_PATH;
/**
 * شيء کليدهاي عمليات تب
 * @readonly
 * @enum {string}
 * @property {string} REFRESH - بازخواني تب فعلي
 * @property {string} CLOSE - بستن تب فعلي
 * @property {string} CLOSE_RIGHT - بستن تب هاي سمت راست
 * @property {string} CLOSE_LEFT - بستن تب هاي سمت چپ
 * @property {string} CLOSE_OTHERS - بستن ساير تب ها
 * @property {string} CLOSE_ALL - بستن همه تب ها
 */
export const TabActionKeys = {
	REFRESH: "refresh",
	CLOSE: "close",
	CLOSE_RIGHT: "closeRight",
	CLOSE_LEFT: "closeLeft",
	CLOSE_OTHERS: "closeOthers",
	CLOSE_ALL: "closeAll",
} as const;

export type TabActionKey = typeof TabActionKeys[keyof typeof TabActionKeys];

/**
 * هوک سفارشي براي منوي کشويي تب ها
 * @returns {[Function, Function]} يک تاپل شامل سازنده آيتم هاي منو و هندلر کليک
 */
export function useDropdownMenu() {
	const { t } = useTranslation();
	const {
		openTabs,
		activeKey,
		removeTab,
		closeLeftTabs,
		closeRightTabs,
		closeOtherTabs,
		closeAllTabs,
		setIsRefresh,
	} = useTabsStore();
	const { refresh } = useKeepAliveContext();
	/**
	 * توليد آيتم هاي منو
	 * @param {string} tabKey - کليد تب فعلي
	 * @returns {MenuProps["items"]} پیکربندي آيتم هاي منو
	 */
	const items = useCallback((tabKey: string): MenuProps["items"] => {
		const isOnlyTab = openTabs.size === 2 && openTabs.has(homePath);
		const isLastTab = Array.from(openTabs.keys()).pop() === tabKey;
		return [
			{
				key: TabActionKeys.REFRESH,
				icon: <RedoOutlined rotate={270} />,
				label: t("preferences.tabbar.contextMenu.refresh"),
				disabled: activeKey !== tabKey,
			},
			{
				key: TabActionKeys.CLOSE,
				icon: <CloseOutlined />,
				label: t("preferences.tabbar.contextMenu.close"),
				disabled: tabKey === homePath,
			},
			{ type: "divider" },
			{
				key: TabActionKeys.CLOSE_LEFT,
				icon: <VerticalAlignBottomOutlined rotate={90} />,
				label: t("preferences.tabbar.contextMenu.closeLeft"),
				disabled: tabKey === homePath || isOnlyTab,
			},
			{
				key: TabActionKeys.CLOSE_RIGHT,
				icon: <VerticalAlignTopOutlined rotate={90} />,
				label: t("preferences.tabbar.contextMenu.closeRight"),
				disabled: tabKey === homePath || isOnlyTab || isLastTab,
			},
			{ type: "divider" },
			{
				key: TabActionKeys.CLOSE_OTHERS,
				icon: <VerticalAlignMiddleOutlined rotate={90} />,
				label: t("preferences.tabbar.contextMenu.closeOthers"),
				disabled: tabKey === homePath || isOnlyTab,
			},
			{
				key: TabActionKeys.CLOSE_ALL,
				icon: <SwapOutlined />,
				label: t("preferences.tabbar.contextMenu.closeAll"),
				disabled: tabKey === homePath,
			},
		];
	}, [t, activeKey, homePath, openTabs]);

	/**
	 * تعريف عمليات منو و توابع متناظر
	 */
	const actions = useMemo(() => ({
		[TabActionKeys.REFRESH]: (currentPath: string) => {
			// بازخواني صفحه کش شده KeepAlive
			refresh(currentPath);
			// رندر مجدد صفحه
			setIsRefresh(true);
		},
		[TabActionKeys.CLOSE]: removeTab,
		[TabActionKeys.CLOSE_RIGHT]: closeRightTabs,
		[TabActionKeys.CLOSE_LEFT]: closeLeftTabs,
		[TabActionKeys.CLOSE_OTHERS]: closeOtherTabs,
		[TabActionKeys.CLOSE_ALL]: closeAllTabs,
	}), [removeTab, closeRightTabs, closeLeftTabs, closeOtherTabs, closeAllTabs]);

	/**
	 * پردازش کليک منو
	 * @param {string} menuKey - کليد آيتم منوي کليک شده
	 * @param {string} nodeKey - کليد تب فعلي
	 */
	const onClickMenu = useCallback((menuKey: string, nodeKey: string) => {
		const action = actions[menuKey as keyof typeof actions];
		if (action) {
			action(nodeKey);
		}
	}, [actions]);

	return [items, onClickMenu] as const;
}
