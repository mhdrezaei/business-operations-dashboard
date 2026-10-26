import type { ContractServicePath } from "#src/features/contract/api/contracts.api";
import { BasicContent } from "#src/components";

import { fetchContractApprovalHistory, fetchContractDetail } from "#src/features/contract/api/contracts.api";
import { formatHistoryDate } from "#src/features/contract/list/ui/components/contract-approval-history.utils";
import { ContractEditForm } from "#src/features/contract/list/ui/components/ContractDetailModal";
import { getContractAccessCompanyType } from "#src/features/contract/shared/model/company-type-options";
import { buildContractEditPath } from "#src/features/contract/shared/utils/contract-routes";
import { useAccess } from "#src/hooks";
import { ClockCircleOutlined, UserOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Empty, Spin, Tag } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router";

const SERVICES = new Set<ContractServicePath>([
	"openapi",
	"traffic",
	"psp",
	"commercial",
	"shahkar",
	"sales-agency/outbound",
	"sales-agency/rep-management",
	"sms/client",
	"sms/vendor",
	"sms-commission",
	"telecom-frame",
]);

function parseId(value: string | undefined | null) {
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
}

export default function ContractPreviewPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { hasDomainPermissionByServiceId } = useAccess();
	const { contractId: idParam } = useParams();
	const [params] = useSearchParams();
	const routeContractId = parseId(idParam);
	const serviceParam = params.get("service") as ContractServicePath | null;
	const routeService = serviceParam && SERVICES.has(serviceParam) ? serviceParam : null;
	const routeServiceId = parseId(params.get("serviceId"));
	const routeCompanyType = params.get("companyType") ?? "";
	const [selection, setSelection] = useState(() => ({
		contractId: routeContractId,
		service: routeService,
		serviceId: routeServiceId,
		companyType: routeCompanyType,
	}));
	const { contractId, service, serviceId, companyType } = selection;
	const detail = useQuery({
		queryKey: ["contracts", "preview-status", service, contractId],
		enabled: service != null && contractId != null,
		queryFn: () => fetchContractDetail(service!, contractId!),
	});
	const approvalHistory = useQuery({
		queryKey: ["contracts", "preview-approval-history", service, contractId],
		enabled: service != null && contractId != null,
		queryFn: () => fetchContractApprovalHistory(service!, contractId!),
	});
	const contract = (detail.data ?? {}) as Record<string, unknown>;
	const isSigned = contract.is_signed === true;
	const isBusinessApproved = contract.is_business_approved === true;
	const accessCompanyType = getContractAccessCompanyType(service, companyType);
	const canUpdate = serviceId != null && hasDomainPermissionByServiceId("contracts", "update", serviceId, accessCompanyType);
	const canView = serviceId != null && hasDomainPermissionByServiceId("contracts", "view", serviceId, accessCompanyType);
	const latestHistory = [...(approvalHistory.data?.sign_approval_history ?? [])]
		.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())[0];
	const latestField = latestHistory?.field_name ?? (isSigned ? "is_signed" : "is_business_approved");
	const latestValue = latestHistory?.new_value ?? (latestField === "is_signed" ? isSigned : isBusinessApproved);
	const latestStatusTitle = latestField === "is_signed" ? t("contract.list.column.isSigned") : t("contract.list.column.isBusinessApproved");
	const latestStatusText = latestValue === true ? t("contract.list.approval.approved") : latestValue === false ? t("contract.list.approval.rejected") : t("contract.preview.unknown");
	const updatedBy = contract.updated_by_user as Record<string, unknown> | undefined;
	const createdBy = contract.created_by_user as Record<string, unknown> | undefined;
	const latestActor = latestHistory?.changed_by?.name ?? String(updatedBy?.name ?? createdBy?.name ?? "—");
	const latestDate = latestHistory?.changed_at ?? String(contract.updated_at ?? contract.created_at ?? "");

	if (!contractId || !service || !serviceId)
		return <Empty description={t("contract.preview.invalidRoute")} />;

	if (!canView)
		return <Navigate to="/contracts/list" replace />;

	const editUrl = buildContractEditPath({ contractId, service, serviceId, companyType });

	return (
		<BasicContent className="min-h-full">
			<div dir="rtl" className="flex w-full flex-col gap-4">
				<ContractEditForm
					contractId={contractId}
					service={service}
					readOnly
					readOnlyHeader={(
						<Spin spinning={detail.isFetching || approvalHistory.isFetching} size="small" className="block w-full">
							<Card className="h-[88px] w-full [&_.ant-card-body]:box-border [&_.ant-card-body]:flex [&_.ant-card-body]:h-full [&_.ant-card-body]:items-center [&_.ant-card-body]:px-6 [&_.ant-card-body]:py-0">
								<div className="flex w-full items-center justify-between gap-4">
									<div className="flex flex-wrap items-center gap-x-5 gap-y-2">
										<div className="flex items-center gap-2">
											<span className="text-sm text-[var(--ant-color-text-secondary)]">{t("contract.preview.latestStatus")}</span>
											<span className="text-base font-semibold">{latestStatusTitle}</span>
											<Tag bordered={false} color={latestValue === true ? "success" : latestValue === false ? "error" : "default"}>{latestStatusText}</Tag>
										</div>
										<div className="flex items-center gap-2 text-sm text-[var(--ant-color-text-secondary)]">
											<UserOutlined className="text-base" />
											<span className="text-[var(--ant-color-text)]">{latestActor}</span>
										</div>
										{latestDate
											? (
												<div className="flex items-center gap-2 text-sm text-[var(--ant-color-text-secondary)]" dir="ltr">
													<span>{formatHistoryDate(latestDate)}</span>
													<ClockCircleOutlined className="text-base" />
												</div>
											)
											: null}
									</div>
									{canUpdate
										? <Button size="large" className="!h-10 !w-28 !whitespace-nowrap !border-primary !px-4 !text-primary" onClick={() => navigate(editUrl)}>{t("contract.list.actions.edit")}</Button>
										: null}
								</div>
							</Card>
						</Spin>
					)}
					onContractSelect={(selectedContractId, selectedServiceId, selectedCompanyType, selectedService) => {
						setSelection({
							contractId: selectedContractId,
							serviceId: selectedServiceId,
							companyType: selectedCompanyType ?? "",
							service: selectedService,
						});
					}}
				/>
			</div>
		</BasicContent>
	);
}
