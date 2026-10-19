import type { DashboardWidgetProps } from "#src/features/dashboard/model/types";
import type { ExpiringBarClick, ExpiringRow, ExpiringSeries } from "#src/features/dashboard/ui/charts/ExpiringBarChart";
import { formatCount } from "#src/features/dashboard/model/format";
import { jalaliMonthLabel, jalaliPartsOf } from "#src/features/dashboard/model/jalali";
import { serviceIdsParam } from "#src/features/dashboard/model/types";
import { widgetDataQuery } from "#src/features/dashboard/queries/dashboard.queries";
import { colorAt, useChartTheme } from "#src/features/dashboard/ui/charts/chart-theme";
import { ExpiringBarChart } from "#src/features/dashboard/ui/charts/ExpiringBarChart";
import { RiArrowLeftLine, RiHourglassLine, RiTimeLine } from "#src/features/dashboard/ui/icons";
import { DashboardModal } from "#src/features/dashboard/ui/modal/DashboardModal";
import { ModalBody } from "#src/features/dashboard/ui/modal/list-parts";
import { WidgetCardShell, WidgetError, WidgetSpinnerBox } from "#src/features/dashboard/ui/shell/WidgetCardShell";
import { useQuery } from "@tanstack/react-query";
import { Segmented } from "antd";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { ExpiringDetailsTable } from "./ExpiringDetailsTable";
import { ExpiringServiceRow } from "./ExpiringServiceRow";

const MONTHS_AHEAD_VALUES = [3, 6, 12];

type ViewMode = "total" | "by_service";

interface DetailFilter {
	shYear: number
	shMonth: number
	label: string
	serviceCode: string | null
	serviceName: string | null
}

export function ContractsExpiringWidget({ title, serviceIds }: DashboardWidgetProps) {
	const { t } = useTranslation();
	const T = useChartTheme();
	const [monthsAhead, setMonthsAhead] = useState(6);
	const [viewMode, setViewMode] = useState<ViewMode>("total");
	// The service under the mouse (highlighted in the chart and in the panel below).
	const [hoverKey, setHoverKey] = useState<string | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);
	const [detailFilter, setDetailFilter] = useState<DetailFilter | null>(null);

	const params = { service_ids: serviceIdsParam(serviceIds), months_ahead: monthsAhead };
	const query = useQuery(widgetDataQuery("contracts-expiring", params));
	const detailQuery = useQuery(widgetDataQuery("contracts-expiring", { ...params, detail: 1 }, detailOpen));

	const data = query.data ?? undefined;
	const byService = useMemo(() => data?.by_service ?? [], [data]);
	const serviceSeries = useMemo<(ExpiringSeries & { code: string })[]>(
		() => byService.map((svc, index) => ({ key: `s${svc.service_id}`, name: svc.service_name, code: svc.service_code, color: colorAt(T, index) })),
		[byService, T],
	);

	// Service-level buckets only have months with count > 0, so the columns come from the total buckets (always
	// complete) and each service value is filled through a lookup.
	const rows = useMemo<ExpiringRow[]>(() => (data?.buckets ?? []).map((b) => {
		const values: Record<string, number> = {};
		byService.forEach((svc) => {
			const match = (svc.buckets || []).find(x => x.sh_year === b.sh_year && x.sh_month === b.sh_month);
			values[`s${svc.service_id}`] = match?.count || 0;
		});
		return { label: jalaliMonthLabel(b.sh_year, b.sh_month), shYear: b.sh_year, shMonth: b.sh_month, total: b.count, values };
	}), [data, byService]);

	const totalExpiring = (data?.buckets ?? []).reduce((sum, b) => sum + (b.count || 0), 0);

	const openDetails = (filter: DetailFilter | null = null) => {
		setDetailFilter(filter);
		setDetailOpen(true);
	};

	// Click on a chart column: only the contracts ending in that month (and, in by-service mode, that service).
	const handleBarClick = ({ shYear, shMonth, label, serviceKey }: ExpiringBarClick) => {
		const svc = serviceKey ? serviceSeries.find(s => s.key === serviceKey) : null;
		openDetails({ shYear, shMonth, label, serviceCode: svc?.code ?? null, serviceName: svc?.name ?? null });
	};

	const detailItems = useMemo(() => {
		const items = detailQuery.data?.details ?? [];
		if (!detailFilter)
			return items;
		return items.filter((item) => {
			const parts = jalaliPartsOf(item.end_date);
			if (!parts || parts.year !== detailFilter.shYear || parts.month !== detailFilter.shMonth)
				return false;
			return !detailFilter.serviceCode || item.service_code === detailFilter.serviceCode;
		});
	}, [detailQuery.data, detailFilter]);
	const serviceNames = useMemo(() => new Map(serviceSeries.map(s => [s.code, s.name])), [serviceSeries]);

	const detailTitle = detailFilter
		? (detailFilter.serviceName
			? t("dashboard.widgets.expiring.detailTitleService", { month: detailFilter.label, service: detailFilter.serviceName })
			: t("dashboard.widgets.expiring.detailTitleMonth", { month: detailFilter.label }))
		: t("dashboard.widgets.expiring.detailTitle");
	const detailError = detailQuery.isError ? (detailQuery.error.message || t("dashboard.widgets.expiring.detailError")) : null;
	const detailLoading = detailQuery.isFetching;
	const byServiceShown = viewMode === "by_service";

	return (
		<WidgetCardShell
			refreshing={query.isFetching && data !== undefined}
			fill
			animateSize
			icon={<RiTimeLine className="text-warning" />}
			title={title}
			description={t("dashboard.widgets.expiring.description", { total: formatCount(totalExpiring), months: formatCount(monthsAhead) })}
			headerExtra={(
				<Segmented<number>
					size="small"
					value={monthsAhead}
					onChange={setMonthsAhead}
					options={MONTHS_AHEAD_VALUES.map(value => ({ value, label: t("dashboard.widgets.expiring.monthsOption", { value }) }))}
				/>
			)}
		>
			<div className="flex items-center justify-between gap-2">
				<Segmented<ViewMode>
					size="small"
					value={viewMode}
					onChange={setViewMode}
					options={[
						{ value: "total", label: t("dashboard.widgets.expiring.viewTotal") },
						{ value: "by_service", label: t("dashboard.widgets.expiring.viewByService") },
					]}
				/>
				<button type="button" onClick={() => openDetails()} className="flex items-center gap-1.5 bg-transparent border-0 p-0 font-[inherit] text-[12.5px] text-primaryText cursor-pointer hover:underline">
					{t("dashboard.widgets.expiring.details")}
					<RiArrowLeftLine className="text-sm" />
				</button>
			</div>

			{query.isError
				? <WidgetError message={query.error.message || t("dashboard.widgets.expiring.error")} />
				: query.isPending
					? <WidgetSpinnerBox height={210} />
					: <ExpiringBarChart rows={rows} mode={viewMode} series={serviceSeries} highlightKey={hoverKey} onBarClick={handleBarClick} />}

			{byService.length > 0 && (
				<div
					aria-hidden={!byServiceShown}
					className="grid transition-[grid-template-rows,opacity] duration-300 ease-in-out"
					style={{ gridTemplateRows: byServiceShown ? "1fr" : "0fr", opacity: byServiceShown ? 1 : 0 }}
				>
					<div className="min-h-0 overflow-hidden">
						<div className="flex flex-col gap-3">
							<div className="grid grid-cols-2 gap-2 items-start" onMouseLeave={() => setHoverKey(null)}>
								{byService.map((svc, index) => (
									<ExpiringServiceRow
										key={svc.service_id}
										svc={svc}
										color={colorAt(T, index)}
										hoverKey={hoverKey}
										setHoverKey={setHoverKey}
									/>
								))}
							</div>
						</div>
					</div>
				</div>
			)}

			<DashboardModal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={detailTitle} maxWidth="max-w-4xl" icon={RiHourglassLine}>
				<ModalBody viewKey={detailError ? "error" : detailLoading ? "wait" : `data-${detailFilter ? `${detailFilter.shYear}-${detailFilter.shMonth}-${detailFilter.serviceCode ?? ""}` : "all"}`}>
					{detailError
						? <WidgetError message={detailError} />
						: detailLoading
							? <WidgetSpinnerBox height={200} />
							: detailItems.length === 0
								? <div className="text-[12.5px] text-colorTextSecondary py-4 text-center">{t("dashboard.widgets.expiring.empty")}</div>
								: <ExpiringDetailsTable items={detailItems} serviceNames={serviceNames} />}
				</ModalBody>
			</DashboardModal>
		</WidgetCardShell>
	);
}
