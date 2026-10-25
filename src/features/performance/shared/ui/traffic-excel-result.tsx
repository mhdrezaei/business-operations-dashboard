import type { TrafficExcelImportResponse } from "#src/features/performance/api/performances.api";
import type { ReactNode } from "react";
import { InfoCircleOutlined } from "@ant-design/icons";
import { Button, theme } from "antd";
import { useTranslation } from "react-i18next";

const REJECTION_GRID_CLASS = "grid grid-cols-[140px_minmax(180px,1fr)_minmax(220px,1.2fr)] items-center gap-2.5 px-[18px] py-4";

export function UploadStatCard({
	label,
	value,
	danger,
}: {
	label: string
	value: number
	danger?: boolean
}) {
	const { token } = theme.useToken();
	return (
		<div className="flex items-center justify-between gap-4 rounded-[14px] border border-solid px-4 py-3" style={{ borderColor: token.colorBorderSecondary }}>
			<span className="opacity-[0.88]">{label}</span>
			<strong style={danger ? { color: token.colorError } : undefined}>{value.toLocaleString("fa-IR")}</strong>
		</div>
	);
}

function UploadRejectedRow({
	item,
	index,
}: {
	item: TrafficExcelImportResponse["rejected_items"][number]
	index: number
}) {
	const { token } = theme.useToken();
	return (
		<div
			className={index === 0 ? REJECTION_GRID_CLASS : `${REJECTION_GRID_CLASS} border-t border-solid`}
			style={index === 0 ? undefined : { borderColor: token.colorSplit }}
		>
			<div>{item.row_no}</div>
			<div>{item.company_name || "-"}</div>
			<div style={{ color: token.colorError }}>{item.reason}</div>
		</div>
	);
}

interface TrafficExcelResultProps extends Pick<TrafficExcelImportResponse, "rejected_by_reason" | "rejected_items"> {
	/** The `UploadStatCard`s summarising the import (create and edit report different counters). */
	children: ReactNode
	onConfirm: () => void
}

export function TrafficExcelResult({ rejected_by_reason, rejected_items, onConfirm, children }: TrafficExcelResultProps) {
	const { t } = useTranslation();
	const { token } = theme.useToken();
	const rejectionReasons = Object.entries(rejected_by_reason ?? {});
	const rowClass = "flex items-center justify-between gap-4 rounded-lg border border-solid px-4 py-3";

	return (
		<div className="grid gap-6">
			<div
				className="grid h-[72px] w-[72px] justify-self-center place-items-center rounded-full border-4 border-solid text-[34px]"
				style={{ borderColor: token.colorInfo, color: token.colorInfo }}
			>
				<InfoCircleOutlined />
			</div>
			<div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2">{children}</div>
			<div className="grid gap-2.5">
				<div className="font-bold">{t("performance.traffic.editTemplate.rejectionReasons")}</div>
				<div className="grid gap-2">
					{rejectionReasons.length > 0
						? rejectionReasons.map(([reason, count]) => (
							<div key={reason} className={rowClass} style={{ borderColor: token.colorSplit }}>
								<span>{reason}</span>
								<strong>{count.toLocaleString("fa-IR")}</strong>
							</div>
						))
						: <div className={rowClass} style={{ borderColor: token.colorSplit }}>{t("performance.traffic.editTemplate.noReasons")}</div>}
				</div>
			</div>
			<div className="grid gap-2.5">
				<div className="font-bold">{t("performance.traffic.editTemplate.rejectedRows")}</div>
				<div className="overflow-x-auto rounded-lg border border-solid" style={{ borderColor: token.colorSplit }}>
					<div className="min-w-[620px]">
						<div className={`${REJECTION_GRID_CLASS} font-bold`} style={{ background: token.colorFillSecondary }}>
							<div>{t("performance.traffic.editTemplate.row")}</div>
							<div>{t("performance.columns.company")}</div>
							<div>{t("performance.traffic.editTemplate.reason")}</div>
						</div>
						{rejected_items.length > 0
							? rejected_items.map((item, index) => (
								// eslint-disable-next-line react/no-array-index-key
								<UploadRejectedRow key={`${item.row_no}-${index}`} item={item} index={index} />
							))
							: <div className="p-[18px] opacity-80">{t("performance.traffic.editTemplate.noRejectedRows")}</div>}
					</div>
				</div>
			</div>
			<div className="flex justify-end">
				<Button type="primary" onClick={onConfirm}>{t("common.confirm")}</Button>
			</div>
		</div>
	);
}
