import type { AdminRoleDto } from "#src/features/audit/admin-roles/model/admin-roles.types";
import type { AdminUserDto } from "#src/features/audit/admin-users/model/admin-users.types";
import type {
	NotificationRecipientTargetType,
	NotificationRuleChannel,
	NotificationRuleCode,
	NotificationRuleDto,
	NotificationRulePayloadTemplate,
	NotificationRuleRecipientDto,
	NotificationRunDto,
} from "./notification-rules.types";

export const notificationRuleCodeOptions: Array<{ label: string, value: NotificationRuleCode }> = [
	{ label: "هشدار پایان قرارداد (نوتیفیکیشن داخل سامانه)", value: "CONTRACT_EXPIRY" },
	{ label: "هشدار پایان قرارداد (پیامک)", value: "CONTRACT_EXPIRY_SMS" },
	{ label: "یادآوری ثبت عملکرد ماه قبل (نوتیفیکیشن داخل سامانه)", value: "PERFORMANCE_MISSING_PREV_MONTH" },
	{ label: "یادآوری ثبت عملکرد ماه قبل (پیامک)", value: "PERFORMANCE_MISSING_PREV_MONTH_SMS" },
	{ label: "یادآوری تأیید درخواست کسب‌وکار (نوتیفیکیشن داخل سامانه)", value: "BUSINESS_APPROVAL_PENDING" },
	{ label: "یادآوری امضای در انتظار (نوتیفیکیشن داخل سامانه)", value: "SIGN_PENDING" },
];

export const notificationRuleChannelLabels: Record<NotificationRuleChannel, string> = {
	IN_APP: "داخل سامانه",
	SMS: "پیامک",
};

export const notificationRuleTargetTypeLabels: Record<NotificationRecipientTargetType, string> = {
	USER: "کاربر",
	ROLE: "نقش",
};

export const defaultNotificationRuleDays = [30, 15, 7, 3, 2, 1];

export function resolveRuleChannel(code: NotificationRuleCode): NotificationRuleChannel {
	return code.endsWith("_SMS") ? "SMS" : "IN_APP";
}

export function isMissingPerformanceRule(code: NotificationRuleCode): boolean {
	return code === "PERFORMANCE_MISSING_PREV_MONTH" || code === "PERFORMANCE_MISSING_PREV_MONTH_SMS";
}

/** `days_before_end` here counts days since the contract/addendum was created; the recipient is always its creator. */
export function isPendingSinceCreationRule(code: NotificationRuleCode): boolean {
	return code === "BUSINESS_APPROVAL_PENDING" || code === "SIGN_PENDING";
}

export function getDaysBeforeEndError(code: NotificationRuleCode, days: number[]): string | null {
	if (!days.length) {
		return "حداقل یک مقدار معتبر برای days_before_end وارد کنید.";
	}
	if (isMissingPerformanceRule(code) && days.some(day => day < 1 || day > 30)) {
		return "برای Ruleهای PERFORMANCE_MISSING_PREV_MONTH روزها باید بین 1 تا 30 باشند.";
	}
	if (isPendingSinceCreationRule(code) && days.some(day => day < 1)) {
		return "برای این Rule، days_before_end باید شامل اعداد مثبت (حداقل 1) باشد.";
	}
	return null;
}

/** The modal has no payload editor: a saved template is kept as is, but only for the same rule code (pending rules never send one). */
export function resolveKeptPayloadTemplate(
	code: NotificationRuleCode,
	initial?: NotificationRuleDto | null,
): NotificationRulePayloadTemplate | undefined {
	if (isPendingSinceCreationRule(code) || initial?.code !== code || !Object.keys(initial.payload_template ?? {}).length) {
		return undefined;
	}
	return initial.payload_template;
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

export function getRuleInitialName(rule?: NotificationRuleDto | null): string {
	return rule?.name ?? "";
}

export const notificationRunJobs: Array<{ jobName: string, label: string, withSmsMeta?: boolean }> = [
	{ jobName: "notifications.contract_expiry_daily", label: "آخرین اجرای IN_APP" },
	{ jobName: "notifications.contract_expiry_sms_daily", label: "آخرین اجرای SMS", withSmsMeta: true },
	{ jobName: "notifications.performance_missing_prev_month_daily", label: "آخرین اجرای Missing Performance IN_APP" },
	{ jobName: "notifications.performance_missing_prev_month_sms_daily", label: "آخرین اجرای Missing Performance SMS", withSmsMeta: true },
	{ jobName: "notifications.business_approval_pending_daily", label: "آخرین اجرای Business Approval Pending" },
	{ jobName: "notifications.sign_pending_daily", label: "آخرین اجرای Sign Pending" },
];

export function findLatestRunByJobName(runs: NotificationRunDto[], jobName: string): NotificationRunDto | undefined {
	return runs
		.filter(run => run.job_name === jobName)
		.sort((left, right) => new Date(right.started_at).getTime() - new Date(left.started_at).getTime())[0];
}
