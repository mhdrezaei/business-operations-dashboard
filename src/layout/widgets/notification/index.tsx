import type { ButtonProps } from "antd";
import type { NotificationItem } from "./types";

import { BasicButton } from "#src/components";
import { dayjs } from "#src/shared/lib/dayjs-jalali";
import { cn } from "#src/utils";

import { BellOutlined, ReloadOutlined } from "@ant-design/icons";
import { useToggle } from "ahooks";
import { Badge, Empty, List, Popover, Tag, Tooltip } from "antd";
import { clsx } from "clsx";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { createUseStyles } from "react-jss";

const useStyles = createUseStyles(({ token }) => (
	{
		notification: {
			"& .ant-popover-inner": {
				padding: 0,
			},
			"& .ant-list-footer": {
				borderTop: `1px solid ${token.colorBorder}`,
			},
			"& .ant-list-items": {
				maxHeight: 420,
				overflowY: "auto",
			},
		},
	}
));

type NotificationEventType = "viewAll" | "markAllRead" | "refresh" | "read";

function formatNotificationDate(dateText: string | null | undefined) {
	const raw = String(dateText ?? "").trim();
	if (!raw)
		return "-";

	const parsed = dayjs(raw);
	if (!parsed.isValid())
		return raw;

	return parsed.format("YYYY/MM/DD HH:mm");
}

interface Props extends ButtonProps {
	popupLoading?: boolean
	unreadCount?: number
	onEventChange?: (event: NotificationEventType, item?: NotificationItem) => void
	notifications?: NotificationItem[]
}

export const NotificationPopup: React.FC<Props> = ({
	popupLoading,
	unreadCount = 0,
	notifications,
	onEventChange,
	...restProps
}) => {
	const [open, action] = useToggle();
	const classes = useStyles();
	const { t } = useTranslation();
	const items = notifications ?? [];

	const close = () => {
		action.set(false);
	};

	const handleOpenChange = (nextOpen: boolean) => {
		action.set(nextOpen);
		if (nextOpen)
			onEventChange && onEventChange("refresh");
	};

	const handleViewAll = () => {
		onEventChange && onEventChange("viewAll");
		close();
	};

	const handleMakeAll = () => {
		onEventChange && onEventChange("markAllRead");
	};

	const handleRefresh = () => {
		onEventChange && onEventChange("refresh");
	};

	const handleClick = (item: NotificationItem) => {
		onEventChange && onEventChange("read", item);
	};

	const hasUnread = useMemo(() => {
		return items.some(item => !item.isRead);
	}, [items]);

	return (
		<Popover
			placement="bottomLeft"
			overlayClassName={clsx(classes.notification, "w-72 md:w-96 ltr:!right-3 rtl:!left-3")}
			open={open}
			arrow={false}
			trigger="click"
			onOpenChange={handleOpenChange}
			content={(
				<List
					size="small"
					bordered
					loading={popupLoading}
					locale={{
						emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("widgets.notificationEmpty")} />,
					}}
					header={(
						<div className="flex items-center justify-between">
							<div>{t("widgets.notifications")}</div>
							<div className="flex items-center gap-1">
								<Tooltip title={t("widgets.notificationRefresh")}>
									<BasicButton onClick={handleRefresh} type="text" icon={<ReloadOutlined />} />
								</Tooltip>
								<Tooltip title={hasUnread ? t("widgets.markAllAsRead") : null}>
									<BasicButton
										disabled={!hasUnread}
										onClick={handleMakeAll}
										type="text"
									>
										{t("widgets.notificationReadAllOnPage")}
									</BasicButton>
								</Tooltip>
							</div>
						</div>
					)}
					footer={(
						<div className="flex items-center justify-end">
							<BasicButton onClick={handleViewAll} disabled={!items.length}>
								{t("widgets.viewAll")}
							</BasicButton>
						</div>
					)}
					dataSource={items}
					renderItem={item => (
						<List.Item
							className="!justify-start cursor-pointer px-2 py-2"
							onClick={() => handleClick(item)}
						>
							<div className="relative w-full overflow-hidden rounded-xl border border-[var(--ant-colorPrimaryBorder)] bg-[var(--ant-colorBgElevated)] p-3 shadow-[0_8px_24px_rgba(15,23,42,0.18)]">
								<div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
								<div className="mb-2 flex items-center justify-between">
									<Tag color={item.isRead ? "default" : "processing"}>
										{item.isRead ? t("widgets.notificationRead") : t("widgets.notificationUnread")}
									</Tag>
								</div>
								<p className="mb-1 font-semibold">{item.title}</p>
								<p className="mb-2 text-xs text-muted-foreground line-clamp-2">{item.message}</p>
								<p className="text-xs text-muted-foreground line-clamp-2">
									{`${t("widgets.notificationSentAt")}: ${formatNotificationDate(item.createdAt)}`}
								</p>
							</div>
						</List.Item>
					)}
				/>
			)}
		>
			<BasicButton
				size="large"
				type="text"
				{...restProps}
				className={cn("relative group", restProps.className)}
				icon={(
					<Badge count={unreadCount} size="small" color="#ef4444">
						<BellOutlined className="group-hover:animate-wiggle" />
					</Badge>
				)}
			/>
		</Popover>
	);
};
