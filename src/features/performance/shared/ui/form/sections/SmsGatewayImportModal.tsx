import type { SmsGatewayImportOperator, SmsGatewayManualImportResponse } from "#src/features/performance/api/performances.api";
import { importSmsGatewayPerformance } from "#src/features/performance/api/performances.api";
import { CheckCircleOutlined, EyeOutlined, ReloadOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Checkbox, Empty, Modal, Select, Spin, Tag } from "antd";
import { useState } from "react";

const YEAR_OPTIONS = Array.from({ length: 10 }, (_, index) => {
	const year = 1404 + index;
	return { value: year, label: String(year) };
});
const MONTH_OPTIONS = [
	{ value: 1, label: "فروردین" },
	{ value: 2, label: "اردیبهشت" },
	{ value: 3, label: "خرداد" },
	{ value: 4, label: "تیر" },
	{ value: 5, label: "مرداد" },
	{ value: 6, label: "شهریور" },
	{ value: 7, label: "مهر" },
	{ value: 8, label: "آبان" },
	{ value: 9, label: "آذر" },
	{ value: 10, label: "دی" },
	{ value: 11, label: "بهمن" },
	{ value: 12, label: "اسفند" },
];
const MIN_IMPORT_YEAR = 1404;
const MIN_IMPORT_MONTH = 10;
const STATUS_META: Record<string, { label: string, color: string }> = {
	will_create: { label: "ایجاد می‌شود", color: "green" },
	will_update: { label: "به‌روز می‌شود", color: "blue" },
	no_contract: { label: "قرارداد ندارد", color: "orange" },
	unmapped: { label: "مپ نشده", color: "red" },
};

function formatNumber(value: number) {
	return new Intl.NumberFormat("fa-IR").format(value ?? 0);
}

function operatorLabel(item: SmsGatewayImportOperator) {
	const operator = item.operator === "MCI" ? "همراه اول" : item.operator === "IRANCELL" ? "ایرانسل" : "سایر";
	return `${operator} / ${item.language === "FA" ? "فارسی" : "انگلیسی"}`;
}

function getCount(response: Record<string, unknown>, keys: string[], fallback = 0) {
	const summary = response.summary && typeof response.summary === "object" ? response.summary as Record<string, unknown> : {};
	for (const key of keys) {
		const value = response[key] ?? summary[key];
		if (typeof value === "number")
			return value;
	}
	return fallback;
}

interface Props {
	open: boolean
	onClose: () => void
}

export function SmsGatewayImportModal({ open, onClose }: Props) {
	const [year, setYear] = useState<number | null>(null);
	const [month, setMonth] = useState<number | null>(null);
	const [preview, setPreview] = useState<SmsGatewayManualImportResponse | null>(null);
	const [selected, setSelected] = useState<number[]>([]);
	const [loading, setLoading] = useState(false);
	const [confirming, setConfirming] = useState(false);
	const [successSummary, setSuccessSummary] = useState<Record<string, unknown> | null>(null);
	const monthOptions = year === MIN_IMPORT_YEAR
		? MONTH_OPTIONS.filter(item => item.value >= MIN_IMPORT_MONTH)
		: MONTH_OPTIONS;

	const close = () => {
		setPreview(null);
		setSelected([]);
		setSuccessSummary(null);
		onClose();
	};

	const loadPreview = async () => {
		if (!year || !month)
			return;
		setLoading(true);
		try {
			const response = await importSmsGatewayPerformance(year, month, false);
			setPreview(response);
			setSelected([]);
		}
		finally {
			setLoading(false);
		}
	};

	const confirm = async () => {
		if (!year || !month || selected.length === 0)
			return;
		setConfirming(true);
		try {
			const response = await importSmsGatewayPerformance(year, month, true);
			setSuccessSummary(response as unknown as Record<string, unknown>);
		}
		finally {
			setConfirming(false);
		}
	};

	const toggleItem = (index: number) => {
		setSelected(current => current.includes(index)
			? current.filter(value => value !== index)
			: [...current, index]);
	};

	const handleYearChange = (value: number) => {
		setYear(value);
		setMonth(null);
		setPreview(null);
	};

	const handleMonthChange = (value: number) => {
		setMonth(value);
		setPreview(null);
	};

	const successRows = successSummary
		? [
			["رکوردهای جدید سرویس پیامک ثبت‌شده", getCount(successSummary, ["sms_created", "created_sms", "sms_service_created"], preview?.summary.will_create ?? 0)],
			["رکوردهای سرویس پیامک به‌روزرسانی‌شده", getCount(successSummary, ["sms_updated", "updated_sms", "sms_service_updated"], preview?.summary.will_update ?? 0)],
			["رکوردهای جدید سرویس پیامک عاملیت ثبت‌شده", getCount(successSummary, ["sms_commission_created", "commission_created", "agent_created"])],
			["رکوردهای سرویس پیامک عاملیت به‌روزرسانی‌شده", getCount(successSummary, ["sms_commission_updated", "commission_updated", "agent_updated"])],
			["رکوردهای ردشده", getCount(successSummary, ["rejected", "rejected_count", "failed"])],
		]
		: [];

	return (
		<>
			<Modal
				open={open}
				onCancel={close}
				footer={null}
				width="min(1040px, calc(100vw - 32px))"
				className="sms-gateway-import-modal"
				styles={{ body: { maxHeight: "calc(100vh - 150px)", overflowY: "auto", overflowX: "hidden" } }}
				destroyOnClose
				title={(
					<span>
						<UploadOutlined />
						{" "}
						ثبت عملکرد از Gateway پیامک
					</span>
				)}
			>
				<div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-5 min-h-[460px]" dir="rtl">
					<div className="border-l-0 lg:border-l border-solid border-slate-200 pl-0 lg:pl-5 space-y-3">
						<div className="font-medium">انتخاب دوره</div>
						<label className="block text-sm">سال شمسی</label>
						<Select className="w-full" value={year} options={YEAR_OPTIONS} placeholder="انتخاب سال" onChange={handleYearChange} />
						<label className="block text-sm">ماه شمسی</label>
						<Select className="w-full" value={month} options={monthOptions} placeholder="ابتدا سال را انتخاب کنید" disabled={!year} onChange={handleMonthChange} />
						<Button className="w-full" type="primary" icon={preview ? <ReloadOutlined /> : <EyeOutlined />} disabled={!year || !month} loading={loading} onClick={loadPreview}>
							{preview ? "به‌روزرسانی پیش‌نمایش" : "پیش‌نمایش"}
						</Button>
						{preview
							? (
								<div className="flex flex-wrap gap-1 pt-2">
									{Object.entries(preview.summary).map(([status, count]) => (
										<Tag key={status} color={STATUS_META[status]?.color}>
											{STATUS_META[status]?.label}
											:
											{" "}
											{formatNumber(count)}
										</Tag>
									))}
								</div>
							)
							: null}
						<Button className="w-full mt-auto" type="primary" icon={<UploadOutlined />} disabled={selected.length === 0} loading={confirming} onClick={confirm}>تأیید و ثبت</Button>
					</div>
					<div className="sms-gateway-import-scrollbar max-h-[min(620px,calc(100vh-260px))] overflow-y-auto pl-1">
						{loading
							? <div className="h-full min-h-[360px] flex justify-center items-center"><Spin /></div>
							: !preview
								? <Empty className="mt-28" image={<EyeOutlined className="text-4xl text-slate-400" />} description="سال و ماه را انتخاب کنید، سپس پیش‌نمایش را دریافت کنید" />
								: (
									<>
										<div className="font-medium mb-3">
											نتیجه پیش‌نمایش
											<span className="text-sm font-normal text-slate-500">
												(
												{formatNumber(preview.items.length)}
												{" "}
												مورد)
											</span>
										</div>
										<div className="space-y-3">
											{preview.items.map((item, index) => {
												const selectable = item.status === "will_create" || item.status === "will_update";
												const meta = STATUS_META[item.status] ?? { label: item.status, color: "default" };
												return (
													<div
														key={`${item.gateway_customer_name}-${item.company_id ?? "unmapped"}`}
														className={`rounded-lg border border-solid p-3 bg-slate-50/70 dark:bg-slate-800/40 ${selected.includes(index) ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200 dark:border-slate-700"} ${selectable ? "cursor-pointer hover:border-blue-400" : ""}`}
														onClick={selectable ? () => toggleItem(index) : undefined}
													>
														<div className="flex items-start justify-between gap-3 mb-2">
															<div>
																<b>{item.company_name ?? item.gateway_customer_name}</b>
																{item.company_name
																	? (
																		<span className="text-xs text-slate-500 mr-2">
																			Gateway:
																			{item.gateway_customer_name}
																		</span>
																	)
																	: null}
															</div>
															<div className="flex gap-2 items-center">
																<Tag color={meta.color}>{meta.label}</Tag>
																{selectable
																	? (
																		<Checkbox
																			checked={selected.includes(index)}
																			onClick={event => event.stopPropagation()}
																			onChange={() => toggleItem(index)}
																		/>
																	)
																	: null}
															</div>
														</div>
														<div className="grid grid-cols-2 gap-1 text-xs">
															{item.operators.map(operator => (
																<div key={`${operator.operator}-${operator.language}`} className="flex justify-between rounded bg-slate-50 px-2 py-1">
																	<span>{operatorLabel(operator)}</span>
																	<b>{formatNumber(operator.value)}</b>
																</div>
															))}
														</div>
													</div>
												);
											})}
										</div>
									</>
								)}
					</div>
				</div>
			</Modal>
			<Modal open={!!successSummary} className="sms-gateway-success-modal" closable={false} footer={null} onCancel={close} width={460} centered>
				<div className="text-center py-5" dir="rtl">
					<CheckCircleOutlined className="sms-gateway-success-icon text-5xl" />
					<h3 className="mt-5 mb-1 text-lg font-bold">داده‌ها با موفقیت ثبت شدند</h3>
					<p className="mb-5 text-sm opacity-70">خلاصه عملیات ثبت:</p>
					<div className="space-y-2 text-right">
						{successRows.map(([label, count]) => (
							<div key={String(label)} className="sms-gateway-success-row flex items-center justify-between rounded-lg px-3 py-2 text-sm">
								<span>{label}</span>
								<b>{formatNumber(Number(count))}</b>
							</div>
						))}
					</div>
					<Button className="mt-5" type="primary" onClick={close}>باشه</Button>
				</div>
			</Modal>
		</>
	);
}
