import { usePreferencesStore } from "#src/store";
import { Slider } from "antd";
import { useTranslation } from "react-i18next";

export function HeaderHeight() {
	const { t } = useTranslation();
	const headerHeight = usePreferencesStore(state => state.headerHeight);
	const setPreferences = usePreferencesStore(state => state.setPreferences);

	const handleChange = (value: number) => {
		setPreferences("headerHeight", value);
	};

	return (
		<div className="flex flex-col gap-2 w-full">
			<div className="flex items-center justify-between">
				<span className="text-sm">{t("preferences.layout.headerHeight.title")}</span>
				<span className="text-xs text-gray-500">
					{headerHeight}
					px
				</span>
			</div>
			<Slider
				min={48}
				max={100}
				value={headerHeight}
				onChange={handleChange}
				tooltip={{ formatter: value => `${value}px` }}
			/>
		</div>
	);
}
