/**
 * بررسي مي کند آيا سيستم فعلي macOS است يا نه
 *
 * از navigator.userAgent براي تشخيص سيستم استفاده مي شود
 */
export function isMacOs() {
	const macRegex = /macintosh|mac os x/i;
	return macRegex.test(navigator.userAgent);
}
