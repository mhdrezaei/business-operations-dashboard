import type { ContractsExpiringResponse } from "#src/features/dashboard/api/dashboard.dto";
import { companyTypeLabel } from "#src/features/dashboard/model/company-type";
import { formatCount } from "#src/features/dashboard/model/format";
import { RiArrowDownSLine } from "#src/features/dashboard/ui/icons";
import { useState } from "react";

interface ExpiringServiceRowProps {
	svc: ContractsExpiringResponse["by_service"][number]
	color: string
	hoverKey: string | null
	setHoverKey: (key: string | null) => void
}

/** One service of the by-service panel; a service with company types opens an animated drill-down under its row. */
export function ExpiringServiceRow({ svc, color, hoverKey, setHoverKey }: ExpiringServiceRowProps) {
	const [open, setOpen] = useState(false);
	const key = `s${svc.service_id}`;
	const hovered = hoverKey === key;
	const dimmed = hoverKey && !hovered;
	const types = (svc.by_company_type || []).map(ct => ({
		key: ct.company_type,
		label: companyTypeLabel(svc.service_code, ct.company_type),
		count: (ct.buckets || []).reduce((sum, bk) => sum + bk.count, 0),
	}));
	const hasTypes = types.length > 0;
	const total = (svc.buckets || []).reduce((sum, bk) => sum + bk.count, 0);
	const typesTotal = types.reduce((sum, ty) => sum + ty.count, 0);

	const header = (
		<>
			<span className="w-2 h-2 rounded-sm shrink-0" style={{ background: color }} />
			<span className="truncate">{svc.service_name}</span>
			<strong className="ms-auto shrink-0 font-semibold text-colorText">{formatCount(total)}</strong>
			{hasTypes && (
				<RiArrowDownSLine className={`text-sm shrink-0 text-colorTextTertiary transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
			)}
		</>
	);
	const headerCls = "flex items-center gap-2 min-w-0 w-full px-2.5 py-1.5 text-[12px] text-start";

	return (
		<div
			onMouseEnter={() => setHoverKey(key)}
			className={`min-w-0 rounded-lg border border-solid transition-all duration-200 ${open ? "col-span-2" : ""} ${
				hovered
					? "border-primary bg-primaryBg text-colorText"
					: "border-[var(--dash-border)] bg-colorFillQuaternary text-colorTextSecondary"
			} ${dimmed ? "opacity-45" : ""}`}
		>
			{hasTypes
				? (
					<button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} className={`${headerCls} bg-transparent border-0 font-[inherit] text-inherit cursor-pointer`}>
						{header}
					</button>
				)
				: <div className={`${headerCls} cursor-default`}>{header}</div>}
			{hasTypes && (
				<div
					aria-hidden={!open}
					className="grid transition-[grid-template-rows,opacity] duration-300 ease-in-out"
					style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
				>
					<div className="min-h-0 overflow-hidden">
						<div className="flex flex-col gap-2 px-2.5 pb-2.5 pt-1 border-0 border-t border-solid border-colorFillSecondary">
							{types.map(ty => (
								<div key={ty.key} className="flex flex-col gap-1">
									<div className="flex items-center justify-between gap-2 text-[11.5px]">
										<span className="text-colorTextSecondary truncate">{ty.label}</span>
										<strong className="font-semibold text-colorText tabular-nums">{formatCount(ty.count)}</strong>
									</div>
									<span className="block h-1 rounded-full bg-colorFillSecondary overflow-hidden">
										<span
											className="block h-full rounded-full transition-[width] duration-500"
											style={{ width: `${typesTotal > 0 ? (ty.count / typesTotal) * 100 : 0}%`, background: color }}
										/>
									</span>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
