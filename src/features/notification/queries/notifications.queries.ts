import type { NotificationInboxQuery } from "#src/api/notifications/types";
import { fetchNotificationInbox } from "#src/api/notifications";
import { queryOptions } from "@tanstack/react-query";

/** old: صندوق و شمارنده هر ۵ دقیقه تازه می‌شود */
const NOTIFICATION_REFETCH_INTERVAL = 5 * 60 * 1000;

export function notificationInboxQuery(params: NotificationInboxQuery) {
	return queryOptions({
		queryKey: ["notifications", "inbox", params],
		queryFn: () => fetchNotificationInbox(params),
		staleTime: 30 * 1000,
		refetchInterval: NOTIFICATION_REFETCH_INTERVAL,
	});
}

export function notificationUnreadCountQuery() {
	return queryOptions({
		queryKey: ["notifications", "inbox", "unread-count"],
		queryFn: async () => {
			const response = await fetchNotificationInbox({
				page: 1,
				page_size: 1,
				is_read: false,
				channel: "IN_APP",
			});
			if (response.unread_count != null)
				return response.unread_count;
			return response.count;
		},
		staleTime: 30 * 1000,
		refetchInterval: NOTIFICATION_REFETCH_INTERVAL,
	});
}

/** Unread count of one event category (`undefined` rule code = whole inbox). */
export function notificationCategoryUnreadCountQuery(ruleCode: string | undefined) {
	return queryOptions({
		queryKey: ["notifications", "inbox", "category-unread", ruleCode ?? "all"],
		queryFn: async () => {
			const response = await fetchNotificationInbox({ page: 1, page_size: 1, channel: "IN_APP", rule_code: ruleCode });
			return response.unread_count ?? 0;
		},
		staleTime: 30 * 1000,
		refetchInterval: NOTIFICATION_REFETCH_INTERVAL,
	});
}
