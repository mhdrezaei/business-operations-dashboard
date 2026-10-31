import type { NotificationItem } from "#src/api/notifications/types";
import type { GlobalToken } from "antd";
import type { NotificationEventCategoryId } from "../model/notification-events";
import type { NotificationEntry } from "../model/notification-targets";

import { markNotificationInboxState, toPositiveInt } from "#src/api/notifications";
import { BasicContent } from "#src/components";
import {
	notificationCategoryUnreadCountQuery,
	notificationInboxQuery,
	notificationUnreadCountQuery,
} from "#src/features/notification/queries/notifications.queries";
import {
	emitNotificationSync,
	subscribeNotificationSync,
} from "#src/features/notification/shared/notification-sync";
import { useAccess } from "#src/hooks";
import { useCardBorderColor } from "#src/shared/lib/use-card-border-color";
import { useUserStore } from "#src/store";
import {
	AuditOutlined,
	BellOutlined,
	CalendarOutlined,
	CheckCircleOutlined,
	CheckOutlined,
	ClockCircleOutlined,
	EditOutlined,
	ExclamationCircleOutlined,
	EyeInvisibleOutlined,
	EyeOutlined,
	FileAddOutlined,
	FileTextOutlined,
	LeftOutlined,
	LinkOutlined,
	MessageOutlined,
	ReloadOutlined,
	RightOutlined,
	SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Badge,
	Button,
	Empty,
	Pagination,
	Segmented,
	Tag,
	theme,
	Tooltip,
	Typography,
} from "antd";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";

import {
	formatNotificationDate,
	getCompactNotificationBody,
	getNotificationData,
	hasNotificationRule,
	isNotificationCategoryVisible,
	isPendingAggregateNotification,
	isPendingAggregateRuleCode,
	isSmsVendorCompany,
	NOTIFICATION_EVENT_CATEGORIES,
	resolveNotificationCategoryId,
	resolveRuleCode,
} from "../model/notification-events";
import {
	buildNotificationContractEditPath,
	buildNotificationPerformanceNewTarget,
	buildNotificationSignFlowPath,
	readCompanyTypeCode,
} from "../model/notification-targets";
import { SmsGatewayAutoImportDetail } from "./SmsGatewayAutoImportDetail";

type NotificationFilter = "all" | "read" | "unread";

const PENDING_ITEMS_PAGE_SIZE = 20;

interface RelatedContractLink {
	key: string
	companyName: string
	contractId: number | null
	serviceId: number | null
	entry: NotificationEntry
}

function resolveReadFilter(filter: NotificationFilter) {
	if (filter === "read")
		return true;
	if (filter === "unread")
		return false;
	return undefined;
}

function extractRelatedContracts(item: NotificationItem): RelatedContractLink[] {
	const raw = item.raw as Record<string, unknown>;
	const rawData = (raw.data ?? {}) as Record<string, unknown>;
	const defaultServiceId = toPositiveInt(rawData.service_id ?? raw.service_id);

	const map = new Map<string, RelatedContractLink>();

	const upsert = (
		companyNameRaw: unknown,
		contractIdRaw?: unknown,
		serviceIdRaw?: unknown,
		entry: NotificationEntry = {},
	) => {
		const companyName = String(companyNameRaw ?? "").trim();
		if (!companyName)
			return;

		const contractId = toPositiveInt(contractIdRaw);
		const serviceId = toPositiveInt(serviceIdRaw) ?? defaultServiceId;
		const key = `${contractId ?? "none"}-${companyName}`;
		const existing = map.get(key);

		if (!existing) {
			map.set(key, {
				key,
				companyName,
				contractId,
				serviceId,
				entry,
			});
			return;
		}

		if (existing.contractId == null && contractId != null)
			existing.contractId = contractId;
		if (existing.serviceId == null && serviceId != null)
			existing.serviceId = serviceId;
	};

	const dataCompanies = rawData.companies;
	if (Array.isArray(dataCompanies)) {
		dataCompanies.forEach((entry) => {
			if (entry && typeof entry === "object") {
				const company = entry as Record<string, unknown>;
				upsert(
					company.company_name ?? company.name,
					company.contract_id,
					company.service_id ?? rawData.service_id,
					company,
				);
			}
		});
	}

	const companies = raw.companies;
	if (Array.isArray(companies)) {
		companies.forEach((entry) => {
			if (entry && typeof entry === "object") {
				const company = entry as Record<string, unknown>;
				upsert(
					company.company_name ?? company.name,
					company.contract_id,
					company.service_id ?? rawData.service_id,
					company,
				);
			}
			else if (typeof entry === "string") {
				upsert(entry);
			}
		});
	}

	const directCompanyName = String(raw.company_name ?? "").trim();
	if (directCompanyName)
		upsert(directCompanyName, raw.contract_id, rawData.service_id ?? raw.service_id);

	const companyNames = raw.company_names;
	if (Array.isArray(companyNames)) {
		companyNames.forEach(name => upsert(name));
	}

	return Array.from(map.values()).sort((a, b) => {
		if (a.contractId != null && b.contractId == null)
			return -1;
		if (a.contractId == null && b.contractId != null)
			return 1;
		return a.companyName.localeCompare(b.companyName, "fa");
	});
}

function getCategoryConfig(categoryId: NotificationEventCategoryId, token: GlobalToken) {
	switch (categoryId) {
		case "real_sign_flow":
			return {
				icon: <SafetyCertificateOutlined />,
				color: token.colorPrimary,
				bg: `${token.colorPrimary}14`,
			};
		case "contract_expiry":
			return {
				icon: <ClockCircleOutlined />,
				color: token.colorWarning,
				bg: `${token.colorWarning}14`,
			};
		case "performance_missing":
			return {
				icon: <ExclamationCircleOutlined />,
				color: token.colorError,
				bg: `${token.colorError}14`,
			};
		case "business_approval_pending":
			return {
				icon: <AuditOutlined />,
				color: "#722ed1",
				bg: "#722ed114",
			};
		case "sign_pending":
			return {
				icon: <FileTextOutlined />,
				color: "#13c2c2",
				bg: "#13c2c214",
			};
		case "sms_gateway_auto_import":
			return {
				icon: <MessageOutlined />,
				color: "#fa8c16",
				bg: "#fa8c1614",
			};
		case "all":
		default:
			return {
				icon: <BellOutlined />,
				color: token.colorPrimary,
				bg: `${token.colorPrimary}14`,
			};
	}
}

export default function NotificationInboxPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { token } = theme.useToken();
	const cardBorderColor = useCardBorderColor();
	const services = useUserStore(state => state.services) ?? [];
	const { isFullAdmin, hasDomainPermission, getPermittedCompanyTypes } = useAccess();

	const smsServiceId = services.find(service => service.code === "sms")?.id;
	const canSeeSmsGatewayImport = isFullAdmin || (["view", "create", "update"] as const).some(action =>
		hasDomainPermission("performances", action, "sms")
		&& getPermittedCompanyTypes("performances", action, smsServiceId).length > 0,
	);

	const visibleCategories = useMemo(
		() =>
			NOTIFICATION_EVENT_CATEGORIES.filter(category =>
				isNotificationCategoryVisible(category.id, {
					smsGatewayImport: canSeeSmsGatewayImport,
					businessApprovalPending: hasDomainPermission("contracts", "business_approve"),
					signPending: hasDomainPermission("contracts", "sign"),
				}),
			),
		[canSeeSmsGatewayImport, hasDomainPermission],
	);

	const [filter, setFilter] = useState<NotificationFilter>("all");
	const [searchParams] = useSearchParams();
	const [eventCategory, setEventCategory] = useState<NotificationEventCategoryId>(() => {
		const requested = searchParams.get("category");
		return visibleCategories.find(category => category.id === requested)?.id ?? "all";
	});
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [pendingItemsPage, setPendingItemsPage] = useState(1);
	const highlightId = Number(searchParams.get("highlightId"));

	const ruleCode = resolveRuleCode(eventCategory);
	const isPendingAggregateFilter = isPendingAggregateRuleCode(ruleCode);
	const inboxParams = {
		page,
		page_size: pageSize,
		is_read: resolveReadFilter(filter),
		channel: "IN_APP",
		rule_code: ruleCode,
	};

	const inbox = useQuery(
		notificationInboxQuery({
			...inboxParams,
			...(isPendingAggregateFilter ? { items_page: pendingItemsPage, items_page_size: PENDING_ITEMS_PAGE_SIZE } : {}),
		}),
	);
	const unreadCountQuery = useQuery(notificationUnreadCountQuery());
	const categoryUnreadCounts = useQueries({
		queries: visibleCategories.map(category => notificationCategoryUnreadCountQuery(category.ruleCode)),
		combine: results => results.map(result => result.data),
	});

	const serviceCodeById = useMemo(
		() => new Map(services.map(service => [Number(service.id), service.code] as const)),
		[services],
	);

	useEffect(() => {
		return subscribeNotificationSync(() => {
			queryClient.invalidateQueries({ queryKey: ["notifications", "inbox"] });
		});
	}, [queryClient]);

	const markReadMutation = useMutation({
		mutationFn: async (payload: { ids?: number[], all?: boolean, isRead: boolean }) => {
			await markNotificationInboxState(payload);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["notifications", "inbox"] });
			emitNotificationSync();
		},
	});

	const notifications = inbox.data?.results ?? [];
	const total = inbox.data?.count ?? 0;
	const loading = inbox.isLoading || inbox.isFetching;
	const unreadCount = unreadCountQuery.data ?? 0;

	// The highlighted notification can live on another page: walk the pages until it is found
	const locatingHighlight = useRef(false);
	useEffect(() => {
		if (!highlightId || loading || !total || locatingHighlight.current || notifications.some(item => item.id === highlightId))
			return;

		locatingHighlight.current = true;
		const totalPages = Math.ceil(total / pageSize);
		(async () => {
			for (let candidate = 1; candidate <= totalPages; candidate += 1) {
				const response = await queryClient.fetchQuery(notificationInboxQuery({ ...inboxParams, page: candidate }));
				if (response.results.some(item => item.id === highlightId)) {
					setPage(candidate);
					return;
				}
			}
		})().finally(() => {
			locatingHighlight.current = false;
		});
	}, [highlightId, loading, total, pageSize, notifications]);

	const processedNotifications = useMemo(() => {
		if (highlightId && notifications.some(item => item.id === highlightId)) {
			const hit = notifications.find(item => item.id === highlightId)!;
			const rest = notifications.filter(item => item.id !== highlightId);
			return [hit, ...rest];
		}
		return notifications;
	}, [notifications, highlightId]);

	const highlightRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (highlightRef.current) {
			highlightRef.current.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
		}
	}, [processedNotifications, highlightId]);

	const handleRefresh = async () => {
		await queryClient.invalidateQueries({ queryKey: ["notifications", "inbox"] });
	};

	const handleMarkAsRead = async (item: NotificationItem) => {
		try {
			await markReadMutation.mutateAsync({ ids: [item.id], isRead: !item.isRead });
		}
		catch {
			window.$message?.error(t("common.error"));
		}
	};

	const handleMarkAll = async (isRead: boolean) => {
		try {
			await markReadMutation.mutateAsync({ all: true, isRead });
			setPage(1);
			window.$message?.success(t("common.success"));
		}
		catch {
			window.$message?.error(t("common.error"));
		}
	};

	const filterOptions = useMemo(
		() => [
			{
				value: "all",
				label: (
					<span className="flex items-center gap-1.5 px-1 py-0.5 text-xs font-medium">
						<BellOutlined />
						<span>{t("widgets.notificationAll")}</span>
					</span>
				),
			},
			{
				value: "unread",
				label: (
					<span className="flex items-center gap-1.5 px-1 py-0.5 text-xs font-medium">
						<EyeInvisibleOutlined />
						<span>{t("widgets.notificationUnread")}</span>
						{unreadCount > 0 && (
							<span
								className="rounded-full px-1.5 py-0.2 text-[10px] font-bold leading-tight"
								style={{
									backgroundColor: token.colorError,
									color: token.colorWhite,
								}}
							>
								{unreadCount}
							</span>
						)}
					</span>
				),
			},
			{
				value: "read",
				label: (
					<span className="flex items-center gap-1.5 px-1 py-0.5 text-xs font-medium">
						<CheckOutlined />
						<span>{t("widgets.notificationRead")}</span>
					</span>
				),
			},
		],
		[t, unreadCount, token],
	);

	const getCompanyTarget = (item: NotificationItem, link: RelatedContractLink) => {
		const context = { data: getNotificationData(item), serviceCodeById };
		if (hasNotificationRule(item, "PERFORMANCE_MISSING_PREV_MONTH")) {
			const path = buildNotificationPerformanceNewTarget(context, link.entry);
			return path ? { path, label: t("widgets.notificationActionRegisterPerformance") } : null;
		}
		if (link.contractId == null)
			return null;

		const params = new URLSearchParams({ contract_id: String(link.contractId) });
		if (link.serviceId != null)
			params.set("service_id", String(link.serviceId));
		return {
			path:
				buildNotificationContractEditPath(context, {
					...link.entry,
					contract_id: link.contractId,
					service_id: link.serviceId,
				}) ?? `/contracts/list?${params.toString()}`,
			label: t("widgets.notificationActionEditContract"),
		};
	};

	const openCompany = (item: NotificationItem, link: RelatedContractLink) => {
		const target = getCompanyTarget(item, link);
		if (target)
			navigate(target.path);
	};

	const renderPendingAggregate = (item: NotificationItem) => {
		const data = getNotificationData(item);
		const entries = data.aggregate && Array.isArray(data.items) ? (data.items as NotificationEntry[]) : [];
		if (!isPendingAggregateNotification(item) || !entries.length)
			return null;

		const isBusinessApproval = hasNotificationRule(item, "BUSINESS_APPROVAL_PENDING");
		const pageCount = Number(data.items_page_count);
		const previousPage = toPositiveInt(data.items_previous_page);
		const nextPage = toPositiveInt(data.items_next_page);

		return (
			<div
				className="mb-3.5 flex flex-col gap-3 rounded-2xl p-3.5 transition-colors"
				style={{
					backgroundColor: token.colorFillAlter,
					border: `1px solid ${token.colorBorderSecondary}`,
				}}
			>
				<div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5" style={{ borderColor: token.colorBorderSecondary }}>
					<div className="flex items-center gap-2">
						<div
							className="flex h-6 w-6 items-center justify-center rounded-md"
							style={{
								backgroundColor: `${token.colorPrimary}14`,
								color: token.colorPrimary,
							}}
						>
							<FileTextOutlined className="text-xs" />
						</div>
						<Typography.Text strong className="text-sm">
							{t("widgets.notificationPendingItems", { count: Number(data.item_count ?? entries.length) })}
						</Typography.Text>
					</div>
					{data.items_truncated ? (
						<Tag color="warning" className="!m-0 !rounded-md !px-2 !py-0.5 text-xs">
							{t("widgets.notificationPendingTruncated")}
						</Tag>
					) : null}
				</div>

				<div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
					{entries.map((entry, index) => {
						const days = Number(isBusinessApproval ? entry.days_since_creation : entry.days_since_business_approval);
						const isContract = String(entry.object_type ?? "").trim().toLowerCase() === "contract";
						const path = buildNotificationContractEditPath({ data, serviceCodeById }, entry);

						const daysSeverityColor = !Number.isFinite(days)
							? "default"
							: days > 7
								? "error"
								: days > 3
									? "warning"
									: "success";

						return (
							<motion.div key={`${item.id}-pending-${index}`} whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
								<div
									role="button"
									tabIndex={path ? 0 : undefined}
									onClick={() => path && navigate(path)}
									onKeyDown={(e) => {
										if ((e.key === "Enter" || e.key === " ") && path) {
											e.preventDefault();
											navigate(path);
										}
									}}
									className={`flex flex-col gap-2 rounded-xl p-3 transition-all ${
										path ? "cursor-pointer hover:shadow-md" : "opacity-75 cursor-default"
									}`}
									style={{
										backgroundColor: token.colorBgContainer,
										border: `1px solid ${token.colorBorderSecondary}`,
									}}
								>
									<div className="flex items-center justify-between gap-2">
										<Typography.Text strong className="text-sm">
											{isSmsVendorCompany(entry.company_name)
												? t("widgets.notificationSmsVendor")
												: String(entry.company_name ?? "-")}
										</Typography.Text>
										<Tag
											className="!m-0 !border-none !rounded-md !px-2 !py-0.5 !text-[11px]"
											style={{
												backgroundColor: token.colorFillSecondary,
												color: token.colorTextSecondary,
											}}
										>
											{String(entry.service_name ?? "-")}
										</Tag>
									</div>

									<div className="flex items-center justify-between gap-2 text-xs">
										<Typography.Text type="secondary" className="font-mono text-xs">
											{String(entry.contract_number || entry.label || "-")}
										</Typography.Text>
										{Number.isFinite(days) ? (
											<Tag color={daysSeverityColor} className="!m-0 !rounded-md !px-1.5 !py-0 !text-[11px] font-medium">
												{t("widgets.notificationPendingDays", { count: days })}
											</Tag>
										) : null}
									</div>

									<div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor: token.colorBorderSecondary }}>
										<span className="text-[11px] text-gray-500">
											{isContract ? t("widgets.notificationObjectContract") : t("widgets.notificationObjectAddendum")}
										</span>
										{path ? (
											<span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: token.colorPrimary }}>
												<span>{t("widgets.notificationActionEditContract")}</span>
												<LeftOutlined className="text-[9px]" />
											</span>
										) : null}
									</div>
								</div>
							</motion.div>
						);
					})}
				</div>

				{isPendingAggregateFilter && pageCount > 1 ? (
					<div className="mt-1 flex flex-wrap items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: token.colorBorderSecondary }}>
						<Typography.Text type="secondary" className="text-xs">
							{t("widgets.notificationPendingPage", {
								page: toPositiveInt(data.items_page) ?? pendingItemsPage,
								count: pageCount,
							})}
						</Typography.Text>
						<div className="flex items-center gap-2">
							<Button
								size="small"
								icon={<RightOutlined className="text-[10px]" />}
								disabled={loading || !previousPage}
								onClick={() => previousPage && setPendingItemsPage(previousPage)}
								className="!rounded-lg !text-xs"
							>
								{t("widgets.notificationPendingPrevious")}
							</Button>
							<Button
								size="small"
								disabled={loading || !nextPage}
								onClick={() => nextPage && setPendingItemsPage(nextPage)}
								className="!rounded-lg !text-xs !inline-flex !items-center !gap-1"
							>
								<span>{t("widgets.notificationPendingNext")}</span>
								<LeftOutlined className="text-[10px]" />
							</Button>
						</div>
					</div>
				) : null}
			</div>
		);
	};

	return (
		<BasicContent className="h-full !overflow-y-auto !overflow-x-hidden">
			<div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 pb-16">
				{/* Top Hero Card */}
				<motion.div
					initial={{ opacity: 0, y: -12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3 }}
					className="relative overflow-hidden rounded-3xl border p-6 backdrop-blur-sm shadow-sm transition-all"
					style={{
						borderColor: cardBorderColor,
						backgroundColor: token.colorBgContainer,
						boxShadow: token.boxShadowTertiary,
					}}
				>
					<div
						className="pointer-events-none absolute inset-x-0 top-0 h-1.5"
						style={{
							background: `linear-gradient(90deg, ${token.colorPrimary}, ${token.colorPrimaryHover}, ${token.colorInfo})`,
						}}
					/>

					<div className="relative flex flex-wrap items-center justify-between gap-4">
						<div className="flex items-center gap-3.5">
							<div
								className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm"
								style={{
									backgroundColor: `${token.colorPrimary}18`,
									color: token.colorPrimary,
									border: `1px solid ${token.colorPrimaryBorder}`,
								}}
							>
								<Badge dot={unreadCount > 0} offset={[-2, 4]} color={token.colorError}>
									<BellOutlined className="text-2xl" />
								</Badge>
							</div>
							<div className="flex flex-col gap-0.5">
								<div className="flex items-center gap-2.5">
									<Typography.Title level={3} className="!mb-0 text-xl md:text-2xl font-bold">
										{t("widgets.notificationInboxTitle")}
									</Typography.Title>
									{unreadCount > 0 && (
										<span
											className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
											style={{
												backgroundColor: `${token.colorError}18`,
												color: token.colorError,
												border: `1px solid ${token.colorError}33`,
											}}
										>
											{t("widgets.notificationUnreadCount", { count: unreadCount })}
										</span>
									)}
								</div>
								<Typography.Text type="secondary" className="text-xs md:text-sm">
									{t("widgets.notificationInboxSubtitle")}
								</Typography.Text>
							</div>
						</div>

						{/* Action Buttons */}
						<div className="flex flex-wrap items-center gap-2">
							<Button
								icon={<CheckCircleOutlined />}
								onClick={() => handleMarkAll(true)}
								loading={markReadMutation.isPending}
								disabled={!unreadCount}
								type="primary"
								className="!rounded-xl !h-9 !px-3.5 !text-xs md:!text-sm shadow-sm"
							>
								{t("widgets.notificationReadAll")}
							</Button>
							<Button
								icon={<EyeInvisibleOutlined />}
								onClick={() => handleMarkAll(false)}
								loading={markReadMutation.isPending}
								className="!rounded-xl !h-9 !px-3.5 !text-xs md:!text-sm"
							>
								{t("widgets.notificationUnreadAll")}
							</Button>
							<Tooltip title={t("widgets.notificationRefresh")}>
								<Button
									icon={<ReloadOutlined className={loading ? "animate-spin" : ""} />}
									onClick={handleRefresh}
									loading={loading}
									className="!rounded-xl !h-9 !w-9 !p-0"
								/>
							</Tooltip>
						</div>
					</div>
				</motion.div>

				{/* Filter & Categories Bar */}
				<motion.div
					initial={{ opacity: 0, y: -6 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3, delay: 0.05 }}
					className="flex flex-col gap-3 rounded-2xl border p-4 shadow-sm"
					style={{
						borderColor: cardBorderColor,
						backgroundColor: token.colorBgContainer,
					}}
				>
					{/* Status Filter Segmented */}
					<div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3.5" style={{ borderColor: token.colorBorderSecondary }}>
						<div className="flex items-center gap-2">
							<Typography.Text strong className="text-xs text-gray-400">
								وضعیت نمایش:
							</Typography.Text>
							<Segmented
								value={filter}
								onChange={(val) => {
									setFilter(val as NotificationFilter);
									setPage(1);
								}}
								options={filterOptions}
								className="!rounded-xl !p-1"
							/>
						</div>

						<div className="flex items-center gap-2 text-xs text-gray-500">
							<span>مجموع:</span>
							<Tag className="!m-0 !rounded-md !px-2 !py-0 font-bold">{total}</Tag>
						</div>
					</div>

					{/* Category Tabs / Chips */}
					<div className="flex flex-wrap items-center gap-2">
						{visibleCategories.map((category, index) => {
							const isSelected = eventCategory === category.id;
							const catConfig = getCategoryConfig(category.id, token);
							const count = categoryUnreadCounts[index];

							return (
								<motion.button
									key={category.id}
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									type="button"
									onClick={() => {
										setEventCategory(category.id);
										setPage(1);
										setPendingItemsPage(1);
									}}
									className="group inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all"
									style={{
										backgroundColor: isSelected
											? token.colorPrimary
											: token.colorFillAlter,
										color: isSelected ? token.colorWhite : token.colorText,
										border: `1px solid ${
											isSelected ? token.colorPrimary : token.colorBorderSecondary
										}`,
										boxShadow: isSelected ? token.boxShadowSecondary : "none",
									}}
								>
									<span
										className="flex items-center justify-center text-sm"
										style={{
											color: isSelected ? token.colorWhite : catConfig.color,
										}}
									>
										{catConfig.icon}
									</span>
									<span>{t(`widgets.notificationCategory.${category.id}`)}</span>
									{count != null && count > 0 && (
										<span
											className="inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.2 text-[10px] font-bold"
											style={{
												backgroundColor: isSelected
													? "rgba(255, 255, 255, 0.25)"
													: `${token.colorError}1f`,
												color: isSelected ? token.colorWhite : token.colorError,
											}}
										>
											{count}
										</span>
									)}
								</motion.button>
							);
						})}
					</div>
				</motion.div>

				{/* Notifications Container */}
				<motion.div
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.35, delay: 0.1 }}
					className="flex flex-col gap-4 rounded-3xl border p-5 shadow-sm"
					style={{
						borderColor: cardBorderColor,
						backgroundColor: token.colorBgContainer,
						boxShadow: token.boxShadowTertiary,
					}}
				>
					{!processedNotifications.length ? (
						<div className="py-12">
							<Empty
								description={(
									<div className="flex flex-col items-center gap-1.5 mt-2">
										<Typography.Text strong className="text-base">
											{t("widgets.notificationEmpty")}
										</Typography.Text>
										<Typography.Text type="secondary" className="text-xs">
											هیچ اعلانی در این بخش یافت نشد.
										</Typography.Text>
									</div>
								)}
							/>
						</div>
					) : (
						<div className="flex flex-col gap-3.5">
							<AnimatePresence mode="popLayout">
								{processedNotifications.map((item, index) => {
									const isHighlighted = item.id === highlightId;
									const contracts = extractRelatedContracts(item);
									const signFlowPath = hasNotificationRule(item, "REAL_SIGN_FLOW")
										? buildNotificationSignFlowPath(getNotificationData(item))
										: null;
									const catId = resolveNotificationCategoryId(item);
									const catMeta = getCategoryConfig(catId, token);

									return (
										<motion.div
											key={item.id}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, scale: 0.98 }}
											transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
											ref={isHighlighted ? highlightRef : null}
											className="group relative overflow-hidden rounded-2xl border p-4 transition-all duration-200 hover:shadow-md"
											style={{
												borderColor: isHighlighted
													? token.colorError
													: item.isRead
														? token.colorBorderSecondary
														: `${token.colorPrimary}44`,
												borderWidth: isHighlighted ? 2 : 1,
												backgroundColor: isHighlighted
													? `${token.colorError}08`
													: item.isRead
														? token.colorBgContainer
														: `${token.colorPrimary}06`,
												boxShadow: isHighlighted ? token.boxShadowSecondary : token.boxShadowTertiary,
											}}
										>
											{/* Accent Indicator on the start edge */}
											<div
												className="absolute inset-y-0 start-0 w-1.5 rounded-e-full"
												style={{
													backgroundColor: isHighlighted
														? token.colorError
														: item.isRead
															? "transparent"
															: token.colorPrimary,
												}}
											/>

											<div className="relative ps-2">
												{/* Header: Category Badge + Status & Read Toggle */}
												<div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
													<div className="flex items-center gap-2">
														<div
															className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
															style={{
																backgroundColor: catMeta.bg,
																color: catMeta.color,
															}}
														>
															{catMeta.icon}
														</div>
														<Tag
															className="!m-0 !border-none !rounded-md !px-2 !py-0.5 !text-xs font-medium"
															style={{
																backgroundColor: catMeta.bg,
																color: catMeta.color,
															}}
														>
															{t(`widgets.notificationCategory.${catId}`)}
														</Tag>
														{isHighlighted && (
															<Tag color="error" className="!m-0 !rounded-md !px-2 !py-0.5 !text-xs font-bold animate-pulse">
																مورد انتخاب‌شده
															</Tag>
														)}
													</div>

													<div className="flex items-center gap-2">
														<Tag
															color={item.isRead ? "default" : "processing"}
															className="!m-0 !rounded-md !px-2 !py-0.5 !text-xs font-medium"
														>
															{item.isRead ? t("widgets.notificationRead") : t("widgets.notificationUnread")}
														</Tag>

														<Tooltip
															title={
																item.isRead
																	? t("widgets.notificationMarkAsUnread")
																	: t("widgets.notificationMarkAsRead")
															}
														>
															<Button
																type="text"
																size="small"
																icon={item.isRead ? <EyeInvisibleOutlined /> : <EyeOutlined />}
																disabled={markReadMutation.isPending}
																onClick={() => handleMarkAsRead(item)}
																className="!rounded-lg !text-xs text-gray-500 hover:text-primary"
															>
																<span className="hidden sm:inline">
																	{item.isRead
																		? t("widgets.notificationMarkAsUnread")
																		: t("widgets.notificationMarkAsRead")}
																</span>
															</Button>
														</Tooltip>
													</div>
												</div>

												{/* Title */}
												<Typography.Title level={5} className="!mb-1.5 text-base font-semibold">
													{item.title}
												</Typography.Title>

												{/* Body message */}
												<Typography.Paragraph
													className="!mb-3 text-sm leading-relaxed"
													style={{ color: token.colorTextSecondary }}
												>
													{getCompactNotificationBody(item)}
												</Typography.Paragraph>

												{/* Sign Flow Link */}
												{signFlowPath ? (
													<div className="mb-3">
														<Button
															type="primary"
															ghost
															size="small"
															icon={<LinkOutlined />}
															className="!rounded-lg !text-xs"
															onClick={() => navigate(signFlowPath)}
														>
															{t("widgets.notificationViewSignFlow")}
														</Button>
													</div>
												) : null}

												{/* Aggregate details */}
												{renderPendingAggregate(item)}

												{/* Related companies / contracts chips */}
												{contracts.length > 0 ? (
													<div
														className="mb-3.5 flex flex-wrap items-center gap-2 rounded-xl p-2.5"
														style={{
															backgroundColor: token.colorFillAlter,
															border: `1px solid ${token.colorBorderSecondary}`,
														}}
													>
														<span className="text-xs font-semibold text-gray-400">
															{`${t("widgets.notificationRelatedCompanies")}:`}
														</span>
														{contracts.map((contract) => {
															const target = getCompanyTarget(item, contract);
															const companyType = readCompanyTypeCode(contract.entry.company_type);
															return target ? (
																<motion.div key={contract.key} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
																	<Button
																		size="small"
																		type="default"
																		icon={
																			target.label.includes("عملکرد") ? (
																				<FileAddOutlined />
																			) : (
																				<EditOutlined />
																			)
																		}
																		className="!inline-flex !h-auto !items-center !rounded-lg !py-1 !px-2.5 shadow-sm"
																		style={{
																			backgroundColor: token.colorBgContainer,
																			borderColor: token.colorBorderSecondary,
																		}}
																		onClick={() => openCompany(item, contract)}
																	>
																		<span className="font-medium text-xs">
																			{isSmsVendorCompany(contract.companyName)
																				? t("widgets.notificationSmsVendor")
																				: contract.companyName}
																		</span>
																		{companyType ? (
																			<Tag
																				className="!ms-1.5 !me-0 !border-none !px-1.5 !py-0 !text-[11px]"
																				style={{
																					backgroundColor: token.colorFillSecondary,
																					color: token.colorTextSecondary,
																				}}
																			>
																				{t(`widgets.notificationSmsCompanyType.${companyType}`, {
																					defaultValue: companyType,
																				})}
																			</Tag>
																		) : null}
																		<span
																			className="!ms-2 text-[11px] font-semibold"
																			style={{ color: token.colorPrimary }}
																		>
																			{target.label}
																		</span>
																	</Button>
																</motion.div>
															) : (
																<Tag
																	key={contract.key}
																	className="!m-0 !rounded-lg !px-2.5 !py-1 text-xs"
																	style={{
																		backgroundColor: token.colorBgContainer,
																		borderColor: token.colorBorderSecondary,
																	}}
																>
																	{contract.companyName}
																</Tag>
															);
														})}
													</div>
												) : null}

												{/* SMS Gateway Auto Import embedded detail */}
												{hasNotificationRule(item, "SMS_GATEWAY_AUTO_IMPORT") ? (
													<div className="mb-3.5">
														<SmsGatewayAutoImportDetail notification={item} />
													</div>
												) : null}

												{/* Footer info: Date */}
												<div
													className="flex items-center gap-1.5 pt-2 border-t text-xs"
													style={{
														borderColor: token.colorBorderSecondary,
														color: token.colorTextTertiary,
													}}
												>
													<CalendarOutlined className="text-[11px]" />
													<span>{`${t("widgets.notificationSentAt")}: ${formatNotificationDate(item.createdAt)}`}</span>
												</div>
											</div>
										</motion.div>
									);
								})}
							</AnimatePresence>
						</div>
					)}

					{/* Pagination footer */}
					{total > 0 && (
						<div
							className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-4"
							style={{ borderColor: token.colorBorderSecondary }}
						>
							<Typography.Text type="secondary" className="text-xs">
								نمایش
								{" "}
								{((page - 1) * pageSize) + 1}
								{" "}
								تا
								{" "}
								{Math.min(page * pageSize, total)}
								{" "}
								از مجموع
								{" "}
								{total}
								{" "}
								اعلان
							</Typography.Text>

							<Pagination
								current={page}
								pageSize={pageSize}
								total={total}
								showSizeChanger
								pageSizeOptions={["10", "20", "50"]}
								onChange={(nextPage, nextPageSize) => {
									setPage(nextPage);
									setPageSize(nextPageSize);
								}}
								className="!text-xs"
							/>
						</div>
					)}
				</motion.div>
			</div>
		</BasicContent>
	);
}
