// import type { TFunction } from "i18next";

export const getLanguageItems: () => any = (
	// t: TFunction<"translation", undefined>,
) => {
	return [
		{
			label: "Deutsch",
			// Menu
			key: "de-DE",
			// Select
			value: "de-DE",
		},
		{
			label: "English",
			// Menu
			key: "en-US",
			// Select
			value: "en-US",
		},
		{
			label: "فارسی",
			// Menu
			key: "fa-IR",
			// Select
			value: "fa-IR",
		},
	];
};
