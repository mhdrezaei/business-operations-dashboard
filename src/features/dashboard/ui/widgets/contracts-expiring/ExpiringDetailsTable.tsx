import type { ExpiringContractDetail } from "#src/features/dashboard/api/dashboard.dto";
import { dateText } from "#src/features/dashboard/model/jalali";
import { StatusTag, TABLE, TABLE_WRAP, TBODY_ROW, TD, TH, THEAD_ROW } from "#src/features/dashboard/ui/modal/list-parts";
import { useTranslation } from "react-i18next";

/** Contracts expiring in the chosen month / service (modal body); service names come from the card's by_service. */
export function ExpiringDetailsTable({ items, serviceNames }: { items: ExpiringContractDetail[], serviceNames: Map<string, string> }) {
	const { t } = useTranslation();
	return (
		<div dir="rtl" className={TABLE_WRAP}>
			<table className={TABLE}>
				<thead>
					<tr className={THEAD_ROW}>
						<th className={TH}>{t("dashboard.columns.service")}</th>
						<th className={TH}>{t("dashboard.columns.company")}</th>
						<th className={TH}>{t("dashboard.columns.contractNumber")}</th>
						<th className={TH}>{t("dashboard.widgets.expiring.columns.type")}</th>
						<th className={TH}>{t("dashboard.widgets.expiring.columns.endDate")}</th>
					</tr>
				</thead>
				<tbody>
					{items.map(item => (
						<tr key={`${item.base_contract_id}-${item.addendum_group_id ?? "base"}`} className={`${TBODY_ROW} align-top`}>
							<td className={TD}>{serviceNames.get(item.service_code) || item.service_code}</td>
							<td className={TD}>
								<div className="flex flex-col gap-1">
									<span className="font-medium [overflow-wrap:anywhere]">{item.company_name}</span>
									{item.company_type && (
										<span className="text-[11px] text-colorTextTertiary">{item.company_type}</span>
									)}
								</div>
							</td>
							<td className={TD}>
								{item.contract_number}
								{item.is_addendum && item.display_addendum_number ? ` (${t("dashboard.contract.addendumNumber", { number: item.display_addendum_number })})` : ""}
							</td>
							<td className={TD}>
								{item.is_addendum
									? <StatusTag color="processing">{t("dashboard.contract.addendum")}</StatusTag>
									: <StatusTag color="success">{t("dashboard.contract.baseContract")}</StatusTag>}
								{(item.rows || []).length > 1 && (
									<div className="flex flex-wrap gap-1 mt-1">
										{item.rows.map(row => (
											<span
												key={row.id}
												className="px-1.5 py-0.5 rounded-full bg-colorFillQuaternary border border-solid border-[var(--dash-border)] text-[10.5px] text-colorTextSecondary"
											>
												{row.attributes?.location || row.attributes?.company_type || `#${row.id}`}
											</span>
										))}
									</div>
								)}
							</td>
							<td className={`${TD} whitespace-nowrap`}>{dateText(item.end_date)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
