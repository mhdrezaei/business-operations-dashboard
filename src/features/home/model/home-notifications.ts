import type { NotificationItem } from "#src/api/notifications/types";

import { getNotificationData } from "#src/features/notification/inbox/model/notification-events";

export const HOME_RECENT_NOTIFICATIONS_LIMIT = 3;

function resolveRuleCode(item: NotificationItem) {
	return String(getNotificationData(item).rule_code || item.type || "").trim();
}

/** Newest notification of each rule code, at most three (old home page "آخرین اعلان‌ها"). */
export function pickRecentNotificationsByRule(items: NotificationItem[]) {
	const seenRuleCodes = new Set<string>();
	const picked: NotificationItem[] = [];
	for (const item of items) {
		const ruleCode = resolveRuleCode(item);
		if (seenRuleCodes.has(ruleCode))
			continue;
		seenRuleCodes.add(ruleCode);
		picked.push(item);
		if (picked.length >= HOME_RECENT_NOTIFICATIONS_LIMIT)
			break;
	}
	return picked;
}
