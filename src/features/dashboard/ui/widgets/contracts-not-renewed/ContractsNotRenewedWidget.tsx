import type { DashboardWidgetProps } from "#src/features/dashboard/model/types";
import type { NotRenewedSlice } from "./NotRenewedDonut";
import { companyTypeLabel } from "#src/features/dashboard/model/company-type";
import { formatCount } from "#src/features/dashboard/model/format";
import { serviceIdsParam } from "#src/features/dashboard/model/types";
import { widgetDataQuery } from "#src/features/dashboard/queries/dashboard.queries";
import { colorAt, useChartTheme } from "#src/features/dashboard/ui/charts/chart-theme";
import { RiArrowLeftSLine, RiFileCloseLine, RiHistoryLine } from "#src/features/dashboard/ui/icons";
import { DashboardModal } from "#src/features/dashboard/ui/modal/DashboardModal";
import { WidgetCardShell, WidgetError, WidgetSpinnerBox } from "#src/features/dashboard/ui/shell/WidgetCardShell";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { NotRenewedDonut } from "./NotRenewedDonut";
import { NotRenewedList } from "./NotRenewedList";

/** The card needs only the summary; the rows are read by the modal list. */
const SUMMARY_PAGE_SIZE = 1;

function CountChip({ label, count }: { label: string | null, count: number }) {
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full border border-solid border-colorBorder bg-colorBgContainer whitespace-nowrap text-colorTextSecondary px-2 py-px text-[11px]">
			{label}
			<strong className="font-semibold text-colorText tabular-nums">{formatCount(count)}</strong>
		</span>
	);
}

export function ContractsNotRenewedWidget({ serviceIds }: DashboardWidgetProps) {
	const { t } = useTranslation();
	const T = useChartTheme();
	const [hoverKey, setHoverKey] = useState<string | null>(null);
	// null = closed | serviceId null = all services.
	const [target, setTarget] = useState<{ serviceId: number | null, title: string } | null>(null);
	const serviceKey = serviceIdsParam(serviceIds) ?? "";

	const query = useQuery(widgetDataQuery("contracts-not-renewed", {
		page: 1,
		page_size: SUMMARY_PAGE_SIZE,
		service_ids: serviceKey || undefined,
	}));

	// 404 = no access to any service of the contracts domain → the whole card is hidden.
	if (query.data === null)
		return null;

	const summary = query.data?.summary;
	const byService = summary?.by_service ?? [];
	// A service color is its position in by_service (shared by donut and list); a service without companies has no slice.
	const items = byService.map((svc, i) => ({ svc, key: `s${svc.service_id}`, c: colorAt(T, i) }));
	const slices: NotRenewedSlice[] = items
		.filter(it => it.svc.count > 0)
		.map(it => ({ key: it.key, v: it.svc.count, c: it.c, serviceId: it.svc.service_id, serviceName: it.svc.service_name }));
	const title = t("dashboard.widgets.notRenewed.title");
	const open = (slice?: { serviceId: number, serviceName: string }) =>
		setTarget(slice
			? { serviceId: slice.serviceId, title: t("dashboard.widgets.notRenewed.titleService", { service: slice.serviceName }) }
			: { serviceId: null, title });

	return (
		<WidgetCardShell
			refreshing={query.isFetching && query.data !== undefined}
			fill
			animateSize
			icon={<RiHistoryLine className="text-warning" />}
			title={title}
			description={t("dashboard.widgets.notRenewed.description")}
		>
			{query.isPending
				? <WidgetSpinnerBox height={180} />
				: !summary
					? (query.isError ? <WidgetError message={query.error.message || t("dashboard.widgets.notRenewed.cardError")} /> : null)
					: (
						<>
							{query.isError && <WidgetError message={query.error.message || t("dashboard.widgets.notRenewed.cardError")} />}
							<div className="flex flex-1 items-center gap-6 flex-wrap justify-center sm:justify-start" onMouseLeave={() => setHoverKey(null)}>
								<NotRenewedDonut total={summary.total} slices={slices} hoverKey={hoverKey} setHoverKey={setHoverKey} onOpen={open} />
								<ul className="m-0 p-0 list-none grid grid-cols-1 sm:grid-cols-2 content-evenly self-stretch gap-x-5 gap-y-2.5 min-w-0 flex-1 basis-[240px]">
									{items.map(({ svc, key, c }) => {
										const clickable = svc.count > 0;
										return (
											<li key={key} onMouseEnter={() => clickable && setHoverKey(key)} className={`flex flex-col gap-1 transition-opacity duration-200 ${hoverKey && hoverKey !== key ? "opacity-40" : ""}`}>
												<button
													type="button"
													disabled={!clickable}
													onClick={() => open({ serviceId: svc.service_id, serviceName: svc.service_name })}
													className="group flex items-center gap-2 min-w-0 px-2 py-1 -mx-2 rounded-lg text-start text-[12.5px] bg-transparent border-0 font-[inherit] text-colorText enabled:cursor-pointer enabled:hover:bg-colorFillQuaternary transition-colors disabled:text-colorTextTertiary"
												>
													<span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: c }} />
													<span className="truncate">{svc.service_name}</span>
													<strong className="ms-auto ps-2 font-semibold tabular-nums shrink-0">{formatCount(svc.count)}</strong>
													{clickable && <RiArrowLeftSLine className="text-sm shrink-0 text-colorTextTertiary transition-transform group-hover:-translate-x-0.5" />}
												</button>
												{/* Share of the service in the total — visual only (server count / summary.total); rows fill the stretched card. */}
												<span className="block h-1 mx-0 rounded-full bg-colorFillSecondary overflow-hidden">
													<span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${summary.total > 0 ? (svc.count / summary.total) * 100 : 0}%`, background: c }} />
												</span>
												{(svc.by_company_type ?? []).length > 0 && (
													<div className="flex flex-wrap gap-1 ps-[18px]">
														{svc.by_company_type.map(ct => (
															<CountChip key={ct.company_type} label={companyTypeLabel(svc.service_code, ct.company_type)} count={ct.count} />
														))}
													</div>
												)}
											</li>
										);
									})}
								</ul>
							</div>
						</>
					)}

			<DashboardModal isOpen={!!target} onClose={() => setTarget(null)} title={target?.title ?? ""} maxWidth="max-w-5xl" icon={RiFileCloseLine}>
				{target && <NotRenewedList key={target.serviceId ?? "all"} serviceKey={target.serviceId ? String(target.serviceId) : serviceKey} />}
			</DashboardModal>
		</WidgetCardShell>
	);
}
