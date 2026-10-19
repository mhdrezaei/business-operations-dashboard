import type { KpiCompanyTypeRow, KpiRatios, KpiServiceRow, KpiShares, NullableGrowth, NullableMoney } from "#src/features/dashboard/api/dashboard.dto";
import type { ReactNode } from "react";
import { companyTypeLabel } from "#src/features/dashboard/model/company-type";
import { formatPercent, formatRial, toNum } from "#src/features/dashboard/model/format";
import { prefersReducedMotion } from "#src/features/dashboard/model/navigation";
import { RiAddLine, RiArrowDownSLine, RiSubtractLine } from "#src/features/dashboard/ui/icons";
import { TABLE, TABLE_WRAP, TBODY_ROW, TD, TH, THEAD_ROW } from "#src/features/dashboard/ui/modal/list-parts";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { GrowthBadge } from "./GrowthBadge";

type Row = KpiServiceRow | KpiCompanyTypeRow;

interface TextColumn { key: string, type: "text" }
interface MoneyColumn { key: string, type: "money", field: keyof NullableMoney, muted?: boolean }
interface PercentColumn { key: string, type: "percent", field: keyof KpiRatios | keyof KpiShares }
interface GrowthColumn { key: string, type: "growth", growth: keyof NullableGrowth, inverse?: boolean }
type Column = TextColumn | MoneyColumn | PercentColumn | GrowthColumn;

const SERVICE_COLUMNS: Column[] = [
	{ key: "service", type: "text" },
	{ key: "income", type: "money", field: "income" },
	{ key: "expense", type: "money", field: "expense", muted: true },
	{ key: "profit", type: "money", field: "profit" },
	{ key: "profitMargin", type: "percent", field: "profit_margin" },
	{ key: "incomeShare", type: "percent", field: "income_share" },
	{ key: "expenseShare", type: "percent", field: "expense_share" },
	{ key: "profitShare", type: "percent", field: "profit_share" },
	{ key: "growthIncome", type: "growth", growth: "income" },
	{ key: "growthExpense", type: "growth", growth: "expense", inverse: true },
	{ key: "growthProfit", type: "growth", growth: "profit" },
];

const CARD_GROW_MS = 330;
const ROWS_OPEN_MS = 320;

interface Sort {
	key: string
	dir: "asc" | "desc"
}

function serviceName(s: KpiServiceRow) {
	return s.service_name || s.service_code;
}

function sortValue(col: Column | undefined, s: KpiServiceRow): string | number | null {
	if (col?.type === "text")
		return serviceName(s);
	if (col?.type === "growth")
		return toNum(s.previous_period.growth[col.growth]);
	if (col?.type === "money" || col?.type === "percent")
		return toNum(s[col.field as keyof KpiServiceRow]);
	return null;
}

function SortHeader({ column, sort, onSort }: { column: Column, sort: Sort, onSort: (key: string) => void }) {
	const { t } = useTranslation();
	const active = sort.key === column.key;
	return (
		<th className={TH}>
			<button type="button" onClick={() => onSort(column.key)} className="inline-flex items-center gap-1 bg-transparent border-0 p-0 font-[inherit] cursor-pointer text-inherit hover:text-colorText transition-colors">
				{t(`dashboard.widgets.monthlyKpis.columns.${column.key}`)}
				<RiArrowDownSLine className={`text-xs transition-transform ${active ? "opacity-100" : "opacity-30"} ${active && sort.dir === "asc" ? "rotate-180" : ""}`} />
			</button>
		</th>
	);
}

/**
 * Per-service table with client-side sorting and company-type child rows. Opening: the card grows first (reserved
 * min-height), then the rows open; closing: rows first, then the card.
 */
export function ServicesTable({ services }: { services: KpiServiceRow[] }) {
	const { t } = useTranslation();
	const [sort, setSort] = useState<Sort>({ key: "income", dir: "desc" });
	const onSort = (key: string) => setSort(s => (s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }));

	const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
	const wrapRef = useRef<HTMLDivElement>(null);
	const [reserve, setReserve] = useState<number | null>(null);
	const pendingRef = useRef(new Set<number>());
	const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
	useEffect(() => () => timersRef.current.forEach(clearTimeout), []);
	const later = (fn: () => void, ms: number) => timersRef.current.push(setTimeout(fn, ms));

	const toggle = (id: number) => {
		if (pendingRef.current.has(id))
			return;
		if (expanded.has(id)) {
			setExpanded((prev) => {
				const next = new Set(prev);
				next.delete(id);
				return next;
			});
			return;
		}
		const openNow = () => setExpanded(prev => new Set(prev).add(id));
		const wrap = wrapRef.current;
		if (!wrap || prefersReducedMotion()) {
			openNow();
			return;
		}
		// Natural height of the child rows (inner content, not the collapsed height).
		let extra = 0;
		wrap.querySelectorAll<HTMLElement>(`tr[data-child-of="${id}"]`).forEach((tr) => {
			const inner = tr.querySelector<HTMLElement>("td > div > div > div");
			extra += (inner?.offsetHeight || 0) + 1;
		});
		pendingRef.current.add(id);
		setReserve(wrap.offsetHeight + extra);
		later(() => {
			openNow();
			later(() => {
				setReserve(null);
				pendingRef.current.delete(id);
			}, ROWS_OPEN_MS);
		}, CARD_GROW_MS);
	};

	const rows = useMemo(() => {
		const col = SERVICE_COLUMNS.find(c => c.key === sort.key);
		const sign = sort.dir === "asc" ? 1 : -1;
		return [...services].sort((a, b) => {
			const va = sortValue(col, a);
			const vb = sortValue(col, b);
			if (va === null && vb === null)
				return 0;
			if (va === null)
				return 1; // null always last
			if (vb === null)
				return -1;
			return (typeof va === "string" || typeof vb === "string" ? String(va).localeCompare(String(vb)) : va - (vb as number)) * sign;
		});
	}, [services, sort]);

	const renderCell = (c: Column, row: Row): ReactNode => {
		switch (c.type) {
			case "money":
				return formatRial(row[c.field]);
			case "percent":
				return formatPercent(row[c.field as keyof Row]);
			case "growth":
				return (
					<GrowthBadge
						value={row.previous_period.growth[c.growth]}
						inverse={c.inverse}
						title={t("dashboard.widgets.monthlyKpis.yoy", { value: formatPercent(row.year_over_year.growth[c.growth]) })}
					/>
				);
			default:
				return null;
		}
	};

	return (
		<div ref={wrapRef} className={TABLE_WRAP} style={reserve ? { minHeight: reserve } : undefined}>
			<table className={`${TABLE} min-w-[1000px]`}>
				<thead>
					<tr className={THEAD_ROW}>
						{SERVICE_COLUMNS.map(c => <SortHeader key={c.key} column={c} sort={sort} onSort={onSort} />)}
					</tr>
				</thead>
				<tbody>
					{rows.map((s, i) => {
						const children = s.by_company_type;
						const expandable = children.length > 0;
						const isOpen = expandable && expanded.has(s.service_id);
						return (
							<Fragment key={s.service_id}>
								<tr
									className={`${TBODY_ROW} dash-fade-slide-up ${expandable ? "cursor-pointer" : ""} ${isOpen ? "bg-primaryBg" : ""}`}
									style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
									onClick={expandable ? () => toggle(s.service_id) : undefined}
									aria-expanded={expandable ? isOpen : undefined}
								>
									{SERVICE_COLUMNS.map(c => (
										<td key={c.key} className={`${TD} whitespace-nowrap ${c.type === "text" ? "font-medium" : ""} ${c.type === "money" && c.muted ? "!text-colorTextSecondary" : ""}`}>
											{c.type === "text"
												? (
													<span className="inline-flex items-center gap-2">
														{expandable
															? (
																<span className="inline-flex items-center justify-center w-4 h-4 rounded border border-solid border-colorBorder text-xs text-primary bg-colorBgContainer">
																	{isOpen ? <RiSubtractLine /> : <RiAddLine />}
																</span>
															)
															: <span className="w-4" />}
														{serviceName(s)}
													</span>
												)
												: renderCell(c, s)}
										</td>
									))}
								</tr>
								{/* Rows stay mounted; opening/closing animates the height (grid-rows). */}
								{children.map(ct => (
									<tr
										key={`${s.service_id}-${ct.company_type}`}
										aria-hidden={!isOpen}
										data-child-of={s.service_id}
										className={`bg-colorFillQuaternary hover:bg-primaryBg transition-colors ${isOpen ? "border-0 border-b border-solid border-colorBorder" : ""}`}
									>
										{SERVICE_COLUMNS.map(c => (
											<td
												key={c.key}
												title={c.type === "percent" && c.field.endsWith("_share") ? t("dashboard.widgets.monthlyKpis.shareOfService") : undefined}
												className={`p-0 align-middle whitespace-nowrap text-[11.5px] text-colorText ${c.type === "money" && c.muted ? "!text-colorTextSecondary" : ""}`}
											>
												<div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
													<div className="min-h-0 overflow-hidden">
														<div className="px-3.5 py-2.5">
															{c.type === "text"
																? (
																	<span className="inline-flex items-center gap-2 ps-6 font-medium">
																		<span className="w-1.5 h-1.5 rounded-full bg-primary" />
																		{companyTypeLabel(s.service_code, ct.company_type)}
																	</span>
																)
																: renderCell(c, ct)}
														</div>
													</div>
												</div>
											</td>
										))}
									</tr>
								))}
							</Fragment>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
