import { useDeviceType } from "#src/hooks";
import {
	MIXED_NAVIGATION,
	SIDE_NAVIGATION,
	TOP_NAVIGATION,
	TWO_COLUMN_NAVIGATION,
} from "#src/layout/widgets/preferences/blocks/layout/constants";
import { usePreferencesStore } from "#src/store";

import { useMemo } from "react";

/**
 * دريافت نوع چيدمان صفحه فعلي
 *
 * @returns آبجکتي شامل اطلاعات چيدمان فعلي:
 * - currentLayout: نوع ناوبري فعلي
 * - isSideNav: آيا ناوبري کناري است
 * - isTopNav: آيا ناوبري بالا است
 * - isMixedNav: آيا ناوبري ترکيبي است
 * - isTwoColumnNav: آيا ناوبري دو ستونه است
 */
export function useLayout() {
	const { isMobile } = useDeviceType();
	// LayoutType
	const navigationStyle = usePreferencesStore(state => state.navigationStyle);
	const sidebarWidth = usePreferencesStore(state => state.sidebarWidth);
	const sideCollapsedWidth = usePreferencesStore(state => state.sideCollapsedWidth);
	const firstColumnWidthInTwoColumnNavigation = usePreferencesStore(state => state.firstColumnWidthInTwoColumnNavigation);

	/**
	 * نوع ناوبري فعلي
	 */
	const currentLayout = useMemo(
		() => isMobile ? SIDE_NAVIGATION : navigationStyle,
		[isMobile, navigationStyle],
	);

	/**
	 * آيا ناوبري کناري است
	 */
	const isSideNav = useMemo(
		() => currentLayout === SIDE_NAVIGATION,
		[currentLayout],
	);

	/**
	 * آيا ناوبري بالا است
	 */
	const isTopNav = useMemo(
		() => currentLayout === TOP_NAVIGATION,
		[currentLayout],
	);

	/**
	 * آيا ناوبري دو ستونه است
	 */
	const isTwoColumnNav = useMemo(
		() => currentLayout === TWO_COLUMN_NAVIGATION,
		[currentLayout],
	);

	/**
	 * آيا ناوبري ترکيبي است
	 */
	const isMixedNav = useMemo(
		() => currentLayout === MIXED_NAVIGATION,
		[currentLayout],
	);

	return {
		currentLayout,
		isSideNav,
		isTopNav,
		isMixedNav,
		isTwoColumnNav,
		sidebarWidth,
		sideCollapsedWidth,
		firstColumnWidthInTwoColumnNavigation,
	};
}
