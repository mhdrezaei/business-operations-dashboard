import type { NotificationItem } from "#src/api/notifications/types";
import { markNotificationInboxState } from "#src/api/notifications";
import { BasicContent } from "#src/components";
import { notificationInboxQuery, notificationUnreadCountQuery } from "#src/features/notification/queries/notifications.queries";
import { emitNotificationSync, subscribeNotificationSync } from "#src/features/notification/shared/notification-sync";
import { dayjs } from "#src/shared/lib/dayjs-jalali";
import { CheckOutlined, LinkOutlined, ReloadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Empty, Pagination, Tag, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

type NotificationFilter = "all" | "read" | "unread";

interface RelatedContractLink {
	key: string
	companyName: string
	contractId: number | null
	serviceId: number | null
}

function resolveReadFilter(filter: NotificationFilter) {
	if (filter === "read")
		return true;
	if (filter === "unread")
		return false;
	return undefined;
}

function toPositiveInt(value: unknown) {
	const numeric = Number(value);
	return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function formatNotificationDate(dateText: string | null | undefined) {
	const raw = String(dateText ?? "").trim();
	if (!raw)
		return "-";

	const parsed = dayjs(raw);
	if (!parsed.isValid())
		return raw;

	return parsed.format("YYYY/MM/DD HH:mm");
}

function extractRelatedContracts(item: NotificationItem): RelatedContractLink[] {
	const raw = item.raw as Record<string, unknown>;
	const rawData = (raw.data ?? {}) as Record<string, unknown>;
	const defaultServiceId = toPositiveInt(rawData.service_id ?? raw.service_id);

	const map = new Map<string, RelatedContractLink>();

	const upsert = (companyNameRaw: unknown, contractIdRaw?: unknown, serviceIdRaw?: unknown) => {
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

	const [filter, setFilter] = useState<NotificationFilter>("all");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);

	const inbox = useQuery(notificationInboxQuery({
		page,
		page_size: pageSize,
		is_read: resolveReadFilter(filter),
		channel: "IN_APP",
	}));
	const unreadCountQuery = useQuery(notificationUnreadCountQuery());

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

	const notifications = inbox.data?.results ?? [];
	const unreadCount = unreadCountQuery.data ?? 0;
	const total = inbox.data?.count ?? 0;
	const loading = inbox.isLoading || inbox.isFetching;
	const unreadIdsOnPage = useMemo(
		() => notifications.filter(item => !item.isRead).map(item => item.id),
		[notifications],
	);

	const handleRefresh = async () => {
		await Promise.all([
			inbox.refetch(),
			unreadCountQuery.refetch(),
		]);
	};

	const handleMarkAsRead = async (item: NotificationItem) => {
		try {
			await markReadMutation.mutateAsync({ ids: [item.id], isRead: !item.isRead });
		}
		catch {
			window.$message?.error(t("common.error"));
		}
	};

	const handleMarkAllOnPageRead = async () => {
		if (!unreadIdsOnPage.length)
			return;

		try {
			await markReadMutation.mutateAsync({ ids: unreadIdsOnPage, isRead: true });
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

	return (
		<BasicContent className="h-full !overflow-y-auto !overflow-x-hidden">
			<div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 pb-14">
				<div className="relative overflow-hidden rounded-3xl border border-[var(--ant-colorPrimaryBorder)] bg-[var(--ant-colorBgContainer)] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.2)]">
					<div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
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
								onClick={handleMarkAllOnPageRead}
								loading={markReadMutation.isPending}
								disabled={!unreadIdsOnPage.length}
								type="primary"
							>
								{t("widgets.notificationReadAllOnPage")}
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

				<div className="rounded-3xl border border-[var(--ant-colorPrimaryBorder)] bg-[var(--ant-colorBgContainer)] p-4 shadow-[0_18px_42px_rgba(15,23,42,0.16)]">
					<div className="mb-4 flex items-center justify-between">
						<Typography.Title level={4} className="!mb-0 !text-base">
							{t("widgets.notificationUnreadCount", { count: unreadCount })}
						</Typography.Title>
					</div>

					{
						!notifications.length
							? (
								<Empty description={t("widgets.notificationEmpty")} />
							)
							: (
								<div className="flex flex-col gap-3">
									{notifications.map((item) => {
										const contracts = extractRelatedContracts(item);
										return (
											<div
												key={item.id}
												className="relative overflow-hidden rounded-2xl border border-[var(--ant-colorPrimaryBorder)] bg-[var(--ant-colorBgElevated)] p-4 shadow-[0_14px_32px_rgba(15,23,42,0.2)]"
											>
												<div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
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
														{item.message}
													</Typography.Paragraph>

													{
														contracts.length > 0
															? (
																<div className="mb-3 flex flex-wrap items-center gap-2">
																	<Typography.Text type="secondary">
																		{`${t("widgets.notificationRelatedCompanies")}:`}
																	</Typography.Text>
																	{contracts.map(contract => (
																		contract.contractId != null
																			? (
																				<Button
																					key={contract.key}
																					size="small"
																					type="default"
																					icon={<LinkOutlined />}
																					className="!rounded-lg !border-[var(--ant-colorPrimaryBorder)] !bg-[var(--ant-colorBgContainer)]"
																					onClick={() => {
																						const params = new URLSearchParams();
																						params.set("contract_id", String(contract.contractId));
																						if (contract.serviceId != null)
																							params.set("service_id", String(contract.serviceId));
																						navigate(`/contracts/edit?${params.toString()}`);
																					}}
																				>
																					{contract.companyName}
																				</Button>
																			)
																			: (
																				<Tag key={contract.key} bordered>
																					{contract.companyName}
																				</Tag>
																			)
																	))}
																</div>
															)
															: null
													}

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
