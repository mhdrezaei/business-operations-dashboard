// Year/month range of the monthly-performance card. RangeFields is used both in the horizontal bar inside the card
// and in the vertical floating panel. The panel is shown only when the empty gutter beside the cards has room (card
// widths never change); its top is aligned with the monthly-performance card, it sticks while scrolling and never
// goes below the monthly-KPI card.
import type { YearMonth } from "#src/features/dashboard/model/jalali";
import type { DashboardRange } from "#src/features/dashboard/model/types";
import type { RefObject } from "react";
import { formatCount, formatYear } from "#src/features/dashboard/model/format";
import { buildShPeriodsRange, FIRST_YEAR, getCurrentJalali, monthIndex, monthName, MONTHS, shiftJalaliMonth } from "#src/features/dashboard/model/jalali";
import { Select } from "antd";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { RiArrowLeftLine, RiCalendar2Line } from "../icons";
import { useDashboardBorderStyle } from "../shell/dashboard-border";
import { floatingArea, GLASS_PANEL, PANEL_GAP, PANEL_WIDTH, placePanel, useFloatingTracking } from "./floating-panel";

const TOP_ANCHOR_ID = "monthly-performance";
const BOTTOM_ANCHOR_ID = "monthly-performance-kpis";
const ANCHOR_IDS = [TOP_ANCHOR_ID, BOTTOM_ANCHOR_ID] as const;

interface RangeFieldsProps {
	range: DashboardRange
	onChange: (range: DashboardRange) => void
	vertical?: boolean
}

function yearOptions(min: number, max: number) {
	const options = [];
	for (let year = Math.max(min, FIRST_YEAR); year <= max; year++)
		options.push({ value: year, label: formatYear(year) });
	return options;
}

function monthOptions(isAllowed: (month: number) => boolean) {
	return MONTHS.filter(isAllowed).map(month => ({ value: month, label: monthName(month) }));
}

/** The range end is at least 4 and at most 12 months from its start. */
export function RangeFields({ range, onChange, vertical = false }: RangeFieldsProps) {
	const { t } = useTranslation();
	// Future months are not selectable: "to" is at most the current month and, as a range is at least 4 months,
	// "from" is at most 3 months before the current month.
	const current = useMemo(() => getCurrentJalali(), []);
	const maxFrom = useMemo(() => shiftJalaliMonth(current, -3), [current]);
	const minEnd = useMemo(() => shiftJalaliMonth(range.from, 3), [range.from]);
	const maxEnd = useMemo(() => {
		const capped = shiftJalaliMonth(range.from, 11);
		return monthIndex(capped) > monthIndex(current) ? current : capped;
	}, [range.from, current]);
	const periods = useMemo(() => buildShPeriodsRange(range.from, range.to), [range]);

	const setFrom = (patch: Partial<YearMonth>) => {
		let from = { ...range.from, ...patch };
		if (monthIndex(from) > monthIndex(maxFrom))
			from = maxFrom;
		// "to" is kept; it only snaps back to 12 months when the range grew longer, or to 4 months when it got shorter.
		const span = monthIndex(range.to) - monthIndex(from);
		if (span > 11)
			onChange({ from, to: shiftJalaliMonth(from, 11) });
		else if (span < 3)
			onChange({ from, to: shiftJalaliMonth(from, 3) });
		else
			onChange({ from, to: range.to });
	};

	const setToYear = (value: number) => {
		const year = Math.min(Math.max(value, minEnd.year), maxEnd.year);
		let month = range.to.month;
		if (year === minEnd.year)
			month = Math.max(month, minEnd.month);
		if (year === maxEnd.year)
			month = Math.min(month, maxEnd.month);
		onChange({ ...range, to: { year, month } });
	};

	const yearClass = vertical ? "w-full" : "w-[84px]";
	const monthClass = vertical ? "w-full" : "w-[112px]";
	const group = vertical ? "flex flex-col gap-1.5" : "flex items-center gap-1.5";
	const label = "text-[12px] text-colorTextTertiary";

	const fromGroup = (
		<div className={group}>
			<Select
				size="small"
				className={yearClass}
				popupMatchSelectWidth={false}
				value={range.from.year}
				onChange={year => setFrom({ year })}
				options={yearOptions(FIRST_YEAR, maxFrom.year)}
			/>
			<Select
				size="small"
				className={monthClass}
				popupMatchSelectWidth={false}
				value={range.from.month}
				onChange={month => setFrom({ month })}
				options={monthOptions(month => range.from.year < maxFrom.year || month <= maxFrom.month)}
			/>
		</div>
	);

	const toGroup = (
		<div className={group}>
			<Select
				size="small"
				className={yearClass}
				popupMatchSelectWidth={false}
				value={range.to.year}
				onChange={setToYear}
				options={yearOptions(minEnd.year, maxEnd.year)}
			/>
			<Select
				size="small"
				className={monthClass}
				popupMatchSelectWidth={false}
				value={range.to.month}
				onChange={month => onChange({ ...range, to: { ...range.to, month } })}
				options={monthOptions((month) => {
					if (range.to.year === minEnd.year && month < minEnd.month)
						return false;
					return !(range.to.year === maxEnd.year && month > maxEnd.month);
				})}
			/>
		</div>
	);

	const count = (
		<span className="text-[11.5px] text-colorTextTertiary">
			{t("dashboard.filters.range.monthsCount", { value: formatCount(periods.length) })}
		</span>
	);

	if (vertical) {
		return (
			<div className="flex flex-col gap-2.5">
				<span className={label}>{t("dashboard.common.from")}</span>
				{fromGroup}
				<span className={label}>{t("dashboard.common.to")}</span>
				{toGroup}
				{count}
			</div>
		);
	}
	return (
		<>
			<span className={label}>{t("dashboard.common.from")}</span>
			{fromGroup}
			<RiArrowLeftLine className="text-[14px] text-colorTextTertiary" />
			<span className={label}>{t("dashboard.common.to")}</span>
			{toGroup}
			<span className="ms-1">{count}</span>
		</>
	);
}

interface Placement {
	top: number
	left: number
}

/** Position of the panel; null = no room (the bar inside the card is shown instead). */
function usePanelPlacement(panelRef: RefObject<HTMLElement>) {
	const [placement, setPlacement] = useState<Placement | null>(null);
	const topRef = useRef(0);

	useFloatingTracking(() => {
		const topEl = document.getElementById(TOP_ANCHOR_ID);
		const bottomEl = document.getElementById(BOTTOM_ANCHOR_ID) ?? topEl;
		if (!topEl || !bottomEl) {
			setPlacement(null);
			return;
		}
		const area = floatingArea(topEl);
		const t = topEl.getBoundingClientRect();
		const b = bottomEl.getBoundingClientRect();
		// The empty gutter on the right (RTL: start of the content) up to the edge of the scroll area.
		const left = t.right + PANEL_GAP;
		if (area.right - left < PANEL_WIDTH + PANEL_GAP) {
			setPlacement(null);
			return;
		}
		const height = panelRef.current?.offsetHeight ?? 0;
		// The bottom of the panel never passes the bottom of the KPI card; when that card leaves the top, the panel
		// moves up with it (no sticky floor).
		const top = Math.min(Math.max(area.stickyTop, t.top), b.bottom - height);
		// top is written to the DOM directly (not via setState): a React re-render lags one frame and made scrolling jittery.
		topRef.current = top;
		placePanel(panelRef.current, top, area.top);
		setPlacement(p => (p && p.left === left ? p : { top, left }));
	}, ANCHOR_IDS);

	return placement && { ...placement, top: topRef.current };
}

interface RangeFilterPanelProps {
	range: DashboardRange
	onChange: (range: DashboardRange) => void
	onActiveChange: (active: boolean) => void
}

export function RangeFilterPanel({ range, onChange, onActiveChange }: RangeFilterPanelProps) {
	const { t } = useTranslation();
	const borderStyle = useDashboardBorderStyle();
	const ref = useRef<HTMLElement>(null);
	const placement = usePanelPlacement(ref);
	const active = placement !== null;

	useLayoutEffect(() => {
		onActiveChange(active);
		return () => onActiveChange(false);
	}, [active, onActiveChange]);

	if (!placement)
		return null;
	return createPortal(
		<aside
			ref={ref}
			dir="rtl"
			style={{ ...borderStyle, top: placement.top, left: placement.left, width: PANEL_WIDTH }}
			className={`fixed z-20 p-2.5 flex flex-col gap-2.5 border-[var(--dash-border)] hover:border-primary focus-within:border-primary ${GLASS_PANEL}`}
			aria-label={t("dashboard.filters.range.ariaLabel")}
		>
			<div className="flex items-center gap-2 px-2.5 pt-1 pb-1.5 text-[13px] font-semibold text-colorText border-0 border-b border-solid border-[var(--dash-border)]">
				<RiCalendar2Line className="text-base text-primaryText" />
				{t("dashboard.filters.range.title")}
			</div>
			<div className="px-1 pb-1">
				<RangeFields range={range} onChange={onChange} vertical />
			</div>
			<p className="m-0 px-2.5 pb-1 pt-2 text-[11.5px] leading-5 text-colorTextTertiary border-0 border-t border-solid border-[var(--dash-border)]">
				{t("dashboard.filters.range.maxHint")}
			</p>
		</aside>,
		document.body,
	);
}
