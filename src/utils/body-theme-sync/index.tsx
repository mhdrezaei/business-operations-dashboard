import { theme } from "antd";
import { useEffect } from "react";

export function BodyThemeSync() {
	const { token } = theme.useToken();

	useEffect(() => {
		// پس‌زمینه‌ی اصلی هماهنگ با تم antd
		document.body.style.backgroundColor = token.colorBgLayout;

		// اگر خواستی متن هم با تم هماهنگ شود
		document.body.style.color = token.colorText;

		// UX بهتر
		document.body.style.transition = "background-color 200ms ease, color 200ms ease";
	}, [token.colorBgBase, token.colorText]);

	return null;
}
