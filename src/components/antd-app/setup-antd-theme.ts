import type { GlobalToken } from "antd";
import { getCSSVariablesByTokens } from "./utils";

/**
 * Setup antd theme tokens to html
 * @see https://ant.design/docs/spec/colors
 */
export function setupAntdThemeTokensToHtml(antdTokens: GlobalToken) {
	const cssVariablesString = getCSSVariablesByTokens(antdTokens);

	const styleId = "antd-theme-tokens";
	const styleSheet = document.querySelector(`#${styleId}`) || document.createElement("style");
	styleSheet.id = styleId;
	styleSheet.textContent = `:root { ${cssVariablesString} }`;
	document.head.appendChild(styleSheet);
}

export function setupAntdFeedbackStyles() {
	const styleId = "antd-feedback-styles";
	const styleSheet = document.querySelector(`#${styleId}`) || document.createElement("style");

	styleSheet.id = styleId;
	styleSheet.textContent = `
		.app-toast {
			position: relative;
			overflow: hidden;
			border-radius: 18px;
			border: 1px solid var(--ant-colorBorderSecondary, rgba(148, 163, 184, 0.24));
			background: var(--ant-colorBgElevated, rgba(255, 255, 255, 0.96));
			backdrop-filter: blur(14px);
			box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
			animation: app-toast-enter 0.24s ease-out;
		}
		.app-toast::before {
			content: "";
			position: absolute;
			inset-block: 0;
			inset-inline-start: 0;
			width: 5px;
			background: var(--app-toast-accent, var(--ant-colorPrimary, #1677ff));
		}
		.app-toast .ant-notification-notice-message {
			margin-bottom: 6px;
			padding-inline-start: 8px;
			font-weight: 700;
			color: var(--ant-colorText, #0f172a);
		}
		.app-toast .ant-notification-notice-description {
			padding-inline-start: 8px;
			line-height: 1.75;
			color: var(--ant-colorTextSecondary, #475569);
		}
		.app-toast .ant-notification-notice-icon {
			margin-top: 2px;
		}
		.app-toast-success {
			--app-toast-accent: #16a34a;
		}
		.app-toast-info {
			--app-toast-accent: #1677ff;
		}
		.app-toast-warning {
			--app-toast-accent: #d97706;
		}
		.app-toast-error {
			--app-toast-accent: #dc2626;
		}
		@keyframes app-toast-enter {
			from {
				opacity: 0;
				transform: translate3d(18px, -12px, 0) scale(0.98);
			}
			to {
				opacity: 1;
				transform: translate3d(0, 0, 0) scale(1);
			}
		}
	`;

	document.head.appendChild(styleSheet);
}
