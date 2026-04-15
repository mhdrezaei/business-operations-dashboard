/* eslint-disable import/no-mutable-exports */
import type { MessageInstance } from "antd/es/message/interface";
import type { ModalStaticFunctions } from "antd/es/modal/confirm";
import type { NotificationInstance } from "antd/es/notification/interface";

import {
	message as antdMessage,
	Modal as antdModal,
	notification as antdNotification,
	App,
} from "antd";

let message: MessageInstance = antdMessage;
let notification: NotificationInstance = antdNotification;

const { ...resetFns } = antdModal;
let modal: Omit<ModalStaticFunctions, "warn"> = resetFns;

type ToastType = "success" | "info" | "warning" | "error";

function joinClassNames(...values: Array<string | undefined>) {
	return values.filter(Boolean).join(" ");
}

function isToastConfig(value: unknown): value is Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value))
		return false;

	return [
		"content",
		"description",
		"duration",
		"key",
		"onClose",
		"className",
		"icon",
		"btn",
		"actions",
		"closeIcon",
		"placement",
	].some(key => key in value);
}

function isLoginRoute() {
	if (typeof window === "undefined")
		return false;

	const pathname = window.location.pathname.toLowerCase();
	return pathname === "/login" || pathname.endsWith("/login") || pathname.includes("/login/");
}

function normalizeNotificationConfig(config: Record<string, unknown>, type?: ToastType) {
	return {
		placement: "topRight",
		duration: 4.5,
		...config,
		className: joinClassNames("app-toast", type ? `app-toast-${type}` : undefined, String(config.className ?? "") || undefined),
	};
}

function toNotificationConfig(input: unknown, duration?: number, onClose?: VoidFunction) {
	if (isToastConfig(input)) {
		return {
			message: input.content ?? "",
			description: input.description,
			duration: input.duration,
			key: input.key,
			onClose: input.onClose,
			className: input.className,
			icon: input.icon,
			btn: input.btn,
			actions: input.actions,
			closeIcon: input.closeIcon,
		};
	}

	return {
		message: input,
		duration,
		onClose,
	};
}

function createEnhancedNotification(originalNotification: NotificationInstance) {
	const openWithType = (type: ToastType, config: Record<string, unknown>) => {
		if (isLoginRoute())
			return (originalNotification as any)[type](config);

		return (originalNotification as any)[type](normalizeNotificationConfig(config, type));
	};

	return {
		...originalNotification,
		open: (config: any) => {
			if (isLoginRoute())
				return originalNotification.open(config);

			const type = typeof config?.type === "string" ? config.type as ToastType : undefined;
			return originalNotification.open(normalizeNotificationConfig(config ?? {}, type) as any);
		},
		success: (config: any) => openWithType("success", config ?? {}),
		info: (config: any) => openWithType("info", config ?? {}),
		warning: (config: any) => openWithType("warning", config ?? {}),
		error: (config: any) => openWithType("error", config ?? {}),
	} as NotificationInstance;
}

function createEnhancedMessage(originalMessage: MessageInstance, originalNotification: NotificationInstance) {
	const openToast = (type: ToastType, content: unknown, duration?: number, onClose?: VoidFunction) => {
		if (isLoginRoute())
			return (originalMessage as any)[type](content as any, duration as any, onClose as any);

		const config = toNotificationConfig(content, duration, onClose);
		return (originalNotification as any)[type](normalizeNotificationConfig(config, type));
	};

	return {
		...originalMessage,
		open: (config: any) => {
			if (isLoginRoute())
				return originalMessage.open(config);

			const type = typeof config?.type === "string" ? config.type as ToastType : "info";
			return originalNotification.open(normalizeNotificationConfig(toNotificationConfig(config), type) as any);
		},
		success: (content: any, duration?: number, onClose?: VoidFunction) => openToast("success", content, duration, onClose),
		info: (content: any, duration?: number, onClose?: VoidFunction) => openToast("info", content, duration, onClose),
		warning: (content: any, duration?: number, onClose?: VoidFunction) => openToast("warning", content, duration, onClose),
		error: (content: any, duration?: number, onClose?: VoidFunction) => openToast("error", content, duration, onClose),
		loading: (content: any, duration?: number, onClose?: VoidFunction) => {
			if (isLoginRoute())
				return (originalMessage as any).loading(content, duration, onClose);

			return originalMessage.loading(content, duration, onClose);
		},
		destroy: (key?: any) => {
			originalMessage.destroy(key);
			(originalNotification as any).destroy?.(key);
		},
	} as MessageInstance;
}

/**
 * @see https://ant.design/components/app
 * @see https://ant.design/docs/blog/why-not-static
 */
export function StaticAntd() {
	const staticFunctions = App.useApp();
	const enhancedNotification = createEnhancedNotification(staticFunctions.notification);
	const enhancedMessage = createEnhancedMessage(staticFunctions.message, enhancedNotification);

	/* Usage 1 */
	message = enhancedMessage;
	notification = enhancedNotification;
	modal = staticFunctions.modal;

	/* Usage 2 */
	window.$message = message;
	window.$modal = modal;
	window.$notification = notification;

	return null;
}

export {
	message,
	modal,
	notification,
};
