import type { NotificationItem } from "#src/api/notifications/types";

import { MONTH_OPTIONS } from "#src/features/contract/constant/jalali-date-options";
import { dayjs } from "#src/shared/lib/dayjs-jalali";
import { normalizeDigitsToLatin } from "#src/utils/formated";

export type NotificationEventCategoryId = "all"
  | "real_sign_flow"
  | "contract_expiry"
  | "performance_missing"
  | "business_approval_pending"
  | "sign_pending"
  | "sms_gateway_auto_import";

export const NOTIFICATION_EVENT_CATEGORIES: ReadonlyArray<{ id: NotificationEventCategoryId, ruleCode?: string }> = [
	{ id: "all" },
	{ id: "real_sign_flow", ruleCode: "REAL_SIGN_FLOW" },
	{ id: "contract_expiry", ruleCode: "CONTRACT_EXPIRY" },
	{ id: "performance_missing", ruleCode: "PERFORMANCE_MISSING_PREV_MONTH" },
	{ id: "business_approval_pending", ruleCode: "BUSINESS_APPROVAL_PENDING" },
	{ id: "sign_pending", ruleCode: "SIGN_PENDING" },
	{ id: "sms_gateway_auto_import", ruleCode: "SMS_GATEWAY_AUTO_IMPORT" },
];

export function resolveRuleCode(categoryId: NotificationEventCategoryId) {
	return NOTIFICATION_EVENT_CATEGORIES.find(category => category.id === categoryId)?.ruleCode;
}

export function isPendingAggregateRuleCode(ruleCode: string | undefined) {
	return ruleCode === "BUSINESS_APPROVAL_PENDING" || ruleCode === "SIGN_PENDING";
}

export function getNotificationData(item: NotificationItem): Record<string, unknown> {
	const data = (item.raw as Record<string, unknown>).data;
	return data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
}

function normalizeCode(value: unknown) {
	return String(value ?? "").trim().toUpperCase();
}

/** Same rule code in `event_type` (substring, like old) or in `data.rule_code` (exact). */
export function hasNotificationRule(item: NotificationItem, ruleCode: string) {
	return normalizeCode(item.type).includes(ruleCode) || normalizeCode(getNotificationData(item).rule_code) === ruleCode;
}

export function isPendingAggregateNotification(item: NotificationItem) {
	return hasNotificationRule(item, "BUSINESS_APPROVAL_PENDING") || hasNotificationRule(item, "SIGN_PENDING");
}

function formatMonthYearPhrase(text: string) {
	return text.replace(/برای ماه\s+([\d\u06F0-\u06F9]{4})\/([\d\u06F0-\u06F9]{1,2})/g, (_, year: string, month: string) => {
		const monthName = MONTH_OPTIONS.find(option => option.value === Number(normalizeDigitsToLatin(month)))?.label ?? month;
		return `در ${monthName} ماه سال ${normalizeDigitsToLatin(year)}`;
	});
}

const PERFORMANCE_MISSING_END_MARKER = "ثبت نشده است";

/** old `getCompactNotificationBody`: «برای ماه ۱۴۰۴/۰۵» becomes «در مرداد ماه سال ۱۴۰۴»; missing-performance bodies are cut after the marker. */
export function getCompactNotificationBody(item: NotificationItem) {
	const body = formatMonthYearPhrase(item.message.trim());
	if (!hasNotificationRule(item, "PERFORMANCE_MISSING_PREV_MONTH"))
		return body;
	const markerIndex = body.indexOf(PERFORMANCE_MISSING_END_MARKER);
	return markerIndex === -1 ? body : body.slice(0, markerIndex + PERFORMANCE_MISSING_END_MARKER.length);
}

export function isSmsVendorCompany(companyName: unknown) {
	return String(companyName ?? "").trim().toUpperCase() === "SMS_VENDOR";
}

/** Event category a notification belongs to (`all` when it matches none). */
export function resolveNotificationCategoryId(item: NotificationItem): NotificationEventCategoryId {
	return NOTIFICATION_EVENT_CATEGORIES.find(category => category.ruleCode && hasNotificationRule(item, category.ruleCode))?.id ?? "all";
}

export function formatNotificationDate(dateText: string | null | undefined) {
	const raw = String(dateText ?? "").trim();
	if (!raw)
		return "-";

	const parsed = dayjs(raw);
	if (!parsed.isValid())
		return raw;

	return parsed.format("YYYY/MM/DD HH:mm");
}
