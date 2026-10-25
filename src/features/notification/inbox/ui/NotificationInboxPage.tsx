import type { NotificationItem } from "#src/api/notifications/types";
import type { NotificationEventCategoryId } from "../model/notification-events";
import type { NotificationEntry } from "../model/notification-targets";

import { markNotificationInboxState, toPositiveInt } from "#src/api/notifications";
import { BasicContent } from "#src/components";
import { notificationCategoryUnreadCountQuery, notificationInboxQuery, notificationUnreadCountQuery } from "#src/features/notification/queries/notifications.queries";
import { emitNotificationSync, subscribeNotificationSync } from "#src/features/notification/shared/notification-sync";
import { useCardBorderColor } from "#src/shared/lib/use-card-border-color";
import { useUserStore } from "#src/store";
import { CheckOutlined, EyeInvisibleOutlined, LinkOutlined, ReloadOutlined } from "@ant-design/icons";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Empty, Pagination, Tag, theme, Typography } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";

import {
	formatNotificationDate,
	getCompactNotificationBody,
	getNotificationData,
	hasNotificationRule,
	isPendingAggregateNotification,
	isPendingAggregateRuleCode,
	isSmsVendorCompany,
	NOTIFICATION_EVENT_CATEGORIES,
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
	/** the `data.companies` row the link was built from (company id / type for the target forms) */
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

	const upsert = (companyNameRaw: unknown, contractIdRaw?: unknown, serviceIdRaw?: unknown, entry: NotificationEntry = {}) => {
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

export default function NotificationInboxPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { token } = theme.useToken();
	const cardBorderColor = useCardBorderColor();
	const services = useUserStore(state => state.services) ?? [];

	const [filter, setFilter] = useState<NotificationFilter>("all");
	const [searchParams] = useSearchParams();
	const [eventCategory, setEventCategory] = useState<NotificationEventCategoryId>(() => {
		const requested = searchParams.get("category");
		return NOTIFICATION_EVENT_CATEGORIES.find(category => category.id === requested)?.id ?? "all";
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

	const inbox = useQuery(notificationInboxQuery({
		...inboxParams,
		...(isPendingAggregateFilter ? { items_page: pendingItemsPage, items_page_size: PENDING_ITEMS_PAGE_SIZE } : {}),
	}));
	const unreadCountQuery = useQuery(notificationUnreadCountQuery());
	const categoryUnreadCounts = useQueries({
		queries: NOTIFICATION_EVENT_CATEGORIES.map(category => notificationCategoryUnreadCountQuery(category.ruleCode)),
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

	// The highlighted notification can live on another page: walk the pages until it is found (old `pendingFocusId`).
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

	const filterButtons = useMemo(() => ([
		{ key: "all" as const, label: t("widgets.notificationAll") },
		{ key: "read" as const, label: t("widgets.notificationRead") },
		{ key: "unread" as const, label: t("widgets.notificationUnread") },
	]), [t]);

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
			path: buildNotificationContractEditPath(context, { ...link.entry, contract_id: link.contractId, service_id: link.serviceId }) ?? `/contracts/list?${params.toString()}`,
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
		const entries = data.aggregate && Array.isArray(data.items) ? data.items as NotificationEntry[] : [];
		if (!isPendingAggregateNotification(item) || !entries.length)
			return null;

		const isBusinessApproval = hasNotificationRule(item, "BUSINESS_APPROVAL_PENDING");
		const pageCount = Number(data.items_page_count);
		const previousPage = toPositiveInt(data.items_previous_page);
		const nextPage = toPositiveInt(data.items_next_page);

		return (
			<div className="mb-3 flex flex-col gap-2 rounded-xl border border-solid p-3" style={{ borderColor: cardBorderColor }}>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<Typography.Text strong>
						{t("widgets.notificationPendingItems", { count: Number(data.item_count ?? entries.length) })}
					</Typography.Text>
					{data.items_truncated ? <Typography.Text type="warning">{t("widgets.notificationPendingTruncated")}</Typography.Text> : null}
				</div>
				<div className="grid grid-cols-1 gap-2 md:grid-cols-2">
					{entries.map((entry, index) => {
						const days = Number(isBusinessApproval ? entry.days_since_creation : entry.days_since_business_approval);
						const isContract = String(entry.object_type ?? "").trim().toLowerCase() === "contract";
						const path = buildNotificationContractEditPath({ data, serviceCodeById }, entry);
						return (
							<Button
								key={`${item.id}-pending-${index}`}
								block
								className="!flex !h-auto flex-col !items-stretch gap-1 !py-2 !text-start"
								disabled={!path}
								onClick={() => path && navigate(path)}
							>
								<span className="flex items-center justify-between gap-2">
									<Typography.Text strong>{isSmsVendorCompany(entry.company_name) ? t("widgets.notificationSmsVendor") : String(entry.company_name ?? "-")}</Typography.Text>
									<Typography.Text type="secondary">{String(entry.service_name ?? "-")}</Typography.Text>
								</span>
								<span className="flex items-center justify-between gap-2">
									<Typography.Text type="secondary">{String(entry.contract_number || entry.label || "-")}</Typography.Text>
									<Typography.Text type="secondary">{Number.isFinite(days) ? t("widgets.notificationPendingDays", { count: days }) : "-"}</Typography.Text>
								</span>
								<Typography.Text type="secondary">
									{isContract ? t("widgets.notificationObjectContract") : t("widgets.notificationObjectAddendum")}
								</Typography.Text>
							</Button>
						);
					})}
				</div>
				{isPendingAggregateFilter && pageCount > 1
					? (
						<div className="flex flex-wrap items-center justify-between gap-2">
							<Typography.Text type="secondary">
								{t("widgets.notificationPendingPage", { page: toPositiveInt(data.items_page) ?? pendingItemsPage, count: pageCount })}
							</Typography.Text>
							<div className="flex items-center gap-2">
								<Button size="small" disabled={loading || !previousPage} onClick={() => previousPage && setPendingItemsPage(previousPage)}>
									{t("widgets.notificationPendingPrevious")}
								</Button>
								<Button size="small" disabled={loading || !nextPage} onClick={() => nextPage && setPendingItemsPage(nextPage)}>
									{t("widgets.notificationPendingNext")}
								</Button>
							</div>
						</div>
					)
					: null}
			</div>
		);
	};

	return (
		<BasicContent className="h-full !overflow-y-auto !overflow-x-hidden">
			<div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 pb-14">
				<div
					className="relative overflow-hidden rounded-3xl border border-solid bg-[var(--ant-colorBgContainer)] p-5"
					style={{ borderColor: cardBorderColor, boxShadow: token.boxShadowTertiary }}
				>
					<div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-primary" />
					<div className="relative flex flex-wrap items-start justify-between gap-3">
						<div className="flex flex-col gap-1">
							<Typography.Title level={3} className="!mb-0">
								{t("widgets.notificationInboxTitle")}
							</Typography.Title>
							<Typography.Text type="secondary">
								{t("widgets.notificationInboxSubtitle")}
							</Typography.Text>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Button
								icon={<CheckOutlined />}
								onClick={() => handleMarkAll(true)}
								loading={markReadMutation.isPending}
								disabled={!unreadCount}
								type="primary"
							>
								{t("widgets.notificationReadAll")}
							</Button>
							<Button
								icon={<EyeInvisibleOutlined />}
								onClick={() => handleMarkAll(false)}
								loading={markReadMutation.isPending}
							>
								{t("widgets.notificationUnreadAll")}
							</Button>
							<Button
								icon={<ReloadOutlined />}
								onClick={handleRefresh}
								loading={loading}
							>
								{t("widgets.notificationRefresh")}
							</Button>
						</div>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					{NOTIFICATION_EVENT_CATEGORIES.map((category, index) => (
						<Button
							key={category.id}
							type={eventCategory === category.id ? "primary" : "default"}
							shape="round"
							onClick={() => {
								setEventCategory(category.id);
								setPage(1);
								setPendingItemsPage(1);
							}}
						>
							{`${t(`widgets.notificationCategory.${category.id}`)} (${categoryUnreadCounts[index] ?? "…"})`}
						</Button>
					))}
				</div>

				<div className="flex flex-wrap items-center gap-2">
					{filterButtons.map(item => (
						<Button
							key={item.key}
							type={filter === item.key ? "primary" : "default"}
							shape="round"
							onClick={() => {
								setFilter(item.key);
								setPage(1);
							}}
						>
							{item.label}
						</Button>
					))}
				</div>

				<div
					className="rounded-3xl border border-solid bg-[var(--ant-colorBgContainer)] p-4"
					style={{ borderColor: cardBorderColor, boxShadow: token.boxShadowTertiary }}
				>
					<div className="mb-4 flex items-center justify-between">
						<Typography.Title level={4} className="!mb-0 !text-base">
							{t("widgets.notificationUnreadCount", { count: unreadCount })}
						</Typography.Title>
					</div>

					{
						!processedNotifications.length
							? (
								<Empty description={t("widgets.notificationEmpty")} />
							)
							: (
								<div className="flex flex-col gap-3">
									{processedNotifications.map((item) => {
										const contracts = extractRelatedContracts(item);
										const signFlowPath = hasNotificationRule(item, "REAL_SIGN_FLOW") ? buildNotificationSignFlowPath(getNotificationData(item)) : null;
										return (
											<div
												key={item.id}
												ref={item.id === highlightId ? highlightRef : null}
												className="relative overflow-hidden rounded-2xl border border-solid p-4"
												style={{
													borderColor: item.id === highlightId ? token.colorError : cardBorderColor,
													borderWidth: item.id === highlightId ? 2 : undefined,
													boxShadow: token.boxShadowTertiary,
												}}
											>
												<div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-primary" />
												<div className="relative z-10">
													<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
														<Tag color={item.isRead ? "default" : "processing"}>
															{item.isRead ? t("widgets.notificationRead") : t("widgets.notificationUnread")}
														</Tag>
														<Button
															type="link"
															size="small"
															disabled={markReadMutation.isPending}
															onClick={() => handleMarkAsRead(item)}
														>
															{item.isRead ? t("widgets.notificationMarkAsUnread") : t("widgets.notificationMarkAsRead")}
														</Button>
													</div>

													<Typography.Title level={5} className="!mb-2">
														{item.title}
													</Typography.Title>
													<Typography.Paragraph className="!mb-3 !whitespace-pre-wrap">
														{getCompactNotificationBody(item)}
													</Typography.Paragraph>

													{
														signFlowPath
															? (
																<Button className="mb-3" size="small" icon={<LinkOutlined />} onClick={() => navigate(signFlowPath)}>
																	{t("widgets.notificationViewSignFlow")}
																</Button>
															)
															: null
													}

													{renderPendingAggregate(item)}

													{
														contracts.length > 0
															? (
																<div className="mb-3 flex flex-wrap items-center gap-2">
																	<Typography.Text type="secondary">
																		{`${t("widgets.notificationRelatedCompanies")}:`}
																	</Typography.Text>
																	{contracts.map((contract) => {
																		const target = getCompanyTarget(item, contract);
																		const companyType = readCompanyTypeCode(contract.entry.company_type);
																		return target
																			? (
																				<Button
																					key={contract.key}
																					size="small"
																					type="default"
																					icon={<LinkOutlined />}
																					className="!rounded-lg !border-[var(--ant-colorPrimaryBorder)] !bg-[var(--ant-colorBgContainer)]"
																					onClick={() => openCompany(item, contract)}
																				>
																					{isSmsVendorCompany(contract.companyName) ? t("widgets.notificationSmsVendor") : contract.companyName}
																					{companyType ? <Tag className="!ms-2 !me-0">{t(`widgets.notificationSmsCompanyType.${companyType}`, { defaultValue: companyType })}</Tag> : null}
																					<Typography.Text type="secondary" className="!ms-2">{target.label}</Typography.Text>
																				</Button>
																			)
																			: (
																				<Tag key={contract.key} bordered>
																					{contract.companyName}
																				</Tag>
																			);
																	})}
																</div>
															)
															: null
													}

													{hasNotificationRule(item, "SMS_GATEWAY_AUTO_IMPORT") ? <SmsGatewayAutoImportDetail notification={item} /> : null}

													<Typography.Text type="secondary">
														{`${t("widgets.notificationSentAt")}: ${formatNotificationDate(item.createdAt)}`}
													</Typography.Text>
												</div>
											</div>
										);
									})}
								</div>
							)
					}

					{
						total > 0
							? (
								<div className="mt-4 flex justify-end">
									<Pagination
										current={page}
										pageSize={pageSize}
										total={total}
										showSizeChanger
										onChange={(nextPage, nextPageSize) => {
											setPage(nextPage);
											setPageSize(nextPageSize);
										}}
									/>
								</div>
							)
							: null
					}
				</div>
			</div>
		</BasicContent>
	);
}
