import type { AdminRoleDto } from "#src/features/audit/admin-roles/model/admin-roles.types";
import type { AdminUserDto } from "#src/features/audit/admin-users/model/admin-users.types";
import type {
	NotificationRecipientTargetType,
	NotificationRuleChannel,
	NotificationRuleCode,
	NotificationRuleDto,
	NotificationRulePayloadTemplate,
	NotificationRuleRecipientDto,
} from "./notification-rules.types";

export const notificationRuleCodeOptions: Array<{ label: string, value: NotificationRuleCode }> = [
	{ label: "نوتیفیکیشن داخل سامانه", value: "CONTRACT_EXPIRY" },
	{ label: "پیامک", value: "CONTRACT_EXPIRY_SMS" },
];

export const notificationRuleChannelLabels: Record<NotificationRuleChannel, string> = {
	IN_APP: "داخل سامانه",
	SMS: "پیامک",
};

export const notificationRuleTargetTypeLabels: Record<NotificationRecipientTargetType, string> = {
	USER: "کاربر",
	ROLE: "نقش",
};

export const defaultNotificationRuleDays = [1, 2, 3, 7, 15, 20, 30];

export const defaultInAppPayloadTemplate: NotificationRulePayloadTemplate = {
	ui: {
		icon: "contract-expiry",
		category: "contracts",
		severity: "warning",
	},
	actions: [
		{
			url: "/contracts/list",
			type: "link",
			label: "مشاهده قراردادها",
		},
	],
	message: {
		body_fa: "قرارداد برخی شرکت‌ها رو به اتمام است.",
		title_fa: "هشدار پایان قرارداد",
	},
};

export function resolveRuleChannel(code: NotificationRuleCode): NotificationRuleChannel {
	return code === "CONTRACT_EXPIRY_SMS" ? "SMS" : "IN_APP";
}

export function normalizeRulePayloadTemplate(
	code: NotificationRuleCode,
	payload: NotificationRulePayloadTemplate | null | undefined,
): NotificationRulePayloadTemplate {
	if (code === "CONTRACT_EXPIRY_SMS") {
		return payload && Object.keys(payload).length > 0 ? payload : {};
	}

	if (payload && Object.keys(payload).length > 0) {
		return payload;
	}

	return defaultInAppPayloadTemplate;
}

export function formatRuleDate(value?: string | null): string {
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

export function formatRuleServiceNames(serviceNames: string[]): string {
	if (!serviceNames.length) {
		return "همه سرویس‌ها";
	}

	return serviceNames.join("، ");
}

export function formatAdminUserName(user?: AdminUserDto | null): string {
	if (!user) {
		return "-";
	}

	const fullName = [user.first_name, user.last_name]
		.map(value => value?.trim())
		.filter(Boolean)
		.join(" ")
		.trim();

	return fullName || user.username || `کاربر #${user.id}`;
}

export function formatAdminRoleName(role?: AdminRoleDto | null): string {
	if (!role) {
		return "-";
	}

	return role.name || `نقش #${role.id}`;
}

export function formatRuleRecipients(
	recipients: NotificationRuleRecipientDto[],
	userNameById: Map<number, string>,
	roleNameById: Map<number, string>,
): string {
	if (!recipients.length) {
		return "-";
	}

	return recipients
		.map((recipient) => {
			if (recipient.target_type === "USER" && recipient.user_id) {
				return `USER: ${userNameById.get(recipient.user_id) ?? `#${recipient.user_id}`}`;
			}
			if (recipient.target_type === "ROLE" && recipient.role_id) {
				return `ROLE: ${roleNameById.get(recipient.role_id) ?? `#${recipient.role_id}`}`;
			}
			return recipient.target_type;
		})
		.join("، ");
}

export function getRuleCodeLabel(code: string): string {
	return notificationRuleCodeOptions.find(option => option.value === code)?.label ?? code;
}

export function getRuleStatusLabel(isActive: boolean): string {
	return isActive ? "فعال" : "غیرفعال";
}

export function parseDaysBeforeEnd(rawValue: string): number[] {
	const days = rawValue
		.split(/[,\s،]+/)
		.map(value => Number(value.trim()))
		.filter(value => Number.isInteger(value) && value >= 0);

	return Array.from(new Set(days));
}

export function stringifyDaysBeforeEnd(days: number[]): string {
	return days.join(",");
}

export function safeJsonStringify(value: unknown): string {
	try {
		return JSON.stringify(value ?? {}, null, 2);
	}
	catch {
		return "{}";
	}
}

export function parsePayloadJson(rawValue: string): NotificationRulePayloadTemplate {
	const trimmed = rawValue.trim();
	if (!trimmed) {
		return {};
	}

	const parsed = JSON.parse(trimmed) as unknown;
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error("payload_template باید یک object معتبر باشد.");
	}

	return parsed as NotificationRulePayloadTemplate;
}

export function getRuleInitialName(rule?: NotificationRuleDto | null): string {
	return rule?.name ?? "";
}
