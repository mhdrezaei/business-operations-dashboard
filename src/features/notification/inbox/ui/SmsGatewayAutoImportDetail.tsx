import type { NotificationItem } from "#src/api/notifications/types";
import type { ContractCreateRouteState } from "#src/features/contract/shared/utils/contract-routes";
import type { NotificationEntry } from "../model/notification-targets";

import { toPositiveInt } from "#src/api/notifications";
import { MONTH_OPTIONS } from "#src/features/contract/constant/jalali-date-options";
import { useCardBorderColor } from "#src/shared/lib/use-card-border-color";
import { useUserStore } from "#src/store";
import { ExportOutlined } from "@ant-design/icons";
import { Button, Tag, Typography } from "antd";
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
	onOpen: (entry: NotificationEntry) => void
}

function CompanySection({ title, entries, linkLabel, onOpen }: SectionProps) {
	const { t } = useTranslation();
	if (!entries.length)
		return null;

	return (
		<div className="flex flex-col gap-2">
			<Typography.Text strong>{title}</Typography.Text>
			<div className="flex flex-wrap gap-2">
				{entries.map((entry, index) => {
					const companyType = readCompanyTypeCode(entry.company_type);
					const gatewayName = String(entry.gateway_customer_name ?? "").trim();
					return (
						<Button key={String(entry.company_id ?? index)} size="small" icon={<ExportOutlined />} onClick={() => onOpen(entry)}>
							{String(entry.company_name ?? "-")}
							{companyType ? <Tag className="!ms-2 !me-0">{t(`widgets.notificationSmsCompanyType.${companyType}`, { defaultValue: companyType })}</Tag> : null}
							{gatewayName ? <Typography.Text type="secondary" className="!ms-2">{`(${gatewayName})`}</Typography.Text> : null}
							<Typography.Text type="secondary" className="!ms-2">{linkLabel}</Typography.Text>
						</Button>
					);
				})}
			</div>
		</div>
	);
}

export function SmsGatewayAutoImportDetail({ notification }: { notification: NotificationItem }) {
	const { t } = useTranslation();
	const navigate = useNavigate();
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
		<div className="mt-3 flex flex-col gap-3 rounded-xl border border-solid p-3" style={{ borderColor: cardBorderColor }}>
			<Typography.Text strong>
				{t("widgets.notificationSmsImport.title", { month: `${monthLabel} ${year ?? ""}` })}
				{isCommission ? <Tag className="!ms-2">{t("widgets.notificationSmsImport.commission")}</Tag> : null}
				{suffix === "sms" ? <Tag className="!ms-2">{t("widgets.notificationSmsImport.sms")}</Tag> : null}
				{suffix === "sms_unmapped" ? <Tag color="error" className="!ms-2">{t("widgets.notificationSmsImport.unmappedTag")}</Tag> : null}
			</Typography.Text>

			{suffix === "sms_unmapped"
				? (
					unmapped.length
						? (
							<div className="flex flex-col gap-2">
								<Typography.Text strong type="danger">{t("widgets.notificationSmsImport.unmapped", { count: unmapped.length })}</Typography.Text>
								<div className="flex flex-wrap gap-2">
									{unmapped.map(name => (
										<Button key={name} size="small" danger onClick={() => navigate("/company/management", { state: { gatewayCustomerSearch: name } })}>
											{name}
										</Button>
									))}
								</div>
							</div>
						)
						: null
				)
				: (
					<>
						<CompanySection
							title={t("widgets.notificationSmsImport.imported", { count: imported.length })}
							entries={imported}
							linkLabel={t("widgets.notificationSmsImport.editPerformance")}
							onOpen={() => navigate("/performances/edit")}
						/>
						<CompanySection
							title={t("widgets.notificationSmsImport.updated", { count: updated.length })}
							entries={updated}
							linkLabel={t("widgets.notificationSmsImport.editPerformance")}
							onOpen={() => navigate("/performances/edit")}
						/>
						<CompanySection
							title={t("widgets.notificationSmsImport.noContract", { count: noContract.length })}
							entries={noContract}
							linkLabel={t("widgets.notificationSmsImport.createContract")}
							onOpen={openContractNew}
						/>
					</>
				)}
		</div>
	);
}
