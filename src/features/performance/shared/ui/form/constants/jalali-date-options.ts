import i18next from "i18next";

// label is a getter so the translation is resolved at render time, not at import (before i18n is ready).
export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
	get label() {
		return i18next.t(`performance.months.${i + 1}`);
	},
	value: i + 1,
}));
