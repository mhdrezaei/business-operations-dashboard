import type { ContractListRow } from "#src/features/dashboard/api/dashboard.dto";
import type { ApprovalKind, ApprovalState } from "./approval-segments";
import { companyTypeLabel } from "#src/features/dashboard/model/company-type";
import { formatCount } from "#src/features/dashboard/model/format";
import { dateText } from "#src/features/dashboard/model/jalali";
import { scopedWidgetQuery } from "#src/features/dashboard/queries/dashboard.queries";
import { RiTaskLine } from "#src/features/dashboard/ui/icons";
import { DashboardModal } from "#src/features/dashboard/ui/modal/DashboardModal";
import { APPROVAL_STAGE_TAG, ListMessage, ModalBody, PAGE_SIZE, PagerBar, StatusTag, TABLE, TABLE_WRAP, TBODY_ROW, TD, TH, THEAD_ROW } from "#src/features/dashboard/ui/modal/list-parts";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { approvalStateLabel } from "./approval-segments";

/** What a number of the card stands for. No state = the total of that part; no serviceId = all permitted services. */
export interface ApprovalDetailsTarget {
	approval: ApprovalKind
	state?: ApprovalState
	serviceId?: number
	serviceName?: string
	serviceCode?: string
	companyType?: string
}

interface ApprovalDetailsModalProps {
	target: ApprovalDetailsTarget | null
	onClose: () => void
}

function targetKey(target: ApprovalDetailsTarget | null) {
	return target ? [target.approval, target.state ?? "", target.serviceId ?? "", target.companyType ?? ""].join("|") : "";
}

function detailsParams(target: ApprovalDetailsTarget | null, page: number) {
	return target
		? {
			approval: target.approval,
			state: target.state,
			service_id: target.serviceId,
			company_type: target.companyType,
			page,
			page_size: PAGE_SIZE,
		}
		: {};
}

function useApprovalTitle() {
	const { t } = useTranslation();
	return (target: ApprovalDetailsTarget) => {
		const kind = t(`dashboard.approval.kinds.${target.approval}`);
		// "Approved" and "all" are ambiguous without the field name; the "pending …" labels speak for themselves.
		let head: string;
		if (!target.state)
			head = t("dashboard.widgets.approval.modal.allOf", { kind });
		else if (target.state === "approved")
			head = t("dashboard.widgets.approval.modal.stateOf", { state: approvalStateLabel(target.approval, target.state), kind });
		else
			head = approvalStateLabel(target.approval, target.state);
		const parts = [
			head,
			target.serviceId != null
				? t("dashboard.widgets.approval.modal.service", { name: target.serviceName ?? target.serviceId })
				: t("dashboard.widgets.approval.modal.allServices"),
		];
		if (target.companyType)
			parts.push(companyTypeLabel(target.serviceCode, target.companyType) ?? target.companyType);
		return parts.join(" — ");
	};
}

function TriState({ value }: { value: boolean | null }) {
	const { t } = useTranslation();
	return value === true
		? <span className="text-success">{t("dashboard.approval.approved")}</span>
		: <span className="text-warning">{t("dashboard.approval.pending")}</span>;
}

/** Drill-down of the approval card: contracts and addenda behind one number (`is_signed` = contract-office approval). */
export function ApprovalDetailsModal({ target, onClose }: ApprovalDetailsModalProps) {
	const { t } = useTranslation();
	const buildTitle = useApprovalTitle();
	const topRef = useRef<HTMLDivElement>(null);
	const key = targetKey(target);
	// The page is bound to the target: a new target starts at page 1 without an extra request.
	const [pageState, setPageState] = useState({ key, page: 1 });
	const page = pageState.key === key ? pageState.page : 1;

	const q = useQuery(scopedWidgetQuery("contracts-approval-status-details", detailsParams(target, page), !!target));

	const denied = q.data === null;
	const error = q.isError ? q.error.message || t("dashboard.common.listError") : null;
	const data = q.data ?? undefined;
	const loading = q.isFetching;
	const rows: ContractListRow[] = data?.results ?? [];
	const totalPages = data?.total_pages ?? 1;

	let viewKey = `data-${key}-${data?.page}`;
	if (denied)
		viewKey = "denied";
	else if (error)
		viewKey = "error";
	else if (!data)
		viewKey = "wait";

	let body;
	if (denied) {
		body = <ListMessage>{t("dashboard.common.listDenied")}</ListMessage>;
	}
	else if (error) {
		body = <ListMessage tone="error">{error}</ListMessage>;
	}
	else if (!data) {
		body = <ListMessage>{t("dashboard.common.listWaiting")}</ListMessage>;
	}
	else if (rows.length === 0) {
		body = <ListMessage>{t("dashboard.common.listEmpty")}</ListMessage>;
	}
	else {
		body = (
			<div className={`flex flex-col gap-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
				<div className={TABLE_WRAP}>
					<table className={`${TABLE} min-w-[900px]`}>
						<thead>
							<tr className={THEAD_ROW}>
								<th className={TH}>{t("dashboard.widgets.approval.columns.type")}</th>
								<th className={TH}>{t("dashboard.columns.contractNumber")}</th>
								<th className={TH}>{t("dashboard.columns.company")}</th>
								<th className={TH}>{t("dashboard.columns.companyType")}</th>
								<th className={TH}>{t("dashboard.columns.startDate")}</th>
								<th className={TH}>{t("dashboard.columns.endDate")}</th>
								<th className={TH}>{t("dashboard.widgets.approval.columns.stage")}</th>
								<th className={TH}>{t("dashboard.approval.kinds.business")}</th>
								<th className={TH}>{t("dashboard.approval.kinds.sign")}</th>
							</tr>
						</thead>
						<tbody>
							{rows.map(r => (
								<tr key={`${r.kind}-${r.addendum_group_id ?? r.id}`} className={TBODY_ROW}>
									<td className={`${TD} whitespace-nowrap`}>
										<StatusTag color={r.kind === "addendum" ? "purple" : "default"}>
											{r.kind === "addendum" ? t("dashboard.contract.addendum") : t("dashboard.contract.contract")}
										</StatusTag>
									</td>
									<td className={`${TD} whitespace-nowrap`}>
										<div>{r.contract_number || "—"}</div>
										{r.kind === "addendum" && r.display_addendum_number && (
											<div className="text-[11.5px] text-colorTextSecondary">{r.display_addendum_number}</div>
										)}
									</td>
									<td className={TD}>
										<div className="[overflow-wrap:anywhere]">{r.company_name || "—"}</div>
										<div className="text-[11.5px] text-colorTextSecondary">{r.service_name}</div>
									</td>
									<td className={`${TD} whitespace-nowrap`}>{r.company_type ? companyTypeLabel(r.service_code, r.company_type) : "—"}</td>
									<td className={`${TD} whitespace-nowrap`}>{dateText(r.start_date, r.start_sh_year, r.start_sh_month)}</td>
									<td className={`${TD} whitespace-nowrap`}>{dateText(r.end_date, r.end_sh_year, r.end_sh_month)}</td>
									<td className={TD}>
										<StatusTag color={APPROVAL_STAGE_TAG[r.approval_stage] ?? APPROVAL_STAGE_TAG.pending_business_approval}>
											{t(`dashboard.approval.stages.${r.approval_stage}`, { defaultValue: r.approval_stage })}
										</StatusTag>
									</td>
									<td className={`${TD} whitespace-nowrap`}><TriState value={r.is_business_approved} /></td>
									<td className={`${TD} whitespace-nowrap`}><TriState value={r.is_signed} /></td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		);
	}

	return (
		<DashboardModal
			isOpen={!!target}
			onClose={onClose}
			title={target ? buildTitle(target) : ""}
			maxWidth="max-w-6xl"
			icon={RiTaskLine}
			count={data ? t("dashboard.common.itemsCount", { value: formatCount(data.count) }) : null}
		>
			<div ref={topRef} />
			<ModalBody viewKey={viewKey}>{body}</ModalBody>
			{!denied && !error && data && rows.length > 0 && totalPages > 1 && (
				<PagerBar
					page={page}
					totalPages={totalPages}
					shownPage={data.page}
					loading={loading}
					onChange={next => setPageState({ key, page: next })}
					topRef={topRef}
					total={data.count}
					pageSize={PAGE_SIZE}
				/>
			)}
		</DashboardModal>
	);
}
