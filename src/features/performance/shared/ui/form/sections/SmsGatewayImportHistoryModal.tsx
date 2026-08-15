import type { SmsGatewayImportHistoryItem } from "#src/features/performance/api/performances.api";
import { fetchSmsGatewayImportHistory } from "#src/features/performance/api/performances.api";
import { notification } from "#src/utils";
import { CheckCircleOutlined, HistoryOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Empty, Modal, Spin, Tag } from "antd";
import { useEffect, useState } from "react";

interface Props { open: boolean, onClose: () => void }

const rows: Array<[string, string[]]> = [
	["رکوردهای جدید سرویس پیامک ثبت‌شده", ["imported_count", "sms_created", "created_sms", "sms_service_created"]],
	["رکوردهای سرویس پیامک به‌روزرسانی‌شده", ["updated_count", "sms_updated", "updated_sms", "sms_service_updated"]],
	["رکوردهای جدید سرویس پیامک عاملیت ثبت‌شده", ["commission_imported_count", "sms_commission_created", "commission_created", "agent_created"]],
	["رکوردهای سرویس پیامک عاملیت به‌روزرسانی‌شده", ["commission_updated_count", "sms_commission_updated", "commission_updated", "agent_updated"]],
	["رکوردهای ردشده", ["skipped_count", "rejected", "rejected_count", "failed"]],
];

function count(item: SmsGatewayImportHistoryItem, keys: string[]) {
	for (const key of keys) {
		const value = item[key] ?? item.summary?.[key];
		if (typeof value === "number")
			return value;
	}
	return 0;
}

function user(value: SmsGatewayImportHistoryItem["requested_by"]) {
	return typeof value === "string" ? value : value?.full_name ?? value?.name ?? value?.username ?? "-";
}

function date(value: unknown) {
	return typeof value === "string" ? value.replace("T", " ").replace(/\.\d+(Z|[+-]\d\d:\d\d)?$/, "") : "-";
}

export function SmsGatewayImportHistoryModal({ open, onClose }: Props) {
	const [items, setItems] = useState<SmsGatewayImportHistoryItem[]>([]);
	const [loading, setLoading] = useState(false);
	const load = async () => {
		setLoading(true);
		try {
			const response = await fetchSmsGatewayImportHistory();
			const result = response.jobs ?? [];
			setItems(result.filter(item => item.confirmed !== false && !["pending", "running", "failed"].includes(String(item.status).toLowerCase())));
		}
		catch {
			setItems([]);
			notification.error({
				message: "خطا در دریافت تاریخچه Gateway پیامک",
				description: "لطفاً دوباره تلاش کنید.",
				placement: "topRight",
			});
		}
		finally { setLoading(false); }
	};
	useEffect(() => {
		if (open)
			void load();
	}, [open]);

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
					<span>وضعیت importهای نهایی‌شده</span>
					<Button type="text" icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>به‌روزرسانی</Button>
				</div>
				{loading
					? <div className="flex min-h-[280px] items-center justify-center"><Spin /></div>
					: items.length === 0
						? <Empty className="mt-20" description="دریافت نهایی‌شده‌ای وجود ندارد" />
						: (
							<div className="space-y-3 max-h-[min(560px,calc(100vh-280px))] overflow-y-auto pl-1 sms-gateway-import-scrollbar">
								{items.map((item, index) => (
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
											<Tag color="success" icon={<CheckCircleOutlined />}>موفق</Tag>
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
										<div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
											{rows.map(([label, keys]) => (
												<div key={label} className="sms-gateway-history-summary-row flex justify-between rounded-lg px-3 py-2 ">
													<span>{label}</span>
													<b>{new Intl.NumberFormat("fa-IR").format(count(item, keys))}</b>
												</div>
											))}
										</div>
									</div>
								))}
							</div>
						)}
			</div>
		</Modal>
	);
}
