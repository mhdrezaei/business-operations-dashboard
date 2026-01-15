/**
 * بررسي مي کند آيا تم فعلي روشن است
 *
 * @param theme نوع تم، مي تواند "light"(روشن)، "dark"(تيره) يا "auto"(خودکار) باشد
 * @returns اگر تم روشن است true، در غير اين صورت false
 */
export function isLightTheme(theme: string) {
	let light = theme === "light";
	if (theme === "auto") {
		light = window.matchMedia("(prefers-color-scheme: light)").matches;
	}
	return light;
}
