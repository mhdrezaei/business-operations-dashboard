import type { NotificationInboxQuery } from "#src/api/notifications/types";
import { fetchNotificationInbox } from "#src/api/notifications";
import { queryOptions } from "@tanstack/react-query";

export function notificationInboxQuery(params: NotificationInboxQuery) {
	return queryOptions({
		queryKey: ["notifications", "inbox", params],
		queryFn: () => fetchNotificationInbox(params),
		staleTime: 30 * 1000,
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
	});
}
