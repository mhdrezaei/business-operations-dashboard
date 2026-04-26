import type { AdminRoleUserRef } from "./admin-roles.types";
import { adminRoleScopeOptions } from "./admin-roles.schema";

const scopeLabelMap = new Map<string, string>(
	adminRoleScopeOptions.map(option => [option.value, option.label]),
);

export function formatAdminRoleUserName(user?: AdminRoleUserRef | null): string {
	if (!user) {
		return "-";
	}

	const fullName = [user.first_name, user.last_name]
		.map(value => value?.trim())
		.filter(Boolean)
		.join(" ")
		.trim();

	return fullName || `کاربر #${user.id}`;
}

export function getAdminRoleScopeLabel(scope?: string | null): string {
	if (!scope) {
		return "-";
	}

	return scopeLabelMap.get(scope) ?? scope;
}

export function formatAdminRoleCreatedAt(value?: string | null): string {
	if (!value) {
		return "-";
	}

	const parsedDate = new Date(value);
	if (Number.isNaN(parsedDate.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	}).format(parsedDate);
}

export function getAdminRoleServiceLabel(serviceId: number, serviceNameById: Map<number, string>): string {
	return serviceNameById.get(serviceId) ?? `سرویس #${serviceId}`;
}

export function getAdminRoleServiceLabels(serviceIds: number[], serviceNameById: Map<number, string>): string[] {
	return serviceIds.map(serviceId => getAdminRoleServiceLabel(serviceId, serviceNameById));
}
