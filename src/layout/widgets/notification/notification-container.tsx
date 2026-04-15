import type { ButtonProps } from "antd";

import { markNotificationInboxState } from "#src/api/notifications";
import { notificationInboxQuery, notificationUnreadCountQuery } from "#src/features/notification/queries/notifications.queries";
import { emitNotificationSync, subscribeNotificationSync } from "#src/features/notification/shared/notification-sync";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { NotificationPopup } from "./index";

export function NotificationContainer({ ...restProps }: ButtonProps) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { t } = useTranslation();

	const inbox = useQuery(notificationInboxQuery({
		page: 1,
		page_size: 6,
		is_read: false,
		channel: "IN_APP",
	}));
	const unreadCountQuery = useQuery(notificationUnreadCountQuery());

	const notifications = inbox.data?.results ?? [];
	const unreadCount = unreadCountQuery.data ?? 0;

	useEffect(() => {
		return subscribeNotificationSync(() => {
			queryClient.invalidateQueries({ queryKey: ["notifications", "inbox"] });
		});
	}, [queryClient]);

	const markReadMutation = useMutation({
		mutationFn: async (payload: { ids: number[], isRead: boolean }) => {
			await markNotificationInboxState(payload);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["notifications", "inbox"] });
			emitNotificationSync();
		},
	});

	const handleRefresh = async () => {
		await Promise.all([
			inbox.refetch(),
			unreadCountQuery.refetch(),
		]);
	};

	const handleRead = async (id: number, isRead: boolean) => {
		try {
			await markReadMutation.mutateAsync({ ids: [id], isRead: !isRead });
			navigate(`/notifications/inbox?highlightId=${id}`);
		}
		catch {
			window.$message?.error(t("common.error"));
		}
	};

	const handleMarkAllRead = async () => {
		const unreadIds = notifications
			.filter(item => !item.isRead)
			.map(item => item.id);

		if (!unreadIds.length)
			return;

		try {
			await markReadMutation.mutateAsync({ ids: unreadIds, isRead: true });
			window.$message?.success(t("common.success"));
		}
		catch {
			window.$message?.error(t("common.error"));
		}
	};

	return (
		<NotificationPopup
			popupLoading={inbox.isLoading || inbox.isFetching || unreadCountQuery.isFetching}
			unreadCount={unreadCount}
			notifications={notifications}
			onEventChange={(event, item) => {
				switch (event) {
					case "viewAll": {
						navigate("/notifications/inbox");
						break;
					}
					case "refresh": {
						handleRefresh();
						break;
					}
					case "markAllRead": {
						handleMarkAllRead();
						break;
					}
					case "read": {
						if (item)
							handleRead(item.id, item.isRead);
						break;
					}
					default:
						break;
				}
			}}
			{...restProps}
		/>
	);
}
