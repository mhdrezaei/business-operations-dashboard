import type { ButtonProps, GlobalToken } from "antd";
import type { NotificationItem } from "./types";

import NotificationIcon from "#src/assets/svg/header/notification.svg?react";
import { BasicButton } from "#src/components";
import {
	formatNotificationDate,
	getCompactNotificationBody,
	resolveNotificationCategoryId,
} from "#src/features/notification/inbox/model/notification-events";
import { cn } from "#src/utils";

import {
	ArrowLeftOutlined,
	AuditOutlined,
	BellOutlined,
	CalendarOutlined,
	CheckCircleOutlined,
	ClockCircleOutlined,
	ExclamationCircleOutlined,
	FileTextOutlined,
	LeftOutlined,
	MessageOutlined,
	ReloadOutlined,
	SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useToggle } from "ahooks";
import { Badge, Button, Empty, Popover, Spin, Tag, theme, Tooltip, Typography } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";

type NotificationEventType = "viewAll" | "markAllRead" | "refresh" | "read";

function getCategoryBadge(item: NotificationItem, token: GlobalToken) {
	const catId = resolveNotificationCategoryId(item);
	switch (catId) {
		case "real_sign_flow":
			return {
				icon: <SafetyCertificateOutlined />,
				color: token.colorPrimary,
				bg: `${token.colorPrimary}14`,
				catId,
			};
		case "contract_expiry":
			return {
				icon: <ClockCircleOutlined />,
				color: token.colorWarning,
				bg: `${token.colorWarning}14`,
				catId,
			};
		case "performance_missing":
			return {
				icon: <ExclamationCircleOutlined />,
				color: token.colorError,
				bg: `${token.colorError}14`,
				catId,
			};
		case "business_approval_pending":
			return {
				icon: <AuditOutlined />,
				color: "#722ed1",
				bg: "#722ed114",
				catId,
			};
		case "sign_pending":
			return {
				icon: <FileTextOutlined />,
				color: "#13c2c2",
				bg: "#13c2c214",
				catId,
			};
		case "sms_gateway_auto_import":
			return {
				icon: <MessageOutlined />,
				color: "#fa8c16",
				bg: "#fa8c1614",
				catId,
			};
		case "all":
		default:
			return {
				icon: <BellOutlined />,
				color: token.colorPrimary,
				bg: `${token.colorPrimary}14`,
				catId,
			};
	}
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
	const { token } = theme.useToken();
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

	const handleMarkAllRead = () => {
		onEventChange && onEventChange("markAllRead");
	};

	const handleRefresh = () => {
		onEventChange && onEventChange("refresh");
	};

	const handleClick = (item: NotificationItem) => {
		onEventChange && onEventChange("read", item);
		close();
	};

	const hasUnread = useMemo(() => {
		return items.some(item => !item.isRead);
	}, [items]);

	return (
		<Popover
			placement="bottomLeft"
			overlayClassName="w-80 sm:w-96 ltr:!right-3 rtl:!left-3"
			overlayInnerStyle={{
				padding: 0,
				borderRadius: 20,
				overflow: "hidden",
				backgroundColor: token.colorBgElevated,
				boxShadow: token.boxShadowSecondary,
				border: `1px solid ${token.colorBorderSecondary}`,
			}}
			open={open}
			arrow={false}
			trigger="click"
			onOpenChange={handleOpenChange}
			content={(
				<div className="flex flex-col">
					{/* Top Accent Gradient Bar */}
					<div
						className="h-1.5 w-full"
						style={{
							background: `linear-gradient(90deg, ${token.colorPrimary}, ${token.colorPrimaryHover}, ${token.colorInfo})`,
						}}
					/>

					{/* Header */}
					<div
						className="flex items-center justify-between border-b px-4 py-3"
						style={{ borderColor: token.colorBorderSecondary }}
					>
						<div className="flex items-center gap-2">
							<div
								className="flex h-7 w-7 items-center justify-center rounded-lg"
								style={{
									backgroundColor: `${token.colorPrimary}14`,
									color: token.colorPrimary,
								}}
							>
								<BellOutlined className="text-sm" />
							</div>
							<Typography.Text strong className="text-sm font-bold">
								{t("widgets.notifications")}
							</Typography.Text>
							{unreadCount > 0 && (
								<span
									className="inline-flex items-center rounded-full px-2 py-0.2 text-[10px] font-bold"
									style={{
										backgroundColor: `${token.colorError}18`,
										color: token.colorError,
									}}
								>
									{unreadCount}
								</span>
							)}
						</div>

						<div className="flex items-center gap-1">
							<Tooltip title={t("widgets.notificationRefresh")}>
								<Button
									type="text"
									size="small"
									icon={<ReloadOutlined className={popupLoading ? "animate-spin" : ""} />}
									onClick={handleRefresh}
									className="!h-7 !w-7 !p-0 !rounded-lg text-gray-500 hover:text-primary"
								/>
							</Tooltip>
							<Tooltip title={hasUnread ? t("widgets.markAllAsRead") : null}>
								<Button
									type="text"
									size="small"
									disabled={!hasUnread}
									onClick={handleMarkAllRead}
									icon={<CheckCircleOutlined />}
									className="!h-7 !px-2 !rounded-lg text-xs"
								>
									<span className="hidden sm:inline">{t("widgets.notificationReadAll")}</span>
								</Button>
							</Tooltip>
						</div>
					</div>

					{/* Content list */}
					<div
						className="max-h-[380px] overflow-y-auto p-2"
						style={{
							scrollbarWidth: "thin",
							scrollbarColor: `${token.colorBorderSecondary} transparent`,
						}}
					>
						{popupLoading && !items.length ? (
							<div className="flex h-44 items-center justify-center">
								<Spin size="default" />
							</div>
						) : !items.length ? (
							<div className="py-8">
								<Empty
									image={Empty.PRESENTED_IMAGE_SIMPLE}
									description={(
										<Typography.Text type="secondary" className="text-xs">
											{t("widgets.notificationEmpty")}
										</Typography.Text>
									)}
								/>
							</div>
						) : (
							<div className="flex flex-col gap-2">
								<AnimatePresence>
									{items.map((item, index) => {
										const cat = getCategoryBadge(item, token);
										return (
											<motion.div
												key={item.id}
												initial={{ opacity: 0, y: 6 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, scale: 0.98 }}
												transition={{ duration: 0.15, delay: index * 0.03 }}
												whileHover={{ scale: 1.01 }}
												onClick={() => handleClick(item)}
												className="group relative cursor-pointer overflow-hidden rounded-xl border p-3 transition-all"
												style={{
													borderColor: item.isRead
														? token.colorBorderSecondary
														: `${token.colorPrimary}44`,
													backgroundColor: item.isRead
														? token.colorBgContainer
														: `${token.colorPrimary}06`,
												}}
											>
												{/* Accent indicator line on right/left */}
												{!item.isRead && (
													<div
														className="absolute inset-y-0 start-0 w-1 rounded-e-full"
														style={{ backgroundColor: token.colorPrimary }}
													/>
												)}

												<div className="ps-1.5">
													{/* Card Header: Category + Status Badge */}
													<div className="mb-1.5 flex items-center justify-between gap-2">
														<div className="flex items-center gap-1.5">
															<span
																className="flex h-5 w-5 items-center justify-center rounded-md text-xs"
																style={{ backgroundColor: cat.bg, color: cat.color }}
															>
																{cat.icon}
															</span>
															<span
																className="text-[11px] font-medium"
																style={{ color: cat.color }}
															>
																{t(`widgets.notificationCategory.${cat.catId}`)}
															</span>
														</div>

														<div className="flex items-center gap-1">
															<Tag
																color={item.isRead ? "default" : "processing"}
																className="!m-0 !rounded-md !px-1.5 !py-0 !text-[10px] !border-none"
															>
																{item.isRead ? t("widgets.notificationRead") : t("widgets.notificationUnread")}
															</Tag>
														</div>
													</div>

													{/* Title */}
													<Typography.Text
														strong
														className="mb-1 block text-xs leading-snug line-clamp-1 group-hover:text-primary transition-colors"
													>
														{item.title}
													</Typography.Text>

													{/* Message */}
													<p
														className="mb-2 text-[11px] leading-relaxed line-clamp-2"
														style={{ color: token.colorTextSecondary }}
													>
														{getCompactNotificationBody(item)}
													</p>

													{/* Footer with date & arrow */}
													<div
														className="flex items-center justify-between pt-1 border-t text-[10px]"
														style={{
															borderColor: token.colorBorderSecondary,
															color: token.colorTextTertiary,
														}}
													>
														<span className="flex items-center gap-1">
															<CalendarOutlined className="text-[10px]" />
															<span>{formatNotificationDate(item.createdAt)}</span>
														</span>

														<span
															className="flex items-center gap-0.5 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
															style={{ color: token.colorPrimary }}
														>
															<span>مشاهده</span>
															<LeftOutlined className="text-[8px]" />
														</span>
													</div>
												</div>
											</motion.div>
										);
									})}
								</AnimatePresence>
							</div>
						)}
					</div>

					{/* Footer */}
					<div
						className="flex items-center justify-between border-t p-2.5 px-4"
						style={{
							borderColor: token.colorBorderSecondary,
							backgroundColor: token.colorFillAlter,
						}}
					>
						<Typography.Text type="secondary" className="text-xs">
							{unreadCount > 0
								? `${unreadCount} اعلان خوانده نشده`
								: "همه اعلان‌ها خوانده شده"}
						</Typography.Text>

						<Button
							type="primary"
							size="small"
							icon={<ArrowLeftOutlined />}
							iconPosition="end"
							onClick={handleViewAll}
							className="!rounded-lg !text-xs !h-7 !px-3 font-medium"
						>
							{t("widgets.viewAll")}
						</Button>
					</div>
				</div>
			)}
		>
			<BasicButton
				size="large"
				type="text"
				{...restProps}
				aria-label={t("widgets.notifications")}
				className={cn("relative group transition-transform active:scale-95", restProps.className)}
				icon={(
					<Badge
						count={unreadCount}
						overflowCount={99}
						size="small"
						color={token.colorError}
						offset={[-2, 3]}
					>
						<NotificationIcon
							className="size-6 text-foreground group-hover:text-primary transition-all duration-200 group-hover:scale-110 [&_path]:fill-current"
							aria-hidden
						/>
					</Badge>
				)}
			/>
		</Popover>
	);
};
