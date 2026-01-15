import type { TFunction } from "i18next";

export function getContractTypeOptions(t: TFunction<"translation", undefined>) {
	return [
		{
			label: t("system.menu.menu"),
			value: 0,
		},
		{
			label: t("system.menu.iframe"),
			value: 1,
		},
		{
			label: t("system.menu.externalLink"),
			value: 2,
		},
		{
			label: t("system.menu.button"),
			value: 3,
		},
	];
}
export function getMonthTypeOptions(t: TFunction<"translation", undefined>) {
	return [
		{
			label: t("system.menu.menu"),
			value: 0,
		},
		{
			label: t("system.menu.iframe"),
			value: 1,
		},
		{
			label: t("system.menu.externalLink"),
			value: 2,
		},
		{
			label: t("system.menu.button"),
			value: 3,
		},
	];
}
export function getYearTypeOptions() {
	return [
		{
			label: 1401,
			value: 1401,
		},
		{
			label: 1402,
			value: 1402,
		},
		{
			label: 1403,
			value: 1403,
		},
		{
			label: 1404,
			value: 1404,
		},
	];
}
