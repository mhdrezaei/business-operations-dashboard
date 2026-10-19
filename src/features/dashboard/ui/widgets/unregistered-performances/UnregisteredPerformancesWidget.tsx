import type { DashboardWidgetProps } from "#src/features/dashboard/model/types";
import type { UnregisteredTarget } from "./UnregisteredCompaniesModal";
import { companyTypeLabel } from "#src/features/dashboard/model/company-type";
import { formatCount, formatNumber } from "#src/features/dashboard/model/format";
import { serviceIdsParam } from "#src/features/dashboard/model/types";
import { widgetDataQuery } from "#src/features/dashboard/queries/dashboard.queries";
import { colorAt, useChartTheme } from "#src/features/dashboard/ui/charts/chart-theme";
import { RiAlertLine } from "#src/features/dashboard/ui/icons";
import { SubgridBarRow } from "#src/features/dashboard/ui/shell/SubgridBarRow";
import { WidgetCardShell, WidgetError, WidgetSpinnerBox } from "#src/features/dashboard/ui/shell/WidgetCardShell";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useTranslation } from "react-i18next";
import { UnregisteredCompaniesModal } from "./UnregisteredCompaniesModal";

interface UnregisteredRowProps {
	label: string
	color: string
	count: number
	share: number
	indent?: boolean
	onOpen: () => void
}

function UnregisteredRow({ label, color, count, share, indent, onOpen }: UnregisteredRowProps) {
	return (
		<SubgridBarRow
			indent={indent}
			label={(
				<>
					<span className="w-2 h-2 rounded-sm shrink-0" style={{ background: color }} />
					{label}
				</>
			)}
			percent={share}
			color={color}
			// Only rows with something unregistered open the list.
			onOpen={count > 0 ? onOpen : undefined}
			value={(
				<>
					<strong className="font-semibold text-colorText">{formatCount(count)}</strong>
					{` · ${formatNumber(share, { maximumFractionDigits: 0 })}٪`}
				</>
			)}
		/>
	);
}

/** Card: number of (company × month) cells whose performance is still unregistered, split by service and company type. */
export function UnregisteredPerformancesWidget({ title, serviceIds }: DashboardWidgetProps) {
	const { t } = useTranslation();
	const T = useChartTheme();
	const [detailTarget, setDetailTarget] = useState<UnregisteredTarget | null>(null);
	const q = useQuery(widgetDataQuery("unregistered-performances", { service_ids: serviceIdsParam(serviceIds) }));
	const data = q.data;

	const byService = [...(data?.by_service ?? [])].sort((a, b) => (b.count || 0) - (a.count || 0));
	const withData = byService.filter(svc => svc.count > 0);
	const withoutData = byService.filter(svc => !svc.count);
	// The details api is per service; there is no list for the "grand total".
	const openDetails = (svc: { service_id: number, service_name: string, service_code: string }, companyType?: string) =>
		setDetailTarget({ serviceId: svc.service_id, serviceName: svc.service_name, serviceCode: svc.service_code, companyType });
	const total = withData.reduce((sum, svc) => sum + svc.count, 0) || 1;

	return (
		<WidgetCardShell
			refreshing={q.isFetching && !!data}
			icon={<RiAlertLine className="text-error" />}
			fill
			animateSize
			title={title}
			description={t("dashboard.widgets.unregistered.description")}
		>
			{q.isError
				? <WidgetError message={q.error.message} />
				: q.isPending
					? <WidgetSpinnerBox height={220} />
					: (
						<div className="flex flex-col gap-3.5 flex-1">
							<div className="flex flex-col justify-center gap-3 min-h-[120px]">
								<span className="flex items-baseline gap-2">
									<strong className="text-[28px] font-semibold leading-none">{formatCount(data?.total)}</strong>
									<span className="text-[12.5px] text-colorTextSecondary">{t("dashboard.widgets.unregistered.totalUnit")}</span>
								</span>
								{withData.length > 0 && (
									<span className="flex gap-0.5 h-[10px] rounded-full overflow-hidden bg-colorFillSecondary">
										{withData.map((svc, index) => (
											<span
												key={svc.service_id}
												title={t("dashboard.widgets.unregistered.barTitle", { name: svc.service_name, value: formatCount(svc.count) })}
												className="transition-[width] duration-[900ms]"
												style={{ width: `${(svc.count / total) * 100}%`, background: colorAt(T, index) }}
											/>
										))}
									</span>
								)}
							</div>

							{withData.length === 0
								? <div className="text-[12.5px] text-colorTextTertiary text-center py-4">{t("dashboard.common.noData")}</div>
								: (
									<div className="grid grid-cols-[max-content_minmax(0,1fr)_max-content] gap-x-3 gap-y-1 items-center flex-1 content-between">
										{withData.flatMap((svc, index) => [
											<UnregisteredRow key={svc.service_id} label={svc.service_name} color={colorAt(T, index)} count={svc.count} share={(svc.count / total) * 100} onOpen={() => openDetails(svc)} />,
											...(svc.by_company_type ?? []).map(ct => (
												<UnregisteredRow
													key={`${svc.service_id}-${ct.company_type}`}
													label={companyTypeLabel(svc.service_code, ct.company_type) ?? ""}
													color={colorAt(T, index)}
													count={ct.count}
													share={(ct.count / total) * 100}
													indent
													onOpen={() => openDetails(svc, ct.company_type)}
												/>
											)),
										])}
									</div>
								)}

							{withoutData.length > 0 && (
								<span className="text-[11.5px] text-colorTextTertiary">
									{t("dashboard.widgets.unregistered.noDataServices", { n: formatCount(withoutData.length), names: withoutData.map(svc => svc.service_name).join("، ") })}
								</span>
							)}
						</div>
					)}
			<UnregisteredCompaniesModal target={detailTarget} onClose={() => setDetailTarget(null)} />
		</WidgetCardShell>
	);
}
