import { colorPaletteNumbers, colors, neutralColorPalettes, neutralColors, productLevelColorSystem } from "#src/components/antd-app/constants";
import { hexToRGB } from "#src/components/antd-app/utils";

/**
 * @fa متغيرهاي رنگ antd را جايگزين متغيرهاي رنگ tailwind.css مي کند
 * @en Override the color variables in tailwind.css with antd's color variables.
 */
function createColorPalettes() {
	const colorPaletteVar: Record<string, string> = {
		transparent: "transparent",
		inherit: "inherit",
		current: "currentColor",
		white: "rgb(255 255 255)",
		black: "rgb(0 0 0)",
	};

	/**
	 * @fa پالت رنگ هاي پايه
	 * @en Base color palette
	 * @see https://ant.design/docs/spec/colors#base-color-palettes
	 */
	colors.forEach((color) => {
		colorPaletteNumbers.forEach((number, index) => {
			const colorCount = index === 0 ? "" : `-${index}`;
			colorPaletteVar[`${color}-${number}`] = `rgb(var(--oo-${color}${colorCount}))`;
		});
	});

	/**
	 * @fa پالت رنگ هاي خنثي
	 * @en Neutral color palette
	 * @see https://ant.design/docs/spec/colors#neutral-color-palette
	 */
	colorPaletteNumbers.forEach((number, index) => {
		const rgb = hexToRGB(neutralColorPalettes[index]);
		colorPaletteVar[`gray-${number}`] = `rgb(${rgb})`;
	});

	/**
	 * @fa سيستم رنگ هاي سطح محصول
	 * @en Product level color system
	 */
	productLevelColorSystem.forEach((key) => {
		const keyName = key.replace("color", "");
		const camelCaseName = keyName.charAt(0).toLowerCase() + keyName.slice(1);
		colorPaletteVar[camelCaseName] = `rgb(var(--oo-${key}))`;
	});

	/**
	 * @fa رنگ هاي خنثي
	 * @en Neutrals
	 */
	neutralColors.forEach((key) => {
		// اين key مستقيما مقدار رنگ با تابع rgb باشد
		colorPaletteVar[key] = `var(--oo-${key})`;
	});

	return colorPaletteVar;
}

export const getColorPalettes = createColorPalettes();
