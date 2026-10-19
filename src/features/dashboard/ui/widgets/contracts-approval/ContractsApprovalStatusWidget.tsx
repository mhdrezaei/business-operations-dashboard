import type { ApprovalCompanyTypeRow, ApprovalServiceRow } from "#src/features/dashboard/api/dashboard.dto";
import type { DashboardWidgetProps } from "#src/features/dashboard/model/types";
import type { ChartTheme } from "#src/features/dashboard/ui/charts/chart-theme";
import type { ApprovalKind, ApprovalSegment, ApprovalState } from "./approval-segments";
import type { ApprovalDetailsTarget } from "./ApprovalDetailsModal";
import { companyTypeLabel } from "#src/features/dashboard/model/company-type";
import { formatCount, formatNumber } from "#src/features/dashboard/model/format";
import { serviceIdsParam } from "#src/features/dashboard/model/types";
import { widgetDataQuery } from "#src/features/dashboard/queries/dashboard.queries";
import { ApprovalDonut } from "#src/features/dashboard/ui/charts/ApprovalDonut";
import { colorAt, useChartTheme } from "#src/features/dashboard/ui/charts/chart-theme";
import { RiShieldCheckLine } from "#src/features/dashboard/ui/icons";
import { SUBGRID_ROW_INTERACTIVE, SUBGRID_ROW_MOTION } from "#src/features/dashboard/ui/shell/SubgridBarRow";
import { WidgetCardShell, WidgetError, WidgetSpinnerBox } from "#src/features/dashboard/ui/shell/WidgetCardShell";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { useTranslation } from "react-i18next";
import { businessSegments, segmentsTotal, signSegments } from "./approval-segments";
import { ApprovalDetailsModal } from "./ApprovalDetailsModal";

// `sign_approval` is the contract-office approval (`is_signed`), not the real signature — never label it "signed".

const TONE_BG = { ok: "bg-success", warn: "bg-warning", faint: "bg-colorTextTertiary" } as const;

function rateColor(pct: number | null) {
	if (pct === null)
		return "text-colorTextTertiary";
	if (pct >= 80)
		return "text-success";
	if (pct >= 50)
		return "text-warning";
	return "text-error";
}

interface MatrixRowData {
	key: string
	ctx: Omit<ApprovalDetailsTarget, "approval" | "state">
	name: string
	color: string
	total?: number
	businessApproval?: ApprovalServiceRow["business_approval"]
	signApproval?: ApprovalServiceRow["sign_approval"]
	indent: boolean
}

type OpenDetails = (approval: ApprovalKind, state?: ApprovalState) => void;

/**
 * 7px stacked bar with the approved percent (of the card's total) at the end. Clicking a part opens the list of that
 * number (a part with value 0 has no width at all).
 */
function ApprovalBar({ segments, label, onOpen }: { segments: ApprovalSegment[], label: string, onOpen: (state: ApprovalState) => void }) {
	const { t } = useTranslation();
	const total = segmentsTotal(segments);
	const pct = total ? (segments[0].value / total) * 100 : null;
	const width = (n: number) => (total ? `${(n / total) * 100}%` : "0%");
	const title = `${label} — ${segments.map(s => `${s.short} ${formatCount(s.value)}`).join(" · ")}`;
	return (
		<span title={title} className="flex items-center gap-2 min-w-0 w-full">
			<span className="flex-1 flex h-[7px] rounded-full overflow-hidden bg-colorFillSecondary">
				{segments.map(s => s.value > 0
					? (
						<button
							key={s.key}
							type="button"
							title={`${s.label}: ${formatCount(s.value)}`}
							aria-label={t("dashboard.charts.openAll")}
							onClick={(e) => {
								e.stopPropagation();
								onOpen(s.key);
							}}
							className={`h-full p-0 border-0 cursor-pointer transition-[width,filter] duration-[900ms] hover:brightness-110 dark:hover:brightness-125 ${TONE_BG[s.tone]}`}
							style={{ width: width(s.value) }}
						/>
					)
					: <span key={s.key} className={`transition-[width] duration-[900ms] ${TONE_BG[s.tone]}`} style={{ width: width(s.value) }} />)}
			</span>
			<span className={`w-10 text-end text-[12px] ${rateColor(pct)}`}>
				{pct === null ? "—" : `${formatNumber(pct, { maximumFractionDigits: 0 })}٪`}
			</span>
		</span>
	);
}

// These three are direct items of the outer grid (not a grid per row), so the "service" column has the same width
// in every row — with a separate grid per row each max-content would be computed independently.
function MatrixRow({ name, color, total, businessApproval, signApproval, indent, onOpen }: Omit<MatrixRowData, "key" | "ctx"> & { onOpen: OpenDetails }) {
	const { t } = useTranslation();
	const clickable = !!total;
	const open = () => onOpen("business");
	return (
		// subgrid: the row is a real box (can grow/highlight) whose columns are those of the outer grid.
		// Clicking anywhere opens the whole row's list; bar parts open their own list (stopPropagation).
		<div
			role={clickable ? "button" : undefined}
			tabIndex={clickable ? 0 : undefined}
			onClick={clickable ? open : undefined}
			onKeyDown={clickable
				? (e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						open();
					}
				}
				: undefined}
			className={`grid grid-cols-subgrid col-span-3 relative rounded-lg border-0 border-b border-solid border-colorFillSecondary ${SUBGRID_ROW_MOTION} ${
				clickable
					? SUBGRID_ROW_INTERACTIVE
					: ""
			}`}
		>
			<span className={`flex items-center gap-1.5 text-[12.5px] whitespace-nowrap py-2.5 px-2 ${indent ? "!ps-5" : ""}`}>
				<span className="w-2 h-2 rounded-sm shrink-0" style={{ background: color }} />
				{name}
				<span className="text-[11.5px] text-colorTextTertiary">{total ? formatCount(total) : t("dashboard.widgets.approval.noContract")}</span>
			</span>
			<span className="flex items-center py-2.5 px-2">
				<ApprovalBar segments={businessSegments(businessApproval)} label={t("dashboard.approval.kinds.business")} onOpen={st => onOpen("business", st)} />
			</span>
			<span className="flex items-center py-2.5 px-2">
				<ApprovalBar segments={signSegments(signApproval)} label={t("dashboard.approval.kinds.sign")} onOpen={st => onOpen("sign", st)} />
			</span>
		</div>
	);
}

function buildMatrixRows(byService: ApprovalServiceRow[], T: ChartTheme): MatrixRowData[] {
	const rows: MatrixRowData[] = [];
	byService.forEach((svc, index) => {
		const ctx = { serviceId: svc.service_id, serviceName: svc.service_name, serviceCode: svc.service_code };
		rows.push({
			key: String(svc.service_id),
			ctx,
			name: svc.service_name,
			color: colorAt(T, index),
			total: svc.business_approval?.total,
			businessApproval: svc.business_approval,
			signApproval: svc.sign_approval,
			indent: false,
		});
		(svc.by_company_type || []).forEach((ct: ApprovalCompanyTypeRow) => {
			rows.push({
				key: `${svc.service_id}-${ct.company_type}`,
				ctx: { ...ctx, companyType: ct.company_type },
				name: companyTypeLabel(svc.service_code, ct.company_type) ?? ct.company_type,
				color: colorAt(T, index),
				total: ct.business_approval?.total,
				businessApproval: ct.business_approval,
				signApproval: ct.sign_approval,
				indent: true,
			});
		});
	});
	return rows;
}

export function ContractsApprovalStatusWidget({ title, serviceIds }: DashboardWidgetProps) {
	const { t } = useTranslation();
	const T = useChartTheme();
	const [detailTarget, setDetailTarget] = useState<ApprovalDetailsTarget | null>(null);
	const q = useQuery(widgetDataQuery("contracts-approval-status", { service_ids: serviceIdsParam(serviceIds) }));
	const data = q.data ?? undefined;

	// The details API accepts one service_id; the card's grand total with a service filter is the sum of the selected
	// services, so it can be fetched only with exactly one selected service.
	const totalDetailsAvailable = serviceIds.length <= 1;
	const openTotal = (approval: ApprovalKind, state?: ApprovalState) => {
		if (!totalDetailsAvailable)
			return;
		setDetailTarget({ approval, state, ...(serviceIds.length === 1 ? { serviceId: serviceIds[0] } : {}) });
	};

	const byService = useMemo(
		() => [...(data?.by_service || [])].sort((a, b) => (b.business_approval?.total || 0) - (a.business_approval?.total || 0)),
		[data],
	);
	const totalCount = segmentsTotal(businessSegments(data?.total?.business_approval));
	const matrixRows = useMemo(() => buildMatrixRows(byService, T), [byService, T]);

	const donuts: { approval: ApprovalKind, segments: ApprovalSegment[] }[] = [
		{ approval: "business", segments: businessSegments(data?.total?.business_approval) },
		{ approval: "sign", segments: signSegments(data?.total?.sign_approval) },
	];
	const header = (key: string) => (
		<span className="pb-2 px-2 text-[11.5px] text-colorTextTertiary border-0 border-b border-solid border-colorFillSecondary">{key}</span>
	);

	let content;
	if (q.isError) {
		content = <WidgetError message={q.error.message} />;
	}
	else if (q.isFetching && !data) {
		content = <WidgetSpinnerBox height={220} />;
	}
	else {
		content = (
			<div className="flex flex-wrap gap-4 items-stretch">
				<div className="flex-1 basis-[360px] min-w-0 grid grid-cols-[repeat(auto-fit,minmax(min(100%,290px),1fr))] gap-2.5 content-start">
					{donuts.map(g => (
						<div key={g.approval} className="flex items-center gap-3.5 p-2.5 bg-colorFillQuaternary border border-solid border-[var(--dash-border)] rounded-[10px]">
							<ApprovalDonut segments={g.segments} onOpen={totalDetailsAvailable ? st => openTotal(g.approval, st) : undefined} />
							<div className="flex flex-col gap-1.5 flex-1 min-w-0 whitespace-nowrap">
								<strong className="text-[13px] font-semibold">{t(`dashboard.approval.kinds.${g.approval}`)}</strong>
								{g.segments.map((seg) => {
									const clickable = seg.value > 0 && totalDetailsAvailable;
									return (
										<button
											key={seg.key}
											type="button"
											disabled={!clickable}
											title={!totalDetailsAvailable ? t("dashboard.widgets.approval.multiServiceTitle") : undefined}
											onClick={() => openTotal(g.approval, seg.key)}
											className="flex items-center gap-1.5 p-0 border-0 bg-transparent font-[inherit] text-[12px] text-colorTextSecondary text-start enabled:cursor-pointer enabled:hover:text-primaryText transition-colors"
										>
											<span className={`w-2 h-2 rounded-sm ${TONE_BG[seg.tone]}`} />
											{seg.label}
											{" "}
											<strong className="font-semibold text-colorText">{formatCount(seg.value)}</strong>
										</button>
									);
								})}
							</div>
						</div>
					))}
				</div>

				<div className="flex-[2] basis-[540px] min-w-0 grid grid-cols-[max-content_minmax(0,1fr)_minmax(0,1fr)] content-start">
					{header(t("dashboard.columns.service"))}
					{header(t("dashboard.approval.kinds.business"))}
					{header(t("dashboard.approval.kinds.sign"))}
					{matrixRows.length === 0
						? <div className="col-span-3 py-6 text-center text-[12.5px] text-colorTextTertiary">{t("dashboard.common.noData")}</div>
						: matrixRows.map(({ key, ctx, ...r }) => (
							<MatrixRow key={key} {...r} onOpen={(approval, state) => setDetailTarget({ approval, state, ...ctx })} />
						))}
				</div>
			</div>
		);
	}

	return (
		<WidgetCardShell
			refreshing={q.isFetching && !!data}
			icon={<RiShieldCheckLine className="text-primaryText" />}
			title={title}
			description={t("dashboard.widgets.approval.description", { value: formatCount(totalCount) })}
		>
			{content}
			<ApprovalDetailsModal target={detailTarget} onClose={() => setDetailTarget(null)} />
		</WidgetCardShell>
	);
}
