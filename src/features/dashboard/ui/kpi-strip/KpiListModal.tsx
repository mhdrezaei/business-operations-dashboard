import type { CompanyListRow, ContractListRow, KpiListKey } from "#src/features/dashboard/api/dashboard.dto";
import { formatCount } from "#src/features/dashboard/model/format";
import { dateText, jalaliFull } from "#src/features/dashboard/model/jalali";
import { serviceIdsParam } from "#src/features/dashboard/model/types";
import { widgetDataQuery } from "#src/features/dashboard/queries/dashboard.queries";
import { RiFileTextLine } from "#src/features/dashboard/ui/icons";
import { DashboardModal } from "#src/features/dashboard/ui/modal/DashboardModal";
import {
	APPROVAL_STAGE_TAG,
	ListMessage,
	ModalBody,
	PAGE_SIZE,
	PagerBar,
	REAL_SIGN_STATE_TAG,
	ServiceCell,
	StatusTag,
	TABLE,
	TABLE_WRAP,
	TBODY_ROW,
	TD,
	TH,
	THEAD_ROW,
} from "#src/features/dashboard/ui/modal/list-parts";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export interface KpiListTarget {
	key: KpiListKey
	title: string
}

const SUB_TEXT = "text-[11.5px] text-colorTextSecondary";

function ContractsTable({ rows }: { rows: ContractListRow[] }) {
	const { t } = useTranslation();
	return (
		<table className={`${TABLE} min-w-[720px]`}>
			<thead>
				<tr className={THEAD_ROW}>
					<th className={TH}>{t("dashboard.columns.contractNumber")}</th>
					<th className={TH}>{t("dashboard.columns.company")}</th>
					<th className={TH}>{t("dashboard.columns.serviceCompanyType")}</th>
					<th className={TH}>{`${t("dashboard.columns.startDate")} – ${t("dashboard.columns.endDate")}`}</th>
					<th className={TH}>{t("dashboard.kpi.list.status")}</th>
				</tr>
			</thead>
			<tbody>
				{rows.map(r => (
					<tr key={`${r.kind}-${r.addendum_group_id ?? r.id}-${r.addendum_model ?? ""}`} className={TBODY_ROW}>
						<td className={`${TD} whitespace-nowrap`}>
							<div>{r.contract_number || "—"}</div>
							{r.kind === "addendum" && (
								<div className={SUB_TEXT}>
									{r.display_addendum_number ? t("dashboard.contract.addendumNumber", { number: r.display_addendum_number }) : t("dashboard.contract.addendum")}
								</div>
							)}
						</td>
						<td className={`${TD} min-w-[9rem] break-words`}>{r.company_name || "—"}</td>
						<td className={TD}>
							<ServiceCell row={r} />
						</td>
						<td className={`${TD} whitespace-nowrap`}>
							{dateText(r.start_date, r.start_sh_year, r.start_sh_month)}
							{" – "}
							{dateText(r.end_date, r.end_sh_year, r.end_sh_month)}
						</td>
						<td className={TD}>
							<div className="flex flex-col items-start gap-1">
								{r.is_official === false && <StatusTag color="warning">{t("dashboard.contract.unofficial")}</StatusTag>}
								{r.is_official !== false && r.approval_stage && (
									<StatusTag color={APPROVAL_STAGE_TAG[r.approval_stage] ?? REAL_SIGN_STATE_TAG.not_started}>
										{t(`dashboard.approval.stages.${r.approval_stage}`, { defaultValue: r.approval_stage })}
									</StatusTag>
								)}
								{r.is_official !== false && r.real_sign_state && (
									<StatusTag color={REAL_SIGN_STATE_TAG[r.real_sign_state] ?? REAL_SIGN_STATE_TAG.not_started}>
										{t(`dashboard.approval.realSign.${r.real_sign_state}`, { defaultValue: r.real_sign_state })}
									</StatusTag>
								)}
							</div>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

function CompaniesTable({ rows }: { rows: CompanyListRow[] }) {
	const { t } = useTranslation();
	return (
		<table className={`${TABLE} min-w-[640px]`}>
			<thead>
				<tr className={THEAD_ROW}>
					<th className={TH}>{t("dashboard.columns.company")}</th>
					<th className={TH}>{t("dashboard.columns.serviceCompanyType")}</th>
					<th className={TH}>{t("dashboard.kpi.list.contracts")}</th>
					<th className={TH}>{t("dashboard.kpi.list.contractEndDate")}</th>
				</tr>
			</thead>
			<tbody>
				{rows.map((r) => {
					const activeEnd = jalaliFull(r.active_contract_end_date);
					const lastEnd = jalaliFull(r.last_contract_end_date);
					return (
						<tr key={`${r.id}-${r.service_id}`} className={TBODY_ROW}>
							<td className={`${TD} [overflow-wrap:anywhere]`}>{r.name || "—"}</td>
							<td className={TD}>
								<ServiceCell row={r} />
							</td>
							<td className={`${TD} whitespace-nowrap`}>
								{formatCount(r.contracts_count)}
								<span className={SUB_TEXT}>{` · ${t("dashboard.kpi.list.activeCount", { value: formatCount(r.active_contracts_count) })}`}</span>
							</td>
							<td className={`${TD} whitespace-nowrap`}>
								{activeEnd || (lastEnd
									? (
										<>
											{lastEnd}
											{" "}
											<span className="text-[11.5px] text-error">{t("dashboard.kpi.list.expired")}</span>
										</>
									)
									: "—")}
							</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}

interface KpiListModalProps {
	target: KpiListTarget | null
	serviceIds: number[]
	onClose: () => void
	/** The list answered 404 (no access). */
	onDenied: (key: KpiListKey) => void
}

/** Paged record list behind every number of the contract-cycle panel (GET /home/widgets/<list-key>/). */
export function KpiListModal({ target, serviceIds, onClose, onDenied }: KpiListModalProps) {
	const { t } = useTranslation();
	const listKey = target?.key ?? null;
	const serviceKey = serviceIdsParam(serviceIds);
	const topRef = useRef<HTMLDivElement>(null);
	// The page is bound to the list and the service filter: another list / filter (or closing) starts at page 1
	// without an extra request for the old page.
	const signature = `${listKey ?? ""}|${serviceKey ?? ""}`;
	const [paging, setPaging] = useState({ signature, page: 1 });
	if (paging.signature !== signature)
		setPaging({ signature, page: 1 });
	const page = paging.signature === signature ? paging.page : 1;

	const query = useQuery(widgetDataQuery(
		listKey ?? "list-all-contracts",
		{ service_ids: serviceKey, page, page_size: PAGE_SIZE },
		listKey !== null,
	));
	// Previous data stays (dimmed) while paging or after a filter change, but never under another list's title.
	const shownListRef = useRef<KpiListKey | null>(null);
	if (query.data && !query.isPlaceholderData)
		shownListRef.current = listKey;
	const own = !query.isPlaceholderData || shownListRef.current === listKey;
	const denied = listKey !== null && query.data === null && !query.isPlaceholderData;
	const error = listKey !== null && query.isError ? query.error.message || t("dashboard.common.listError") : null;
	const data = listKey !== null && own ? query.data ?? null : null;
	const loading = query.isFetching;

	useEffect(() => {
		if (denied && listKey)
			onDenied(listKey);
	}, [denied, listKey]);

	const rows = data?.results ?? [];
	const totalPages = data?.total_pages ?? 1;
	const viewKey = denied ? "denied" : error ? "error" : !data ? "wait" : `data-${listKey}-${data.page}`;

	return (
		<DashboardModal
			isOpen={!!target}
			onClose={onClose}
			title={target?.title ?? ""}
			maxWidth="max-w-5xl"
			icon={RiFileTextLine}
			count={data ? t("dashboard.common.itemsCount", { value: formatCount(data.count) }) : null}
		>
			<div ref={topRef} />
			<ModalBody viewKey={viewKey}>
				{denied
					? <ListMessage>{t("dashboard.common.listDenied")}</ListMessage>
					: error
						? <ListMessage tone="error">{error}</ListMessage>
						: !data
							? <ListMessage>{t("dashboard.common.listWaiting")}</ListMessage>
							: rows.length === 0
								? <ListMessage>{t("dashboard.common.listEmpty")}</ListMessage>
								: (
									<div className={`flex flex-col gap-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
										<div className={TABLE_WRAP}>
											{listKey === "list-companies"
												? <CompaniesTable rows={rows as CompanyListRow[]} />
												: <ContractsTable rows={rows as ContractListRow[]} />}
										</div>
									</div>
								)}
			</ModalBody>
			{!denied && !error && data && rows.length > 0 && totalPages > 1 && (
				<PagerBar
					page={page}
					totalPages={totalPages}
					shownPage={data.page}
					loading={loading}
					onChange={next => setPaging({ signature, page: next })}
					topRef={topRef}
					total={data.count}
					pageSize={PAGE_SIZE}
				/>
			)}
		</DashboardModal>
	);
}
