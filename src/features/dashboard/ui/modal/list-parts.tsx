import type { ApprovalStage, RealSignState, SortOrder } from "#src/features/dashboard/api/dashboard.dto";
import type { ReactNode, RefObject } from "react";
import { companyTypeLabel } from "#src/features/dashboard/model/company-type";
import { formatCount } from "#src/features/dashboard/model/format";
import { RiArrowDownLine, RiArrowLeftSLine, RiArrowRightSLine, RiArrowUpDownLine, RiArrowUpLine } from "#src/features/dashboard/ui/icons";
import { AutoHeight } from "#src/features/dashboard/ui/shell/AutoHeight";
import { Button, Tag } from "antd";
import { useContext } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { ModalFooterContext } from "./DashboardModal";

export const PAGE_SIZE = 20;

/** Shared table look of cards and modals. */
export const TABLE_WRAP = "dash-scroll overflow-x-auto rounded-xl border border-solid border-[var(--dash-border)] bg-colorBgContainer";
export const TABLE = "w-full text-[12px] border-collapse";
export const THEAD_ROW = "bg-colorFillQuaternary text-colorTextSecondary";
export const TH = "px-3.5 py-2.5 text-start text-[10.5px] font-bold whitespace-nowrap border-0 border-b-2 border-solid border-colorFillSecondary";
export const TBODY_ROW = "group border-0 border-b border-solid border-colorFillTertiary last:border-b-0 transition-colors hover:bg-primaryBg";
export const TD = "px-3.5 py-2.5 align-middle text-colorText";

/** AntD Tag colors of the contract approval / real-sign stages. */
export const APPROVAL_STAGE_TAG: Record<ApprovalStage, string> = {
	pending_business_approval: "warning",
	pending_sign_approval: "warning",
	approved: "success",
};
export const REAL_SIGN_STATE_TAG: Record<RealSignState, string> = {
	not_started: "default",
	in_progress: "processing",
	signed: "success",
};

export function StatusTag({ color, children }: { color: string, children: ReactNode }) {
	return <Tag color={color} bordered={false} className="m-0 rounded-full text-[11.5px]">{children}</Tag>;
}

/** Service name with the company type below it. */
export function ServiceCell({ row }: { row: { service_name?: string | null, service_code: string, company_type: string | null } }) {
	const type = row.company_type ? companyTypeLabel(row.service_code, row.company_type) : null;
	return (
		<>
			<div>{row.service_name || "—"}</div>
			{type && <div className="text-[11.5px] text-colorTextSecondary">{type}</div>}
		</>
	);
}

/**
 * Body of list modals: on a new viewKey (tab/page/state) the content fades up and the height changes smoothly.
 */
export function ModalBody({ viewKey, children }: { viewKey: string, children: ReactNode }) {
	return (
		<AutoHeight variant="modal">
			<div key={viewKey} className="dash-fade-up">
				{children}
			</div>
		</AutoHeight>
	);
}

/** Centered message of list modals (denied / error / waiting / empty). */
export function ListMessage({ tone = "muted", children }: { tone?: "muted" | "error", children: ReactNode }) {
	return <p className={`m-0 py-8 text-center text-sm ${tone === "error" ? "text-error" : "text-colorTextSecondary"}`}>{children}</p>;
}

interface PagerBarProps {
	page: number
	totalPages: number
	/** Page of the data on screen (may lag `page` while loading). */
	shownPage?: number
	loading?: boolean
	onChange: (page: number) => void
	topRef?: RefObject<HTMLElement | null>
	total?: number
	pageSize?: number
}

/** Pagination; inside DashboardModal it renders into the fixed footer, elsewhere as a sticky bottom bar. */
export function PagerBar({ page, totalPages, shownPage, loading, onChange, topRef, total, pageSize }: PagerBarProps) {
	const { t } = useTranslation();
	const footer = useContext(ModalFooterContext);
	const go = (next: number) => {
		onChange(next);
		topRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
	};
	const current = shownPage ?? page;
	const buttons = (
		<>
			<Button size="small" icon={<RiArrowRightSLine />} disabled={loading || page <= 1} onClick={() => go(Math.max(1, page - 1))}>
				{t("dashboard.pager.prev")}
			</Button>
			<span className="min-w-[96px] text-center text-[12.5px] tabular-nums text-colorTextSecondary">
				{t("dashboard.pager.pageOf", { page: formatCount(current), total: formatCount(totalPages) })}
			</span>
			<Button size="small" icon={<RiArrowLeftSLine />} iconPosition="end" disabled={loading || page >= totalPages} onClick={() => go(page + 1)}>
				{t("dashboard.pager.next")}
			</Button>
		</>
	);
	if (footer) {
		if (!footer.el)
			return null;
		return createPortal(
			<>
				{total != null && pageSize != null && (
					<span className="text-[12.5px] tabular-nums text-colorTextSecondary">
						{t("dashboard.pager.range", {
							from: formatCount((current - 1) * pageSize + 1),
							to: formatCount(Math.min(current * pageSize, total)),
							total: formatCount(total),
						})}
					</span>
				)}
				<div className="dash-pager flex items-center gap-1 ms-auto">{buttons}</div>
			</>,
			footer.el,
		);
	}
	return (
		<div className="sticky -bottom-4 z-10 -mx-5 -mb-4 mt-4 px-5 py-3 flex items-center justify-between gap-2 bg-colorBgContainer border-0 border-t border-solid border-[var(--dash-border)]">
			{buttons}
		</div>
	);
}

interface SortableThProps {
	label: ReactNode
	order: SortOrder
	onClick: () => void
	/** Inactive columns show a neutral up/down icon. */
	active?: boolean
	className?: string
}

/** Server-sorted column header; the arrow follows the order of the response on screen. */
export function SortableTh({ label, order, onClick, active = true, className = "" }: SortableThProps) {
	const Icon = !active ? RiArrowUpDownLine : order === "asc" ? RiArrowUpLine : RiArrowDownLine;
	return (
		<th className={`${TH} ${className}`} aria-sort={active ? (order === "asc" ? "ascending" : "descending") : "none"}>
			<button
				type="button"
				onClick={onClick}
				className={`inline-flex items-center gap-1 bg-transparent border-0 p-0 font-[inherit] cursor-pointer transition-colors hover:text-colorText ${active ? "text-colorText" : "text-inherit"}`}
			>
				{label}
				<Icon className={`text-xs ${active ? "text-primaryText" : "opacity-50"}`} />
			</button>
		</th>
	);
}
