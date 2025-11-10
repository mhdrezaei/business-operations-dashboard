import type { HeaderBackgroundType } from "#src/store/preferences/types";
import type { ColorPickerProps } from "antd";

import { usePreferencesStore } from "#src/store";
import { cn } from "#src/utils";

import { ColorPicker } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function HeaderBackground() {
	const {
		headerBackgroundType,
		headerBackgroundColor,
		setPreferences,
	} = usePreferencesStore();
	const [color, setColor] = useState(headerBackgroundType === "custom" ? headerBackgroundColor : "#1677ff");
	const { t } = useTranslation();

	const headerBackgroundPresets = [
		{
			label: t("preferences.layout.headerBackground.default"),
			value: "default",
			color: "transparent",
		},
		{
			label: t("preferences.layout.headerBackground.red"),
			value: "red",
			color: "#f5222d",
		},
		{
			label: t("preferences.layout.headerBackground.volcano"),
			value: "volcano",
			color: "#fa541c",
		},
		{
			label: t("preferences.layout.headerBackground.orange"),
			value: "orange",
			color: "#fa8c16",
		},
		{
			label: t("preferences.layout.headerBackground.gold"),
			value: "gold",
			color: "#faad14",
		},
		{
			label: t("preferences.layout.headerBackground.yellow"),
			value: "yellow",
			color: "#fadb14",
		},
		{
			label: t("preferences.layout.headerBackground.lime"),
			value: "lime",
			color: "#a0d911",
		},
		{
			label: t("preferences.layout.headerBackground.green"),
			value: "green",
			color: "#52c41a",
		},
		{
			label: t("preferences.layout.headerBackground.cyan"),
			value: "cyan",
			color: "#13c2c2",
		},
		{
			label: t("preferences.layout.headerBackground.blue"),
			value: "blue",
			color: "#1677ff",
		},
		{
			label: t("preferences.layout.headerBackground.geekblue"),
			value: "geekblue",
			color: "#2f54eb",
		},
		{
			label: t("preferences.layout.headerBackground.purple"),
			value: "purple",
			color: "#722ed1",
		},
		{
			label: t("preferences.layout.headerBackground.magenta"),
			value: "magenta",
			color: "#eb2f96",
		},
		{
			label: t("preferences.layout.headerBackground.gray"),
			value: "gray",
			color: "#bfbfbf",
		},
		{
			label: t("preferences.layout.headerBackground.custom"),
			value: "custom",
			color: "#1677ff",
		},
	] as const;

	const handleColorChange: ColorPickerProps["onChangeComplete"] = (aggregationColor) => {
		const newColor = `#${aggregationColor.toHex()}`;
		setColor(newColor);
		setPreferences({
			headerBackgroundType: "custom",
			headerBackgroundColor: newColor,
		});
	};

	function handleClick(value: HeaderBackgroundType) {
		setPreferences({
			headerBackgroundType: value,
			headerBackgroundColor: headerBackgroundPresets.find(item => item.value === value)?.color,
		});
	}

	return (
		<>
			<ul className="flex justify-between flex-wrap w-full gap-3 p-0 m-0 list-none">
				{
					headerBackgroundPresets.map((item) => {
						const innerBlock = (
							<li
								key={item.value}
								onClick={() => handleClick(item.value)}
							>
								<dl className="mb-0">
									<dd
										className={cn(
											"relative py-4 px-9 outline outline-1 outline-gray-300 dark:outline-gray-700 rounded-md cursor-pointer",
											"before:content-[''] before:absolute before:left-1/2 before:top-1/2 before:h-0 before:w-0 before:rounded-sm before:opacity-0 before:outline before:outline-2 before:outline-transparent",
											item.value === headerBackgroundType ? "" : "before:transition-all before:duration-300",
											item.value === headerBackgroundType ? "" : "before:hover:outline-blue-600 dark:before:hover:outline-blue-700 before:hover:left-0 before:hover:top-0 before:hover:h-full before:hover:w-full before:hover:p-1 before:hover:opacity-100",
											{ "outline-2 outline-blue-600 dark:outline-blue-700": item.value === headerBackgroundType },
										)}
									>
										<div
											className="rounded-md size-5"
											style={{
												backgroundColor: item.value === "custom"
													? color
													: item.value === "default"
														? "#f0f0f0"
														: item.color,
												border: item.value === "default" ? "1px solid #d9d9d9" : "none",
											}}
										>
											<span className="hidden">{item.label}</span>
											<span className="hidden">{item.color}</span>
										</div>
									</dd>

									<dt className="mt-2.5 flex gap-1 justify-center text-xs opacity-90">
										<span className="">{item.label}</span>
									</dt>
								</dl>
							</li>
						);
						if (item.value === "custom") {
							return (
								<ColorPicker key={item.value} value={color} onChangeComplete={handleColorChange}>
									{innerBlock}
								</ColorPicker>
							);
						}
						return innerBlock;
					})
				}
			</ul>
		</>
	);
}
