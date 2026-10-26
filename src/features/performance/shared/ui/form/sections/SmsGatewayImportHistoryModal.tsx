import type { SmsGatewayImportHistoryItem } from "#src/features/performance/api/performances.api";
import type { ReactNode } from "react";
import { fetchSmsGatewayImportHistory } from "#src/features/performance/api/performances.api";
import { notification } from "#src/utils";
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, HistoryOutlined, ReloadOutlined, SyncOutlined } from "@ant-design/icons";
import { Button, Empty, Modal, Spin, Tag } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SMS_GATEWAY_SUMMARY_KEYS } from "./SmsGatewayImportModal";

interface Props { open: boolean, onClose: () => void }

const POLL_INTERVAL_MS = 2500;
const JOB_STATUS_META: Record<string, { color: string, icon: ReactNode }> = {
	PENDING: { color: "default", icon: <ClockCircleOutlined /> },
	RUNNING: { color: "processing", icon: <SyncOutlined spin /> },
	SUCCESS: { color: "success", icon: <CheckCircleOutlined /> },
	FAILED: { color: "error", icon: <CloseCircleOutlined /> },
};

function isBusy(item: SmsGatewayImportHistoryItem) {
	return item.status === "PENDING" || item.status === "RUNNING";
}

function user(value: SmsGatewayImportHistoryItem["requested_by"]) {
	return typeof value === "string" ? value : value?.full_name ?? value?.name ?? value?.username ?? "-";
}

function date(value: unknown) {
	return typeof value === "string" ? value.replace("T", " ").replace(/\.\d+(Z|[+-]\d\d:\d\d)?$/, "") : "-";
}

export function SmsGatewayImportHistoryModal({ open, onClose }: Props) {
	const { t } = useTranslation();
	const [items, setItems] = useState<SmsGatewayImportHistoryItem[]>([]);
	const [loading, setLoading] = useState(false);
	const load = async (silent = false) => {
		if (!silent)
			setLoading(true);
		try {
			const response = await fetchSmsGatewayImportHistory();
			setItems(response.jobs ?? []);
		}
		catch {
			if (!silent) {
				setItems([]);
				notification.error({
					message: "خطا در دریافت تاریخچه Gateway پیامک",
					description: "لطفاً دوباره تلاش کنید.",
					placement: "topRight",
				});
			}
		}
		finally { setLoading(false); }
	};
	useEffect(() => {
		if (open)
			void load();
	}, [open]);
	useEffect(() => {
		if (!open || !items.some(isBusy))
			return;
		const timer = setTimeout(() => void load(true), POLL_INTERVAL_MS);
		return () => clearTimeout(timer);
	}, [open, items]);

	return (
		<Modal
			open={open}
			onCancel={onClose}
			footer={null}
			width="min(840px, calc(100vw - 32px))"
			className="sms-gateway-history-modal"
			title={(
				<span>
					<HistoryOutlined />
					{" "}
					تاریخچه دریافت‌های Gateway پیامک
				</span>
			)}
			destroyOnClose
		>
			<div className="sms-gateway-history-body min-h-[360px]" dir="rtl">
				<div className="mb-4 flex items-center justify-between gap-3 text-sm text-slate-500">
					<span>وضعیت importهای اخیر</span>
					<Button type="text" icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>به‌روزرسانی</Button>
				</div>
				{loading
					? <div className="flex min-h-[280px] items-center justify-center"><Spin /></div>
					: items.length === 0
						? <Empty className="mt-20" description="هیچ دریافتی ثبت نشده است." />
						: (
							<div className="space-y-3 max-h-[min(560px,calc(100vh-280px))] overflow-y-auto pl-1 sms-gateway-import-scrollbar">
								{items.map((item, index) => {
									const statusMeta = JOB_STATUS_META[String(item.status)] ?? { color: "default", icon: <ClockCircleOutlined /> };
									return (
										<div key={String(item.job_id ?? item.id ?? index)} className="sms-gateway-history-card rounded-xl p-4">
											<div className="mb-3 flex items-start justify-between gap-3">
												<div>
													<b>
														{item.sh_year ?? "-"}
														/
														{String(item.sh_month ?? "-").padStart(2, "0")}
													</b>
													<div className="mt-1 text-xs text-slate-500">
														درخواست‌دهنده:
														{item.requested_by_username ?? user(item.requested_by)}
													</div>
												</div>
												<Tag color={statusMeta.color} icon={statusMeta.icon}>{t(`performance.smsGatewayImport.jobStatus.${item.status}`, { defaultValue: String(item.status) })}</Tag>
											</div>
											<div className="mb-3 grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-2">
												<span>
													شروع:
													{date(item.started_at ?? item.created_at)}
												</span>
												<span>
													پایان:
													{date(item.finished_at)}
												</span>
											</div>
											{item.status === "SUCCESS" && item.summary
												? (
													<div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
														{SMS_GATEWAY_SUMMARY_KEYS.filter(key => item.summary?.[key] != null).map(key => (
															<div key={key} className="sms-gateway-history-summary-row flex justify-between rounded-lg px-3 py-2 ">
																<span>{t(`performance.smsGatewayImport.summary.${key}`)}</span>
																<b>{new Intl.NumberFormat("fa-IR").format(item.summary?.[key] ?? 0)}</b>
															</div>
														))}
													</div>
												)
												: null}
											{item.status === "FAILED" && item.error
												? <Tag className="whitespace-normal" color="error">{item.error}</Tag>
												: null}
										</div>
									);
								})}
							</div>
						)}
			</div>
		</Modal>
	);
}
