import { CheckCircleFilled, CloseCircleFilled, InfoCircleFilled, LoadingOutlined } from "@ant-design/icons";
import { message, theme } from "antd";
import React from "react";
import "../core/toast-styles.css";

type ToastType = "success" | "error" | "warning" | "loading";

function ToastContent({ type, title, desc }: { type: ToastType, title: string, desc?: string }) {
	const { token } = theme.useToken();

	let Icon = InfoCircleFilled;
	let color = token.colorInfo;
	let glowColor = "rgba(0, 0, 0, 0.1)";

	if (type === "success") {
		Icon = CheckCircleFilled;
		color = token.colorSuccess;
		glowColor = `${token.colorSuccess}60`; // Soft but visible opacity
	}
	else if (type === "error") {
		Icon = CloseCircleFilled;
		color = token.colorError;
		glowColor = `${token.colorError}60`;
	}
	else if (type === "warning") {
		Icon = InfoCircleFilled;
		color = token.colorWarning;
		glowColor = `${token.colorWarning}60`;
	}
	else if (type === "loading") {
		Icon = LoadingOutlined;
		color = token.colorPrimary;
		glowColor = `${token.colorPrimary}60`;
	}

	return (
		<div
			className="custom-toast-container flex items-center gap-4 px-6 py-4 min-w-[320px] relative overflow-hidden"
			style={{
				borderRadius: "20px",
				boxShadow: `0 0 80px -10px ${glowColor}, 0 20px 40px -20px ${glowColor}`,
			}}
		>
			<div className="flex-shrink-0 z-10 toast-icon-container" style={{ color, fontSize: "32px" }}>
				<Icon />
			</div>

			<div className="flex flex-col flex-1 z-10 text-right">
				<span className="font-bold text-base tracking-wide toast-title">
					{title}
				</span>
				{desc && (
					<span className="text-sm mt-1 opacity-80 toast-desc">
						{desc}
					</span>
				)}
			</div>
		</div>
	);
}

export const customToast = {
	success: (title: string, desc?: string) => message.success({
		content: <ToastContent type="success" title={title} desc={desc} />,
		icon: <></>,
		className: "modern-toast",
		style: { marginTop: "35vh" },
		duration: 3,
	}),
	error: (title: string, desc?: string) => message.error({
		content: <ToastContent type="error" title={title} desc={desc} />,
		icon: <></>,
		className: "modern-toast",
		style: { marginTop: "35vh" },
		duration: 4,
	}),
	warning: (title: string, desc?: string) => message.warning({
		content: <ToastContent type="warning" title={title} desc={desc} />,
		icon: <></>,
		className: "modern-toast",
		style: { marginTop: "35vh" },
		duration: 4,
	}),
	loading: (title: string, key: string) => message.loading({
		content: <ToastContent type="loading" title={title} />,
		key,
		icon: <></>,
		style: { marginTop: "35vh" },
		duration: 0,
		className: "modern-toast",
	}),
	destroy: (key: string) => message.destroy(key),
};
