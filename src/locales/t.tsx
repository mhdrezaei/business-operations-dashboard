/**
 * @fa اين تابع هيچ کاربردي ندارد و فقط براي پشتيباني بهتر از پيشنهادهاي زباني افزونه lokalise.i18n-ally است.
 * @en This function has no practical meaning; it is only used to obtain better language prompt support for the lokalise.i18n-ally plugin.
 *
 * @link https://github.com/i18next/react-i18next/issues/1058
 * @fa مستندات رسمي درباره نحوه استفاده از react-i18next در فايل هاي خالص JS يا TS توصيه اي ندارد و فعلا راه حل خوبي موجود نيست.
 * @en The official recommendation does not cover how to use react-i18next in pure JS or TS file scenarios, and there is currently no good solution.
 *
 */
export function $t(path: string) {
	return path;
}
