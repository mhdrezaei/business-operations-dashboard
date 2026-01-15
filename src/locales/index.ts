import type { InitOptions } from "i18next";

import deDE from "antd/locale/de_DE";
import enUS from "antd/locale/en_US";
import faIR from "antd/locale/fa_IR";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import { getDeDeLang, getEnUsLang, getFaIrLang } from "./helper";

export * from "./t";

export type LanguageType = "de-DE" | "en-US" | "fa-IR";

export const ANT_DESIGN_LOCALE = {
	"de-DE": deDE,
	"en-US": enUS,
	"fa-IR": faIR,
};

export const i18nResources = {
	"de-DE": {
		translation: getDeDeLang(),
	},
	"en-US": {
		translation: getEnUsLang(),
	},
	"fa-IR": {
		translation: getFaIrLang(),
	},
};

export const i18nInitOptions: InitOptions = {
	// اگر می‌خوای پیش‌فرض آلمانی باشد:
	lng: "fa-IR",
	// اگر می‌خوای پیش‌فرض انگلیسی باشد، این خط را "en-US" کن
	resources: i18nResources,
	saveMissing: import.meta.env.DEV,
	missingKeyHandler: async (languages, namespace, translationKey) => {
		if (import.meta.env.PROD)
			return;

		const currentLanguage = i18next.language;

		if (!["404"].includes(translationKey) && import.meta.env.DEV) {
			console.warn(
				`[i18n] Not found '${translationKey}' key in '${currentLanguage}' locale messages.`,
			);
		}
	},
};

export const i18n = i18next.use(initReactI18next);

export function setupI18n() {
	i18n.init(i18nInitOptions);

	i18next.on("languageChanged", (lng) => {
		document.documentElement.lang = lng;

		// RTL فقط برای فارسی
		if (lng === "fa-IR")
			document.documentElement.dir = "rtl";
		else document.documentElement.dir = "ltr";
	});
}
