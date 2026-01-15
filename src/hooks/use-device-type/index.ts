import { useResponsive } from "ahooks";

/**
 * تشخيص نوع دستگاه فعلي (موبايل، iPad، PC و ...)
 *
 */
export function useDeviceType() {
	// اگر از useBreakpoint استفاده مي کنيد، رفتار xs در useResponsive و useBreakpoint انtd يکسان نيست
	/**
	 * نقطه هاي شکست پيش فرض useResponsive:
	 * @see https://ahooks.js.org/hooks/use-responsive
	 * {
	 *   xs: 0,
	 *   sm: 576,
	 *   md: 768,
	 *   lg: 992,
	 *   xl: 1200,
	 * }
	 */
	const responsive = useResponsive();
	const isMobile = (responsive.xs && !responsive.sm) || (responsive.sm && !responsive.md);
	const isIpad = responsive.md && !responsive.xl;
	const isPC = responsive.xl;

	return { isMobile, isIpad, isPC };
}
