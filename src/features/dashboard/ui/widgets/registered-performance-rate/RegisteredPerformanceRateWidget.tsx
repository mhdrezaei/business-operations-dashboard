import type { DashboardWidgetProps } from "#src/features/dashboard/model/types";
import type { RegisteredRateTarget } from "./RegisteredRateCompaniesModal";
import { companyTypeLabel } from "#src/features/dashboard/model/company-type";
import { formatCount, formatNumber } from "#src/features/dashboard/model/format";
import { FIRST_YEAR, getCurrentJalali, jalaliMonthLabel, monthName, MONTHS, shiftJalaliMonth } from "#src/features/dashboard/model/jalali";
import { serviceIdsParam } from "#src/features/dashboard/model/types";
import { widgetDataQuery } from "#src/features/dashboard/queries/dashboard.queries";
import { useChartTheme } from "#src/features/dashboard/ui/charts/chart-theme";
import { RateGauge, rateTone } from "#src/features/dashboard/ui/charts/RateGauge";
import { RiPercentLine } from "#src/features/dashboard/ui/icons";
import { SubgridBarRow } from "#src/features/dashboard/ui/shell/SubgridBarRow";
import { WidgetCardShell, WidgetError, WidgetSpinnerBox } from "#src/features/dashboard/ui/shell/WidgetCardShell";
import { useQuery } from "@tanstack/react-query";
import { Button, Select } from "antd";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RegisteredRateCompaniesModal } from "./RegisteredRateCompaniesModal";

// Lowest selectable month: Tir 1404; highest: the current month (not the next one).
const MIN_PERIOD = { year: FIRST_YEAR, month: 4 };

interface RateRowProps {
	label: string
	percentage: number | null
	registeredCount: number
	totalCount: number
	indent?: boolean
	onOpen: () => void
}

function RateRow({ label, percentage, registeredCount, totalCount, indent, onOpen }: RateRowProps) {
	const { t } = useTranslation();
	const T = useChartTheme();
	const hasData = percentage !== null && percentage !== undefined;
	const color = { ok: T.ok, warn: T.warn, danger: T.danger, faint: T.faint }[rateTone(percentage)];
	return (
		<SubgridBarRow
			grow
			indent={indent}
			label={label}
			// A row with data never shows an empty bar.
			percent={Math.max(hasData ? percentage : 0, hasData ? 1 : 0)}
			color={color}
			onOpen={onOpen}
			value={(
				<>
					<strong className="font-semibold" style={{ color }}>
						{hasData ? `${formatNumber(percentage)}٪` : t("dashboard.widgets.registeredRate.noData")}
					</strong>
					{hasData && ` (${formatCount(registeredCount)}/${formatCount(totalCount)})`}
				</>
			)}
		/>
	);
}

/** Card: percent of companies with an active contract whose performance of the chosen month is registered. */
export function RegisteredPerformanceRateWidget({ serviceIds }: DashboardWidgetProps) {
	const { t } = useTranslation();
	const T = useChartTheme();
	const [detailTarget, setDetailTarget] = useState<RegisteredRateTarget | null>(null);
	// Defaults to last month; year and month are always sent to the backend together.
	const currentMonth = useMemo(() => getCurrentJalali(), []);
	const lastMonth = useMemo(() => shiftJalaliMonth(currentMonth, -1), [currentMonth]);
	const [period, setPeriod] = useState(lastMonth);

	const q = useQuery(widgetDataQuery("registered-performance-rate", {
		sh_year: period.year,
		sh_month: period.month,
		service_ids: serviceIdsParam(serviceIds),
	}));
	const data = q.data;

	const byService = data?.by_service ?? [];
	const withData = byService.filter(svc => svc.total_count > 0);
	const withoutData = byService.filter(svc => !svc.total_count);
	const hasTotal = !!data && data.total_count > 0;
	// The previous month's data is replaced by a spinner until the new response arrives, so an old value is never
	// shown under a new month.
	const stale = !!data && (data.sh_year !== period.year || data.sh_month !== period.month);
	const loadingFull = q.isPending || (q.isFetching && (!data || stale));
	const isDefault = period.year === lastMonth.year && period.month === lastMonth.month;
	const yearOptions = Array.from({ length: Math.max(currentMonth.year - MIN_PERIOD.year + 1, 0) }, (_, i) => {
		const year = MIN_PERIOD.year + i;
		return { value: year, label: String(year) };
	});
	const monthOptions = MONTHS
		.filter(m => (period.year > MIN_PERIOD.year || m >= MIN_PERIOD.month) && (period.year < currentMonth.year || m <= currentMonth.month))
		.map(m => ({ value: m, label: monthName(m) }));
	const changeYear = (year: number) =>
		setPeriod((p) => {
			let { month } = p;
			if (year === MIN_PERIOD.year)
				month = Math.max(month, MIN_PERIOD.month);
			if (year === currentMonth.year)
				month = Math.min(month, currentMonth.month);
			return { year, month };
		});
	// The card response's month goes to the details api so the list number equals the card row.
	const openDetails = (svc: { service_id: number, service_name: string, service_code: string }, companyType?: string) => {
		if (!data)
			return;
		setDetailTarget({
			serviceId: svc.service_id,
			serviceName: svc.service_name,
			serviceCode: svc.service_code,
			companyType,
			year: data.sh_year,
			month: data.sh_month,
		});
	};
	const shownLabel = jalaliMonthLabel(period.year, period.month);

	return (
		<WidgetCardShell
			refreshing={q.isFetching && !!data && !stale}
			icon={<RiPercentLine className="text-success" />}
			fill
			animateSize
			title={t("dashboard.widgets.registeredRate.title", { period: shownLabel })}
			description={t("dashboard.widgets.registeredRate.description")}
			headerExtra={(
				<div className="flex items-center gap-1.5 shrink-0">
					{!isDefault && (
						<Button type="text" size="small" className="text-[11.5px] text-primaryText hover:!bg-primaryBg" onClick={() => setPeriod(lastMonth)}>
							{t("dashboard.common.lastMonth")}
						</Button>
					)}
					<Select
						size="small"
						className="w-[84px]"
						aria-label={t("dashboard.common.year")}
						value={period.year}
						onChange={changeYear}
						options={yearOptions}
						popupMatchSelectWidth={false}
					/>
					<Select
						size="small"
						className="w-[112px]"
						aria-label={t("dashboard.common.month")}
						value={period.month}
						onChange={month => setPeriod(p => ({ ...p, month }))}
						options={monthOptions}
						popupMatchSelectWidth={false}
					/>
				</div>
			)}
		>
			{q.isError
				? <WidgetError message={q.error.message} />
				: loadingFull
					? <WidgetSpinnerBox height={220} />
					: !hasTotal
						? <div className="grid place-items-center h-[140px] text-[12.5px] text-colorTextTertiary">{t("dashboard.widgets.registeredRate.empty")}</div>
						: (
							<div key={`${period.year}-${period.month}`} className="dash-fade-up-450 flex flex-col gap-4 flex-1">
								<div className="flex items-center gap-[18px] min-h-[120px]">
									<RateGauge percentage={data.percentage} />
									<div className="flex flex-col gap-1.5 text-[12.5px] text-colorTextSecondary">
										<span>
											{t("dashboard.widgets.registeredRate.summary", {
												registered: formatCount(data.registered_count),
												total: formatCount(data.total_count),
												period: jalaliMonthLabel(data.sh_year, data.sh_month),
											})}
										</span>
										<span className="flex items-center gap-1.5 text-[11.5px] text-colorTextTertiary">
											<span className="w-2 h-2 rounded-sm" style={{ background: T.ok }} />
											{t("dashboard.widgets.registeredRate.legendOk")}
										</span>
										<span className="flex items-center gap-1.5 text-[11.5px] text-colorTextTertiary">
											<span className="w-2 h-2 rounded-sm" style={{ background: T.warn }} />
											{t("dashboard.widgets.registeredRate.legendWarn")}
										</span>
									</div>
								</div>

								{withData.length > 0 && (
									<div className="grid grid-cols-[max-content_minmax(0,1fr)_max-content] gap-x-3 gap-y-1 items-center flex-1 content-between">
										{withData.flatMap(svc => [
											<RateRow
												key={svc.service_id}
												label={svc.service_name}
												percentage={svc.percentage}
												registeredCount={svc.registered_count}
												totalCount={svc.total_count}
												onOpen={() => openDetails(svc)}
											/>,
											...(svc.by_company_type ?? []).map(ct => (
												<RateRow
													key={`${svc.service_id}-${ct.company_type}`}
													label={companyTypeLabel(svc.service_code, ct.company_type) ?? ""}
													percentage={ct.percentage}
													registeredCount={ct.registered_count}
													totalCount={ct.total_count}
													indent
													onOpen={() => openDetails(svc, ct.company_type)}
												/>
											)),
										])}
									</div>
								)}

								{withoutData.length > 0 && (
									<span className="text-[11.5px] text-colorTextTertiary">
										{t("dashboard.widgets.registeredRate.noDataServices", { names: withoutData.map(svc => svc.service_name).join("، ") })}
									</span>
								)}
							</div>
						)}
			<RegisteredRateCompaniesModal target={detailTarget} onClose={() => setDetailTarget(null)} />
		</WidgetCardShell>
	);
}
