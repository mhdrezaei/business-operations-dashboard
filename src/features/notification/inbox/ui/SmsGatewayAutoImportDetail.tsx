import type { NotificationItem } from "#src/api/notifications/types";
import type { ContractCreateRouteState } from "#src/features/contract/shared/utils/contract-routes";
import type { NotificationEntry } from "../model/notification-targets";

import { toPositiveInt } from "#src/api/notifications";
import { MONTH_OPTIONS } from "#src/features/contract/constant/jalali-date-options";
import { useCardBorderColor } from "#src/shared/lib/use-card-border-color";
import { useUserStore } from "#src/store";
import {
	AlertOutlined,
	CheckCircleOutlined,
	EditOutlined,
	ExportOutlined,
	FileAddOutlined,
	MessageOutlined,
	SyncOutlined,
} from "@ant-design/icons";
import { Button, Tag, theme, Typography } from "antd";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { getNotificationData } from "../model/notification-events";
import { readCompanyTypeCode } from "../model/notification-targets";

type SmsImportSuffix = "sms" | "sms_commission" | "sms_unmapped";

function readEntries(value: unknown): NotificationEntry[] {
	return Array.isArray(value) ? value.filter((entry): entry is NotificationEntry => Boolean(entry) && typeof entry === "object") : [];
}

interface SectionProps {
	title: string
	entries: NotificationEntry[]
	linkLabel: string
	icon: React.ReactNode
	actionIcon: React.ReactNode
	badgeColor: string
	onOpen: (entry: NotificationEntry) => void
}

function CompanySection({ title, entries, linkLabel, icon, actionIcon, badgeColor, onOpen }: SectionProps) {
	const { t } = useTranslation();
	const { token } = theme.useToken();

	if (!entries.length)
		return null;

	return (
		<div
			className="flex flex-col gap-2.5 rounded-xl p-3 transition-colors"
			style={{
				backgroundColor: token.colorFillAlter,
				border: `1px solid ${token.colorBorderSecondary}`,
			}}
		>
			<div className="flex items-center gap-2">
				<span className="flex items-center justify-center text-sm" style={{ color: badgeColor }}>
					{icon}
				</span>
				<Typography.Text strong className="text-sm">
					{title}
				</Typography.Text>
				<span
					className="rounded-full px-2 py-0.5 text-xs font-semibold"
					style={{
						backgroundColor: `${badgeColor}18`,
						color: badgeColor,
					}}
				>
					{entries.length}
				</span>
			</div>

			<div className="flex flex-wrap gap-2">
				{entries.map((entry, index) => {
					const companyType = readCompanyTypeCode(entry.company_type);
					const gatewayName = String(entry.gateway_customer_name ?? "").trim();
					return (
						<motion.div
							key={String(entry.company_id ?? index)}
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
						>
							<Button
								size="small"
								icon={actionIcon}
								onClick={() => onOpen(entry)}
								className="!inline-flex !h-auto !items-center !py-1 !px-2.5 !rounded-lg"
								style={{
									backgroundColor: token.colorBgContainer,
									borderColor: token.colorBorderSecondary,
								}}
							>
								<span className="font-medium text-xs">
									{String(entry.company_name ?? "-")}
								</span>
								{companyType ? (
									<Tag
										className="!ms-1.5 !me-0 !px-1.5 !py-0 !text-[11px] !border-none"
										style={{
											backgroundColor: token.colorFillSecondary,
											color: token.colorTextSecondary,
										}}
									>
										{t(`widgets.notificationSmsCompanyType.${companyType}`, { defaultValue: companyType })}
									</Tag>
								) : null}
								{gatewayName ? (
									<Typography.Text type="secondary" className="!ms-1.5 !text-[11px]">
										{`(${gatewayName})`}
									</Typography.Text>
								) : null}
								<span className="!ms-2 flex items-center gap-1 text-[11px] font-medium" style={{ color: token.colorPrimary }}>
									{linkLabel}
								</span>
							</Button>
						</motion.div>
					);
				})}
			</div>
		</div>
	);
}

export function SmsGatewayAutoImportDetail({ notification }: { notification: NotificationItem }) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { token } = theme.useToken();
	const cardBorderColor = useCardBorderColor();
	const services = useUserStore(state => state.services) ?? [];

	const data = getNotificationData(notification);
	const suffix = String(data.event_suffix ?? "").toLowerCase() as SmsImportSuffix;
	const year = toPositiveInt(data.sh_year);
	const month = toPositiveInt(data.sh_month);
	const isCommission = suffix === "sms_commission";
	const serviceCode = isCommission ? "sms_commission" : "sms";

	const imported = readEntries(data.imported);
	const updated = readEntries(data.updated);
	const noContract = readEntries(data.no_contract);
	const unmapped = Array.isArray(data.unmapped) ? data.unmapped.map(String) : [];
	if (!imported.length && !updated.length && !noContract.length && !unmapped.length)
		return null;

	const monthLabel = MONTH_OPTIONS.find(option => option.value === month)?.label ?? String(month ?? "");
	const smsServiceId = services.find(service => service.code === serviceCode)?.id ?? null;

	const openContractNew = (entry: NotificationEntry) => {
		const companyType = readCompanyTypeCode(entry.company_type);
		const state: ContractCreateRouteState = {
			serviceId: smsServiceId,
			companyId: toPositiveInt(entry.company_id),
			companyType: !isCommission && companyType ? companyType : null,
			counterpartyType: isCommission ? null : "partners",
		};
		navigate("/contracts/new", { state });
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.25 }}
			className="mt-3 flex flex-col gap-3 rounded-2xl border p-4 shadow-sm"
			style={{
				borderColor: cardBorderColor,
				backgroundColor: token.colorBgContainer,
				boxShadow: token.boxShadowTertiary,
			}}
		>
			<div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3" style={{ borderColor: token.colorBorderSecondary }}>
				<div className="flex items-center gap-2">
					<div
						className="flex h-8 w-8 items-center justify-center rounded-lg"
						style={{
							backgroundColor: `${token.colorPrimary}14`,
							color: token.colorPrimary,
						}}
					>
						<MessageOutlined className="text-base" />
					</div>
					<Typography.Text strong className="text-sm">
						{t("widgets.notificationSmsImport.title", { month: `${monthLabel} ${year ?? ""}` })}
					</Typography.Text>
				</div>

				<div className="flex flex-wrap items-center gap-1.5">
					{isCommission ? (
						<Tag color="purple" className="!m-0 !rounded-md !px-2 !py-0.5 !text-xs font-medium">
							{t("widgets.notificationSmsImport.commission")}
						</Tag>
					) : null}
					{suffix === "sms" ? (
						<Tag color="blue" className="!m-0 !rounded-md !px-2 !py-0.5 !text-xs font-medium">
							{t("widgets.notificationSmsImport.sms")}
						</Tag>
					) : null}
					{suffix === "sms_unmapped" ? (
						<Tag color="error" className="!m-0 !rounded-md !px-2 !py-0.5 !text-xs font-medium">
							{t("widgets.notificationSmsImport.unmappedTag")}
						</Tag>
					) : null}
				</div>
			</div>

			{suffix === "sms_unmapped" ? (
				unmapped.length ? (
					<div
						className="flex flex-col gap-2.5 rounded-xl p-3.5"
						style={{
							backgroundColor: `${token.colorError}0d`,
							border: `1px solid ${token.colorError}33`,
						}}
					>
						<div className="flex items-center gap-2">
							<AlertOutlined style={{ color: token.colorError }} />
							<Typography.Text strong type="danger" className="text-sm">
								{t("widgets.notificationSmsImport.unmapped", { count: unmapped.length })}
							</Typography.Text>
						</div>
						<div className="flex flex-wrap gap-2">
							{unmapped.map(name => (
								<motion.div key={name} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
									<Button
										size="small"
										danger
										icon={<ExportOutlined />}
										className="!rounded-lg !text-xs"
										onClick={() => navigate("/company/management", { state: { gatewayCustomerSearch: name } })}
									>
										{name}
									</Button>
								</motion.div>
							))}
						</div>
					</div>
				) : null
			) : (
				<div className="flex flex-col gap-2.5">
					<CompanySection
						title={t("widgets.notificationSmsImport.imported", { count: imported.length })}
						entries={imported}
						icon={<CheckCircleOutlined />}
						actionIcon={<EditOutlined />}
						badgeColor={token.colorSuccess}
						linkLabel={t("widgets.notificationSmsImport.editPerformance")}
						onOpen={() => navigate("/performances/edit")}
					/>
					<CompanySection
						title={t("widgets.notificationSmsImport.updated", { count: updated.length })}
						entries={updated}
						icon={<SyncOutlined />}
						actionIcon={<EditOutlined />}
						badgeColor={token.colorInfo}
						linkLabel={t("widgets.notificationSmsImport.editPerformance")}
						onOpen={() => navigate("/performances/edit")}
					/>
					<CompanySection
						title={t("widgets.notificationSmsImport.noContract", { count: noContract.length })}
						entries={noContract}
						icon={<FileAddOutlined />}
						actionIcon={<ExportOutlined />}
						badgeColor={token.colorWarning}
						linkLabel={t("widgets.notificationSmsImport.createContract")}
						onOpen={openContractNew}
					/>
				</div>
			)}
		</motion.div>
	);
}
