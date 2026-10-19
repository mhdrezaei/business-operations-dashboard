import type { NotRenewedRow, SortOrder } from "#src/features/dashboard/api/dashboard.dto";
import { companyTypeLabel } from "#src/features/dashboard/model/company-type";
import { formatCount } from "#src/features/dashboard/model/format";
import { dateText, jalaliMonthLabel } from "#src/features/dashboard/model/jalali";
import { widgetDataQuery } from "#src/features/dashboard/queries/dashboard.queries";
import { RiSearchLine } from "#src/features/dashboard/ui/icons";
import { ModalFullContext } from "#src/features/dashboard/ui/modal/DashboardModal";
import { ModalBody, PAGE_SIZE, PagerBar, SortableTh, TABLE, TABLE_WRAP, TBODY_ROW, TD, TH, THEAD_ROW } from "#src/features/dashboard/ui/modal/list-parts";
import { WidgetError, WidgetSpinnerBox } from "#src/features/dashboard/ui/shell/WidgetCardShell";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "ahooks";
import { Input } from "antd";
import { useContext, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const SEARCH_DEBOUNCE_MS = 400;

const rowKey = (r: NotRenewedRow) => `${r.service_id}-${r.company_id}`;

/** End-date column header: toggles desc (latest ended first) / asc; the arrow follows the server response. */
/** Server-side searchable, sortable, paginated company list of the modal; a fresh state on each open (key). */
export function NotRenewedList({ serviceKey }: { serviceKey: string }) {
	const { t } = useTranslation();
	const [order, setOrder] = useState<SortOrder>("desc");
	const [searchInput, setSearchInput] = useState("");
	const search = useDebounce(searchInput, { wait: SEARCH_DEBOUNCE_MS }).trim();
	const topRef = useRef<HTMLDivElement>(null);
	const full = useContext(ModalFullContext);
	// The page is bound to the filter signature: a changed order/search/service resets it to 1 without an extra request.
	const filterSig = [order, search, serviceKey].join("|");
	const [pageState, setPageState] = useState({ sig: filterSig, page: 1 });
	const page = pageState.sig === filterSig ? pageState.page : 1;
	const setPage = (next: number) => setPageState({ sig: filterSig, page: next });

	const query = useQuery(widgetDataQuery("contracts-not-renewed", {
		order,
		page,
		page_size: PAGE_SIZE,
		search: search || undefined,
		service_ids: serviceKey || undefined,
	}));
	// The previous data stays (only dimmed) until the response arrives; rows replay their entry on each new response,
	// and the sort arrow shows the order of the response on screen (the DTO does not type the server's `order` echo).
	const [shown, setShown] = useState<{ at: number, order: SortOrder }>({ at: 0, order });
	if (query.data && !query.isPlaceholderData && query.dataUpdatedAt !== shown.at)
		setShown({ at: query.dataUpdatedAt, order });

	const data = query.data ?? undefined;
	const loading = query.isFetching;
	let error: string | null = null;
	if (query.data === null)
		error = t("dashboard.common.listDenied");
	else if (query.isError)
		error = query.error.message || t("dashboard.widgets.notRenewed.listError");
	const rows = data?.results ?? [];
	const totalPages = data?.total_pages ?? 1;

	return (
		<>
			<div ref={topRef} />
			<Input
				allowClear
				value={searchInput}
				onChange={e => setSearchInput(e.target.value)}
				prefix={<RiSearchLine className="text-colorTextTertiary" />}
				placeholder={t("dashboard.common.searchCompany")}
				aria-label={t("dashboard.widgets.notRenewed.searchAria")}
				className="w-full max-w-[340px] mb-3"
			/>
			<ModalBody viewKey={error && !data ? "error" : !data ? "wait" : "data"}>
				{error && !data
					? <WidgetError message={error} />
					: !data
						? <WidgetSpinnerBox height={200} />
						: (
							<div className={`flex flex-col gap-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
								{error && <WidgetError message={error} />}
								{rows.length === 0
									? <div className="grid place-items-center h-[120px] text-[12.5px] text-colorTextTertiary">{t("dashboard.widgets.notRenewed.empty")}</div>
									: (
										<>
											<div className="text-[12.5px] text-colorTextSecondary">{t("dashboard.widgets.notRenewed.companiesCount", { value: formatCount(data.count) })}</div>
											{/* The table height is capped and scrolls inside; the header stays on top while scrolling. */}
											<div className={`${TABLE_WRAP} ${full ? "" : "max-h-[55vh] overflow-y-auto"} [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-[1] [&_thead_th]:bg-colorBgContainer [&_thead_th]:bg-[linear-gradient(var(--oo-colorFillQuaternary),var(--oo-colorFillQuaternary))]`}>
												<table className={`${TABLE} min-w-[760px]`}>
													<thead>
														<tr className={THEAD_ROW}>
															<th className={TH}>{t("dashboard.columns.company")}</th>
															<th className={TH}>{t("dashboard.columns.companyType")}</th>
															<th className={TH}>{t("dashboard.widgets.notRenewed.columns.lastContractNumber")}</th>
															<SortableTh label={t("dashboard.widgets.notRenewed.columns.endDate")} order={shown.order} onClick={() => setOrder(o => (o === "desc" ? "asc" : "desc"))} />
															<th className={TH}>{t("dashboard.widgets.notRenewed.columns.sinceEnd")}</th>
															<th className={TH}>{t("dashboard.widgets.notRenewed.columns.contractsCount")}</th>
														</tr>
													</thead>
													<tbody>
														{rows.map((r, i) => (
															<tr key={`${shown.at}-${rowKey(r)}`} className={`${TBODY_ROW} dash-rise-in`} style={{ animationDelay: `${i * 30}ms`, animationFillMode: "backwards" }}>
																<td className={TD}>
																	<span className="flex flex-col min-w-0 leading-[1.4]">
																		<span className="text-[13px] font-medium [overflow-wrap:anywhere]">{r.company_name || "—"}</span>
																		<span className="text-[11.5px] text-colorTextTertiary">{r.service_name || "—"}</span>
																	</span>
																</td>
																<td className={`${TD} whitespace-nowrap`}>
																	{r.company_type
																		? (
																			<span className="inline-block px-2.5 py-px rounded-full text-[11.5px] bg-colorFillQuaternary border border-solid border-colorBorder text-colorTextSecondary">
																				{companyTypeLabel(r.service_code, r.company_type)}
																			</span>
																		)
																		: null}
																</td>
																<td className={`${TD} whitespace-nowrap tabular-nums`}>{r.last_contract_number || "—"}</td>
																<td className={`${TD} whitespace-nowrap`}>
																	<span className="flex flex-col leading-[1.4]">
																		<span className="text-[13px]">{jalaliMonthLabel(r.last_end_sh_year, r.last_end_sh_month)}</span>
																		{r.last_end_date && <span className="text-[11.5px] text-colorTextTertiary">{dateText(r.last_end_date)}</span>}
																	</span>
																</td>
																<td className={`${TD} whitespace-nowrap tabular-nums`}>{t("dashboard.widgets.notRenewed.daysValue", { value: formatCount(r.days_since_end) })}</td>
																<td className={`${TD} whitespace-nowrap tabular-nums`}>{formatCount(r.contracts_count)}</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										</>
									)}
							</div>
						)}
			</ModalBody>
			{data && rows.length > 0 && totalPages > 1 && (
				<PagerBar page={page} totalPages={totalPages} shownPage={data.page} loading={loading} onChange={setPage} topRef={topRef} total={data.count} pageSize={PAGE_SIZE} />
			)}
		</>
	);
}
