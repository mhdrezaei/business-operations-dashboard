import { companyTypeLabel } from "#src/features/dashboard/model/company-type";
import { formatCount, formatNumber } from "#src/features/dashboard/model/format";
import { jalaliMonthLabel } from "#src/features/dashboard/model/jalali";
import { scopedWidgetQuery } from "#src/features/dashboard/queries/dashboard.queries";
import { RiCalendarCheckLine } from "#src/features/dashboard/ui/icons";
import { DashboardModal } from "#src/features/dashboard/ui/modal/DashboardModal";
import { ListMessage, PAGE_SIZE, PagerBar, StatusTag, TABLE, TABLE_WRAP, TBODY_ROW, TD, TH, THEAD_ROW } from "#src/features/dashboard/ui/modal/list-parts";
import { AutoHeight } from "#src/features/dashboard/ui/shell/AutoHeight";
import { useQuery } from "@tanstack/react-query";

import { useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

type RegisteredStatus = "all" | "registered" | "unregistered";

const TABS: RegisteredStatus[] = ["all", "registered", "unregistered"];

/** Row of the card that is drilled into; the period is the one of the card response, so the list matches the row. */
export interface RegisteredRateTarget {
	serviceId: number
	serviceName?: string
	serviceCode?: string
	companyType?: string
	year: number
	month: number
}

interface ModalNav {
	key: string
	status: RegisteredStatus
	page: number
}

/** Drill-down of the "registered performance rate" card: registered / unregistered companies of a service in the card's month. */
export function RegisteredRateCompaniesModal({ target, onClose }: { target: RegisteredRateTarget | null, onClose: () => void }) {
	const { t } = useTranslation();
	const topRef = useRef<HTMLDivElement>(null);
	const key = target ? [target.serviceId, target.companyType ?? "", target.year, target.month].join("|") : "";
	// A new target (or closing) → "all" tab and page 1, without an extra request: the tab/page belong to their key.
	const [nav, setNav] = useState<ModalNav>({ key: "", status: "all", page: 1 });
	const status = nav.key === key ? nav.status : "all";
	const page = nav.key === key ? nav.page : 1;

	const q = useQuery(scopedWidgetQuery(
		"registered-performance-rate-companies",
		{
			service_id: target?.serviceId,
			company_type: target?.companyType,
			sh_year: target?.year,
			sh_month: target?.month,
			status,
			page,
			page_size: PAGE_SIZE,
		},
		!!target,
		["status", "page", "page_size"],
	));

	// Tab/page of the data on screen (the previous one while the next loads) — new content fades up with this key.
	const shownView = useRef("");
	if (q.data && !q.isPlaceholderData)
		shownView.current = `${status}-${page}`;

	const data = target ? q.data : undefined;
	const loading = q.isFetching;
	const denied = !!target && q.data === null;
	const error = target && q.isError ? q.error.message || t("dashboard.common.listError") : null;
	const rows = data?.results ?? [];
	const totalPages = data?.total_pages ?? 1;
	const pct = data?.percentage;
	const view = shownView.current;
	const setTab = (next: RegisteredStatus) => setNav({ key, status: next, page: 1 });
	const setPage = (next: number) => setNav({ key, status, page: next });

	const title = target
		? t(target.companyType ? "dashboard.widgets.registeredRate.modal.titleWithType" : "dashboard.widgets.registeredRate.modal.title", {
			service: target.serviceName ?? target.serviceId,
			type: companyTypeLabel(target.serviceCode, target.companyType),
			period: jalaliMonthLabel(target.year, target.month),
		})
		: "";

	return (
		<DashboardModal
			isOpen={!!target}
			onClose={onClose}
			title={title}
			maxWidth="max-w-4xl"
			icon={RiCalendarCheckLine}
			count={data ? t("dashboard.widgets.registeredRate.modal.count", { value: formatCount(data.count) }) : null}
		>
			{denied
				? <ListMessage>{t("dashboard.common.listDenied")}</ListMessage>
				: error
					? <ListMessage tone="error">{error}</ListMessage>
					: !data
						? <ListMessage>{t("dashboard.common.listWaiting")}</ListMessage>
						: (
							<div className="flex flex-col gap-3">
								<div ref={topRef} className="-mb-3" />
								<div className="text-[13px] text-colorText">
									<Trans
										i18nKey="dashboard.widgets.registeredRate.modal.summary"
										values={{ registered: formatCount(data.registered_count), total: formatCount(data.total_count) }}
										components={{ b: <strong className="font-semibold" /> }}
									/>
									{pct !== null && pct !== undefined && <span className="text-colorTextSecondary">{` (${formatNumber(pct)}٪)`}</span>}
								</div>

								<div className="flex gap-1.5" role="tablist">
									{TABS.map(tab => (
										<button
											key={tab}
											type="button"
											role="tab"
											aria-selected={status === tab}
											onClick={() => setTab(tab)}
											className={`px-3 py-1.5 rounded-lg text-[12.5px] font-[inherit] cursor-pointer border border-solid transition-colors ${
												status === tab
													? "bg-colorText text-colorBgContainer border-colorText"
													: "bg-transparent border-[var(--dash-border)] text-colorText hover:bg-colorFillTertiary"
											}`}
										>
											{t(`dashboard.widgets.registeredRate.modal.tabs.${tab}`)}
										</button>
									))}
								</div>

								<AutoHeight variant="modal">
									{rows.length === 0
										? <p key={`${view}-${loading}`} className="dash-fade-up m-0 py-6 text-center text-sm text-colorTextSecondary">{loading ? t("dashboard.common.listWaiting") : t("dashboard.common.listEmpty")}</p>
										: (
									// key = tab/page of the received data: each swap fades the new list in; the old one stays dimmed until then.
											<div key={view} className={`dash-fade-up flex flex-col gap-3 transition-opacity duration-200 ${loading ? "opacity-50" : ""}`}>
												<div className={TABLE_WRAP}>
													<table className={`${TABLE} min-w-[420px]`}>
														<thead>
															<tr className={THEAD_ROW}>
																<th className={TH}>{t("dashboard.columns.company")}</th>
																<th className={TH}>{t("dashboard.columns.companyType")}</th>
																<th className={TH}>{t("dashboard.widgets.registeredRate.modal.status")}</th>
															</tr>
														</thead>
														<tbody>
															{rows.map(r => (
																<tr key={r.company_id} className={TBODY_ROW}>
																	<td className={`${TD} min-w-[9rem] break-words`}>{r.company_name || "—"}</td>
																	<td className={`${TD} whitespace-nowrap`}>{r.company_type ? companyTypeLabel(data.service_code, r.company_type) : "—"}</td>
																	<td className={TD}>
																		<StatusTag color={r.registered ? "success" : "error"}>
																			{t(`dashboard.widgets.registeredRate.modal.tabs.${r.registered ? "registered" : "unregistered"}`)}
																		</StatusTag>
																	</td>
																</tr>
															))}
														</tbody>
													</table>
												</div>
											</div>
										)}
								</AutoHeight>
								{rows.length > 0 && totalPages > 1 && (
									<PagerBar page={page} totalPages={totalPages} shownPage={data.page} loading={loading} onChange={setPage} topRef={topRef} total={data.count} pageSize={PAGE_SIZE} />
								)}
							</div>
						)}
		</DashboardModal>
	);
}
