import type { ReactNode } from "react";

import { StaticAntd } from "#src/utils";

import { theme as antdTheme, App } from "antd";
import { useEffect } from "react";

import { setupAntdFeedbackStyles, setupAntdThemeTokensToHtml } from "./setup-antd-theme";

export interface AntdAppProps {
	children: ReactNode
}

export function AntdApp({ children }: AntdAppProps) {
	const { token: antdTokens } = antdTheme.useToken();

	useEffect(() => {
		/* چاپ براي مشاهده token هاي پشتيباني شده */
		// console.log("antdTokens", antdTokens);
		setupAntdThemeTokensToHtml(antdTokens);
		setupAntdFeedbackStyles();
	}, [antdTokens]);

	return (
		<App
			className="h-full"
			notification={{
				placement: "topRight",
				top: 24,
				maxCount: 4,
				duration: 4.5,
			}}
			message={{
				top: 24,
				maxCount: 4,
				duration: 3,
			}}
		>
			<StaticAntd />
			{children}
		</App>
	);
}
