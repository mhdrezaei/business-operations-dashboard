import type { GlobalToken } from "antd";
import { baseColorPalettes, neutralColors, prefix, productLevelColorSystem } from "./constants";

/**
 * تبديل رنگ هگز به RGB، چون هگز در tailwind شفافيت را پشتيباني نمي کند، مثل bg-blue-500/20
 * @see https://tailwindcss.com/docs/customizing-colors#using-css-variables
 */
export function hexToRGB(hex: string) {
	// حذف علامت # در صورت وجود
	hex = hex.replace("#", "");

	// گرفتن مقادير R، G، B
	const r = Number.parseInt(hex.substring(0, 2), 16);
	const g = Number.parseInt(hex.substring(2, 4), 16);
	const b = Number.parseInt(hex.substring(4, 6), 16);

	return `${r} ${g} ${b}`;
}

// بررسي اينکه مقدار رنگ RGB است
export function isRGBColor(color: string) {
	return color.trim().startsWith("rgb");
}

export function getCSSVariablesByTokens(tokens: GlobalToken) {
	return Object.entries(tokens)
		.reduce((acc, [key, value]): string => {
			// رنگ هاي عملکردي، بدون رنگ هاي خنثي
			if (productLevelColorSystem.includes(key)) {
				const rgb = hexToRGB(value);
				return `${acc}--${prefix}-${key}:${rgb};`;
			}

			// رنگ هاي خنثي
			if (neutralColors.includes(key)) {
				// اگر مقدار رنگ rgb بود، مستقيم استفاده کن
				const rgb = isRGBColor(value) ? value : `rgb(${hexToRGB(value)})`;
				return `${acc}--${prefix}-${key}:${rgb};`;
			}
			// پالت
			return baseColorPalettes.includes(key) ? `${acc}--${prefix}-${key}:${hexToRGB(value)};` : acc;
		}, "");
}
