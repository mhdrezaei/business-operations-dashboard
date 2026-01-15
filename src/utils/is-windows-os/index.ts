/**
 * بررسي مي کند آيا سيستم فعلي Windows است يا نه
 *
 * از navigator.userAgent براي تشخيص سيستم استفاده مي شود
 */
export function isWindowsOs() {
	const windowsRegex = /windows|win32/i;
	return windowsRegex.test(navigator.userAgent);
}
