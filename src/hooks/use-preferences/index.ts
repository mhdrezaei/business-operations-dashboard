import { DEFAULT_PREFERENCES, usePreferencesStore } from "#src/store";
import { isDarkTheme, isLightTheme } from "#src/utils";

import { useMemo } from "react";

/**
 * پارامترهاي تنظيمات ترجيحي کاربر را بسته بندي مي کند؛ نيازي به ذخيره در localStorage ندارند،
 * اما متغيرهاي راحت براي استفاده مي توانند اينجا قرار بگيرند.
 *
 * @returns آبجکتي شامل تنظيمات ترجيحي کاربر برمي گرداند: تم، پيش فرض بودن، تيره بودن، روشن بودن
 */
export function usePreferences() {
	const preferences = usePreferencesStore();
	const { theme } = preferences;

	// آيا تنظيمات ترجيحي پيش فرض است
	const isDefault = useMemo(() => {
		return Object.entries(DEFAULT_PREFERENCES).every(([key, value]) => {
			return preferences[key as keyof typeof preferences] === value;
		});
	}, [preferences]);

	return {
		...preferences,
		isDefault,
		isDark: isDarkTheme(theme),
		isLight: isLightTheme(theme),
	};
}
