import type { NotificationItem } from "#src/api/notifications/types";

import { formatNotificationDate, NOTIFICATION_EVENT_CATEGORIES, resolveNotificationCategoryId } from "#src/features/notification/inbox/model/notification-events";
import { notificationCategoryUnreadCountQuery, notificationInboxQuery, notificationUnreadCountQuery } from "#src/features/notification/queries/notifications.queries";
import { BellOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Badge, Tag, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { pickRecentNotificationsByRule } from "../model/home-notifications";
import { HomeCard } from "./HomeCard";

function RecentNotification({ item }: { item: NotificationItem }) {
	const { t } = useTranslation();
	const categoryId = resolveNotificationCategoryId(item);
	const ruleCode = NOTIFICATION_EVENT_CATEGORIES.find(category => category.id === categoryId)?.ruleCode;
	const categoryUnread = useQuery(notificationCategoryUnreadCountQuery(ruleCode)).data ?? 0;

	return (
		<Link
			to={`/notifications?category=${categoryId}`}
			className="flex flex-col gap-2 p-4 rounded-lg bg-infoBg min-w-0 text-colorText"
		>
			<div className="flex items-center justify-between gap-2 text-sm text-colorTextSecondary">
				<span>{formatNotificationDate(item.createdAt)}</span>
				{categoryUnread > 0 && <Tag color="error" className="!me-0">{t("home.notifications.categoryUnread", { value: categoryUnread })}</Tag>}
			</div>
			<strong className="line-clamp-2 text-sm font-bold">{item.title}</strong>
			{!item.isRead && <Typography.Text type="warning" className="text-start text-sm">{t("widgets.notificationUnread")}</Typography.Text>}
		</Link>
	);
}

/** Newest notification of up to three event categories, linking to the inbox filtered by that category. */
export function HomeNotificationsCard() {
	const { t } = useTranslation();
	const inbox = useQuery(notificationInboxQuery({ page: 1, page_size: 20, channel: "IN_APP" }));
	const unreadCount = useQuery(notificationUnreadCountQuery()).data ?? 0;
	const recent = pickRecentNotificationsByRule(inbox.data?.results ?? []);
	if (!recent.length)
		return null;

	return (
		<HomeCard
			tone="cyan"
			icon={<BellOutlined />}
			title={(
				<span className="flex items-center gap-2">
					{t("home.notifications.title")}
					{unreadCount > 0 && <Badge count={unreadCount} overflowCount={999} />}
				</span>
			)}
			extra={<Link to="/notifications" className="shrink-0 text-sm">{t("home.notifications.viewAll")}</Link>}
		>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{recent.map(item => <RecentNotification key={item.id} item={item} />)}
			</div>
		</HomeCard>
	);
}
