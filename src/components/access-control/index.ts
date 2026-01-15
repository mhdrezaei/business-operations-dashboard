import type { ReactNode } from "react";

import { useAccess } from "#src/hooks";

interface AccessControlProps {
	// نوع مجوز، پيش فرض code
	type?: "code" | "role"
	// مقدار مجوز، مي تواند رشته يا آرايه باشد
	codes?: string | string[]
	children?: ReactNode
	// نمايش در صورت نبود مجوز؛ پيش فرض هيچ چيز نمايش داده نمي شود
	fallback?: ReactNode
}

/**
 * کامپوننت اعتبارسنجي مجوز
 *
 * @param AccessControlProps ويژگي هاي کامپوننت اعتبارسنجي مجوز
 * @returns اگر فرزند وجود داشته باشد و مجوز معتبر باشد همان را برمي گرداند؛ در غير اين صورت null
 */
export function AccessControl({ type = "code", codes, children, fallback }: AccessControlProps) {
	const { hasAccessByCodes, hasAccessByRoles } = useAccess();

	if (!children)
		return null;

	if (!type || type === "code") {
		return hasAccessByCodes(codes) ? children : fallback;
	}

	if (type === "role") {
		return hasAccessByRoles(codes) ? children : fallback;
	}

	return fallback;
}
