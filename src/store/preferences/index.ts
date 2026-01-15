import type { LanguageType } from "#src/locales";
import type { PreferencesState, ThemeType } from "./types";

import { SIDE_NAVIGATION } from "#src/layout/widgets/preferences/blocks/layout/constants";
import { getAppNamespace } from "#src/utils";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * تنظيمات پيش فرض
 */
export const DEFAULT_PREFERENCES = {
	/* ================== General ================== */
	watermark: false,
	watermarkContent: "react-antd-admin",
	enableBackTopButton: true,
	pageLayout: "layout-right",
	enableBackendAccess: true,
	enableFrontendAceess: false,
	language: "fa-IR",
	enableDynamicTitle: true,
	enableCheckUpdates: true,
	checkUpdatesInterval: 1,

	/* ================== Theme ================== */
	theme: "auto",
	colorBlindMode: false,
	colorGrayMode: false,
	themeRadius: 6,
	builtinTheme: "blue",
	themeColorPrimary: "#1677ff",

	/* ================== Animation ================== */
	transitionProgress: true,
	transitionLoading: true,
	transitionEnable: true,
	transitionName: "fade-slide",

	/* ================== Layout ================== */
	navigationStyle: SIDE_NAVIGATION,
	headerBackgroundType: "default",
	headerBackgroundColor: "#1677ff",
	headerHeight: 56,

	/* ================== Tabbar ================== */
	tabbarEnable: true,
	tabbarShowIcon: true,
	tabbarPersist: true,
	tabbarDraggable: true,
	tabbarStyleType: "chrome",
	tabbarShowMore: true,
	tabbarShowMaximize: true,

	/* ================== Sidebar ================== */
	sidebarEnable: true,
	sidebarWidth: 240,
	sideCollapsedWidth: 56,
	sidebarCollapsed: false,
	sidebarCollapseShowTitle: true,
	sidebarExtraCollapsedWidth: 48,
	firstColumnWidthInTwoColumnNavigation: 80,
	sidebarTheme: "light",
	accordion: true,

	/* ================== Footer ================== */
	enableFooter: true,
	fixedFooter: true,
	companyName: "Data Processor Panel",
	companyWebsite: "https:/karashab-co.ir",
	copyrightDate: "2026",
	ICPNumber: "",
	ICPLink: "",
} satisfies PreferencesState;

/**
 * رابط عمليات تنظيمات
 */
interface PreferencesAction {
	reset: () => void
	changeSiteTheme: (theme: ThemeType) => void
	changeLanguage: (language: LanguageType) => void
	setPreferences: {
		// به روزرساني تک key-value
		<T>(key: string, value: T): void
		// به روزرساني دسته اي با شيء
		<T extends Partial<PreferencesState>>(preferences: T): void
	}
}

/**
 * مديريت وضعيت تنظيمات
 */
export const usePreferencesStore = create<
	PreferencesState & PreferencesAction
>()(
	persist(
		set => ({
			...DEFAULT_PREFERENCES,

			/**
			 * به روزرساني تنظيمات
			 */
			setPreferences: (...args: any[]) => {
				if (args.length === 1) {
					const preferences = args[0];
					set(() => {
						return { ...preferences };
					});
				}
				else if (args.length === 2) {
					const [key, value] = args;
					set(() => {
						return { [key]: value };
					});
				}
			},

			/**
			 * به روزرساني تم
			 */
			changeSiteTheme: (theme) => {
				set(() => {
					return { theme };
				});
			},

			/**
			 * به روزرساني زبان
			 */
			changeLanguage: (language) => {
				set(() => {
					return { language };
				});
			},

			/**
			 * بازنشاني وضعيت
			 */
			reset: () => {
				set(() => {
					return { ...DEFAULT_PREFERENCES };
				});
			},
		}),
		{ name: getAppNamespace("preferences") },
	),
);
