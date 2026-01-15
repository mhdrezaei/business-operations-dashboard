/**
 * بررسي مي کند آيا تم فعلي تيره است
 *
 * @param theme نوع تم، مي تواند "dark"(تيره)، "light"(روشن) يا "auto"(خودکار) باشد
 * @returns اگر تم تيره است true، در غير اين صورت false
 */
export function isDarkTheme(theme: string) {
	let dark = theme === "dark";
	if (theme === "auto") {
		dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	}
	return dark;
}
