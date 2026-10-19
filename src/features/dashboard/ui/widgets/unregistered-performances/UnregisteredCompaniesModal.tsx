import type { ShPeriod } from "#src/features/dashboard/api/dashboard.dto";
import { companyTypeLabel } from "#src/features/dashboard/model/company-type";
import { formatCount } from "#src/features/dashboard/model/format";
import { jalaliMonthLabel } from "#src/features/dashboard/model/jalali";
import { scopedWidgetQuery } from "#src/features/dashboard/queries/dashboard.queries";
import { RiCalendarCloseLine } from "#src/features/dashboard/ui/icons";
import { DashboardModal } from "#src/features/dashboard/ui/modal/DashboardModal";
import { ListMessage, ModalBody, PAGE_SIZE, PagerBar, StatusTag, TABLE, TABLE_WRAP, TBODY_ROW, TD, TH, THEAD_ROW } from "#src/features/dashboard/ui/modal/list-parts";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { useTranslation } from "react-i18next";

const CHIPS_COLLAPSED = 6;

/** Row of the card that is drilled into (the details api is per service, so there is no "grand total" target). */
export interface UnregisteredTarget {
	serviceId: number
	serviceName?: string
	serviceCode?: string
	companyType?: string
}

/** Months as chips; more than a few are collapsed and opened with "+N more months". */
function MonthChips({ months }: { months: ShPeriod[] }) {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const shown = open ? months : months.slice(0, CHIPS_COLLAPSED);
	const hidden = months.length - shown.length;
	return (
		<div className="flex flex-wrap gap-1.5">
			{shown.map(m => (
				<StatusTag key={`${m.sh_year}-${m.sh_month}`} color="error">{jalaliMonthLabel(m.sh_year, m.sh_month)}</StatusTag>
			))}
			{(hidden > 0 || (open && months.length > CHIPS_COLLAPSED)) && (
				<button
					type="button"
					onClick={() => setOpen(o => !o)}
					className="px-2 py-0.5 rounded-full text-[11.5px] whitespace-nowrap font-[inherit] cursor-pointer bg-transparent border border-solid border-[var(--dash-border)] text-colorTextSecondary hover:bg-colorFillTertiary transition-colors"
				>
					{open ? t("dashboard.modal.close") : t("dashboard.widgets.unregistered.modal.moreMonths", { value: formatCount(hidden) })}
				</button>
			)}
		</div>
	);
}

/** Drill-down of the "unregistered performances" card: companies and their unregistered months of a service. Pagination is over companies, not months. */
export function UnregisteredCompaniesModal({ target, onClose }: { target: UnregisteredTarget | null, onClose: () => void }) {
	const { t } = useTranslation();
	const topRef = useRef<HTMLDivElement>(null);
	const key = target ? [target.serviceId, target.companyType ?? ""].join("|") : "";
	// A new target (or closing) → page 1, without an extra request: the page belongs to its key.
	const [nav, setNav] = useState({ key: "", page: 1 });
	const page = nav.key === key ? nav.page : 1;

	const q = useQuery(scopedWidgetQuery(
		"unregistered-performances-companies",
		{ service_id: target?.serviceId, company_type: target?.companyType, page, page_size: PAGE_SIZE },
		!!target,
	));

	// Page of the data on screen (the previous one while the next loads) — new content fades up with this key.
	const shownView = useRef("");
	if (q.data && !q.isPlaceholderData)
		shownView.current = `${key}-${page}`;

	const data = target ? q.data : undefined;
	const denied = !!target && q.data === null;
	const error = target && q.isError ? q.error.message || t("dashboard.common.listError") : null;
	const rows = data?.results ?? [];
	const totalPages = data?.total_pages ?? 1;

	const title = target
		? t(target.companyType ? "dashboard.widgets.unregistered.modal.titleWithType" : "dashboard.widgets.unregistered.modal.title", {
			service: target.serviceName ?? target.serviceId,
			type: companyTypeLabel(target.serviceCode, target.companyType),
		})
		: "";

	return (
		<DashboardModal
			isOpen={!!target}
			onClose={onClose}
			title={title}
			maxWidth="max-w-5xl"
			icon={RiCalendarCloseLine}
			count={data ? t("dashboard.widgets.unregistered.modal.count", { months: formatCount(data.count), companies: formatCount(data.companies_count) }) : null}
		>
			<div ref={topRef} />
			<ModalBody viewKey={denied ? "denied" : error ? "error" : !data ? "wait" : `data-${shownView.current}`}>
				{denied
					? <ListMessage>{t("dashboard.common.listDenied")}</ListMessage>
					: error
						? <ListMessage tone="error">{error}</ListMessage>
						: !data
							? <ListMessage>{t("dashboard.common.listWaiting")}</ListMessage>
							: rows.length === 0
								? <ListMessage>{t("dashboard.common.listEmpty")}</ListMessage>
								: (
									<div className={`flex flex-col gap-3 transition-opacity ${q.isFetching ? "opacity-60" : ""}`}>
										<div className={TABLE_WRAP}>
											<table className={`${TABLE} min-w-[640px]`}>
												<thead>
													<tr className={THEAD_ROW}>
														<th className={TH}>{t("dashboard.columns.company")}</th>
														<th className={TH}>{t("dashboard.columns.companyType")}</th>
														<th className={TH}>{t("dashboard.widgets.unregistered.modal.monthsCount")}</th>
														<th className={TH}>{t("dashboard.widgets.unregistered.modal.unregisteredMonths")}</th>
													</tr>
												</thead>
												<tbody>
													{rows.map(r => (
														<tr key={r.company_id} className={TBODY_ROW}>
															<td className={`${TD} min-w-[9rem] break-words`}>{r.company_name || "—"}</td>
															<td className={`${TD} whitespace-nowrap`}>{r.company_type ? companyTypeLabel(data.service_code, r.company_type) : "—"}</td>
															<td className={`${TD} whitespace-nowrap font-semibold`}>{formatCount(r.unregistered_months_count)}</td>
															<td className={TD}>
																<MonthChips months={r.unregistered_months ?? []} />
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>
								)}
			</ModalBody>
			{!denied && !error && data && rows.length > 0 && totalPages > 1 && (
				<PagerBar page={page} totalPages={totalPages} shownPage={data.page} loading={q.isFetching} onChange={next => setNav({ key, page: next })} topRef={topRef} total={data.companies_count} pageSize={PAGE_SIZE} />
			)}
		</DashboardModal>
	);
}
