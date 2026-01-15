import type { TabPaneProps } from "antd";

import { usePreferencesStore } from "#src/store/preferences";
import { getAppNamespace } from "#src/utils";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * @fa رابط ويژگي هاي آيتم تب
 * @en Tab item properties interface.
 */
export interface TabItemProps extends Omit<TabPaneProps, "tab"> {
	key: string
	label: React.ReactNode
	/**
	 * @fa آيا قابل درگ است
	 * @en Whether it can be dragged.
	 */
	draggable?: boolean
	/**
	 * مقدار وضعيت تاريخچه مانند search و hash را مي توان اينجا نگه داشت.
	 * در مسير مقصد از hook useLocation به آن دسترسي داريد.
	 * @see {@link https://reactrouter.com/en/main/hooks/use-navigate#optionsstate | usenavigate - options state}
	 */
	historyState?: Record<string, any>
}

export interface TabStateType extends Omit<TabItemProps, "label"> {
	label: string
	/**
	 * @fa عنوان جديد تب براي تغيير عنوان
	 * @en The new title of the tab, used to modify the title of the tab.
	 */
	newTabTitle?: React.ReactNode
}

/**
 * @fa وضعيت اوليه
 * @en Initial state.
 */
const initialState = {
	/**
	 * @fa مجموعه تب ها
	 * @en Tab collection.
	 */
	openTabs: new Map<string, TabStateType>([]),
	/**
	 * @fa تب فعال فعلي
	 * @en The currently active tab.
	 */
	activeKey: "",
	/**
	 * @fa آيا تب در حالت رفرش است
	 * @en Whether it is in a refresh state.
	 */
	isRefresh: false,
	/**
	 * @fa آيا تب در حالت بيشينه است
	 * @en Whether the tab is maximized.
	 */
	isMaximize: false,
};

type TabsState = typeof initialState;

/**
 * @fa متدهاي عمليات تب
 * @en Tab operation methods.
 */
interface TabsAction {
	setIsRefresh: (state: boolean) => void
	addTab: (routePath: string, tabProps: TabStateType) => void
	insertBeforeTab: (routePath: string, tabProps: TabStateType) => void
	removeTab: (routePath: string) => void
	closeRightTabs: (routePath: string) => void
	closeLeftTabs: (routePath: string) => void
	closeOtherTabs: (routePath: string) => void
	closeAllTabs: () => void
	setActiveKey: (routePath: string) => void
	resetTabs: () => void
	changeTabOrder: (from: number, to: number) => void
	toggleMaximize: (state: boolean) => void
	setTableTitle: (routePath: string, title: string) => void
	resetTableTitle: (routePath: string) => void
};

/**
 * @fa مديريت وضعيت تب ها
 * @en Tab state management.
 */
export const useTabsStore = create<TabsState & TabsAction>()(
	persist(
		set => ({
			...initialState,

			/**
			 * @fa تنظيم وضعيت رفرش تب
			 * @en Set whether the tab is in a refresh state.
			 */
			setIsRefresh: (state: boolean) => {
				set({ isRefresh: state });
			},

			/**
			 * @fa تنظيم تب فعال
			 * @en Set the tab.
			 */
			setActiveKey: (routePath: string) => {
				set({ activeKey: routePath });
			},

			/**
			 * @fa درج تب در ابتدا
			 * @en Insert a tab at the front.
			 */
			insertBeforeTab: (routePath: string, tabProps: TabStateType) => {
				set((state) => {
					if (routePath.length) {
						const newMap = new Map([[routePath, tabProps]]);
						for (const [key, value] of state.openTabs) {
							newMap.set(key, value);
						}
						return { openTabs: newMap };
					}
					return state;
				});
			},

			/**
			 * @fa افزودن تب
			 * @en Add a tab.
			 */
			addTab: (routePath: string, tabProps: TabStateType) => {
				set((state) => {
					if (routePath.length) {
						const newTabs = new Map(state.openTabs);
						/**
						 * 1. اگر تب وجود دارد، historyState به روز مي شود، پس حذف تکراري نمي کنيم؛
						 *    ...newTabs.get(routePath) براي حفظ closable تب خانه است.
						 * 2. اگر تب وجود ندارد، به Map اضافه مي شود.
						 */
						newTabs.set(routePath, { ...newTabs.get(routePath), ...tabProps });
						return { openTabs: newTabs };
					}
					return state;
				});
			},

			/**
			 * @fa حذف تب
			 * @en Remove a tab.
			 */
			removeTab: (routePath: string) => {
				set((state) => {
					const homePath = import.meta.env.VITE_BASE_HOME_PATH;

					// اگر صفحه خانه است، بستن مجاز نيست
					if (routePath === homePath) {
						return state;
					}

					const newTabs = new Map(state.openTabs);
					newTabs.delete(routePath);
					let newActiveKey = state.activeKey;

					// اگر تب فعال حذف شد، آخرين تب را فعال کن
					if (routePath === state.activeKey) {
						const tabsArray = Array.from(newTabs.keys());
						newActiveKey = tabsArray.at(-1) || homePath;
					}

					// حداقل تب خانه حفظ شود
					if (newTabs.size === 0) {
						newTabs.set(homePath, state.openTabs.get(homePath)!);
						newActiveKey = homePath;
					}

					return { openTabs: newTabs, activeKey: newActiveKey };
				});
			},

			/**
			 * @fa بستن تب هاي سمت راست
			 * @en Close tabs on the right.
			 */
			closeRightTabs: (routePath: string) => {
				set((state) => {
					const newTabs = new Map();
					let found = false;
					let activeKeyFound = false;
					let newActiveKey = state.activeKey;

					// پيمایش همه تب ها
					for (const [key, value] of state.openTabs) {
						// اگر مسير پيدا شد، توقف
						if (found) {
							break;
						}
						// افزودن تب فعلي به Map جديد
						newTabs.set(key, value);
						// اگر key برابر مسير بود، پيدا شد
						if (key === routePath) {
							found = true;
						}
						// اگر key برابر تب فعال بود، activeKey پيدا شد
						if (key === state.activeKey) {
							activeKeyFound = true;
						}
					}

					// اگر تب فعال بسته شد، تب فعال جديد همان مسير است
					if (!activeKeyFound) {
						newActiveKey = routePath;
					}

					// بازگرداندن وضعيت به روز شده
					return { openTabs: newTabs, activeKey: newActiveKey };
				});
			},

			/**
			 * @fa بستن تب هاي سمت چپ
			 * @en Close tabs on the left.
			 */
			closeLeftTabs: (routePath: string) => {
				set((state) => {
					const newTabs = new Map();
					const homePath = import.meta.env.VITE_BASE_HOME_PATH;
					let found = false;
					let newActiveKey = state.activeKey;
					let activeKeyOnRight = false;

					// ابتدا تب خانه را اضافه کن چون قابل حذف نيست
					newTabs.set(homePath, state.openTabs.get(homePath)!);

					// پيمایش همه تب ها
					for (const [key, value] of state.openTabs) {
						if (key === homePath)
							continue; // تب خانه قبلا اضافه شده

						if (found || key === routePath) {
							newTabs.set(key, value);
							found = true;
						}

						if (key === state.activeKey && found) {
							activeKeyOnRight = true;
						}
					}

					// اگر تب فعال در سمت چپ بسته شد، تب فعال جديد همان مسير است
					if (!activeKeyOnRight) {
						newActiveKey = routePath;
					}

					// بازگرداندن وضعيت به روز شده
					return { openTabs: newTabs, activeKey: newActiveKey };
				});
			},

			/**
			 * @fa بستن ساير تب ها
			 * @en Close other tabs.
			 */
			closeOtherTabs: (routePath: string) => {
				set((state) => {
					const newTabs = new Map();
					const homePath = import.meta.env.VITE_BASE_HOME_PATH;

					// نگه داشتن تب خانه
					newTabs.set(homePath, state.openTabs.get(homePath)!);

					// نگه داشتن تب مشخص
					if (routePath !== homePath && state.openTabs.has(routePath)) {
						newTabs.set(routePath, state.openTabs.get(routePath)!);
					}

					// به روزرساني تب فعال
					let newActiveKey = state.activeKey;
					if (!newTabs.has(state.activeKey)) {
						newActiveKey = routePath;
					}

					return { openTabs: newTabs, activeKey: newActiveKey };
				});
			},

			/**
			 * @fa بستن همه تب ها
			 * @en Close all tabs.
			 */
			closeAllTabs: () => {
				set((state) => {
					const newTabs = new Map();
					const homePath = import.meta.env.VITE_BASE_HOME_PATH;
					newTabs.set(homePath, state.openTabs.get(homePath)!);
					return { openTabs: newTabs, activeKey: homePath };
				});
			},

			/**
			 * @fa تغيير ترتيب تب ها
			 * @en Change tab order.
			 */
			changeTabOrder: (from: number, to: number) => {
				set((state) => {
					// مي توان از import { arrayMove } from "@dnd-kit/sortable"; هم استفاده کرد
					const newTabs = Array.from(state.openTabs.entries());
					const [movedTab] = newTabs.splice(from, 1); // گرفتن تب جابجا شده
					newTabs.splice(to, 0, movedTab); // درج در جايگاه جديد

					const newOpenTabs = new Map(newTabs); // استفاده مستقيم از Map
					return { openTabs: newOpenTabs };
				});
			},

			/**
			 * @fa تغيير وضعيت بيشينه تب
			 * @en Toggle tab maximization status
			 * @param {boolean} state - وضعيت بيشينه
			 */
			toggleMaximize: (state: boolean) => {
				set({ isMaximize: state });
			},

			/**
			 * @fa تنظيم عنوان تب
			 * @en Set the tab title
			 */
			setTableTitle: (routePath: string, title: React.ReactNode) => {
				set((state) => {
					const newTabs = new Map(state.openTabs);
					const targetTab = newTabs.get(routePath);
					if (targetTab) {
						targetTab.newTabTitle = title;
						newTabs.set(routePath, targetTab);
						return { openTabs: newTabs };
					}
					return state;
				});
			},

			/**
			 * @fa بازنشاني عنوان تب (حذف عنوان سفارشي)
			 * @en Reset the tab title (delete custom titles)
			 */
			resetTableTitle: (routePath: string) => {
				set((state) => {
					const newTabs = new Map(state.openTabs);
					const targetTab = newTabs.get(routePath);
					if (targetTab) {
						delete targetTab.newTabTitle;
						newTabs.set(routePath, targetTab);
						return { openTabs: newTabs };
					}
					return state;
				});
			},

			/**
			 * @fa بازنشاني همه وضعيت هاي تب
			 * @en Reset all tab states
			 */
			resetTabs: () => {
				set(() => {
					return { ...initialState };
				});
			},

		}),
		{
			name: getAppNamespace("tabbar"),
			/**
			 * activeKey نيازي به ذخيره پايدار ندارد
			 *
			 * فرض کنيد مسير صفحه /home است
			 * به صورت دستي /about را در نوار آدرس وارد مي کنيد
			 * activeKey همچنان /home مي ماند و ناوبري خودکار از کار مي افتد
			 * @see https://github.com/condorheroblog/react-antd-admin/issues/1
			 */
			partialize: (state) => {
				return Object.fromEntries(
					Object.entries(state).filter(([key]) => !["activeKey"].includes(key)),
				);
			},
			/**
			 * openTabs يک Map است و ذخيره پايدار نياز به مديريت دستي دارد
			 * How do I use it with Map and Set
			 * @see https://github.com/pmndrs/zustand/blob/v5.0.1/docs/integrations/persisting-store-data.md#how-do-i-use-it-with-map-and-set
			 */
			storage: {
				getItem: (name) => {
					const str = sessionStorage.getItem(name);
					// اگر ذخيره پايدار فعال نباشد، در ورود اوليه null برگردان
					const isPersist = usePreferencesStore.getState().tabbarPersist;
					if (!str || !isPersist)
						return null;
					const existingValue = JSON.parse(str);
					return {
						...existingValue,
						state: {
							...existingValue.state,
							openTabs: new Map(existingValue.state.openTabs),
						},
					};
				},
				setItem: (name, newValue) => {
					// functions cannot be JSON encoded
					const str = JSON.stringify({
						...newValue,
						state: {
							...newValue.state,
							openTabs: Array.from(newValue.state.openTabs.entries()),
						},
					});
					sessionStorage.setItem(name, str);
				},
				removeItem: name => sessionStorage.removeItem(name),
			},
		},
	),

);
