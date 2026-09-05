import type { SmsOperatorCode, SmsOperatorInvoice, SmsOperatorInvoiceMonthlyReport, SmsOperatorInvoicePayload } from "#src/features/performance/api/performances.api";
import type { ActionType, ProColumns, ProCoreActionType } from "@ant-design/pro-components";
import type { FocusEvent, KeyboardEvent } from "react";
import { BasicButton, BasicContent, BasicTable } from "#src/components";
import { createSmsOperatorInvoice, createSmsOperatorInvoiceMonthlyReport, deleteSmsOperatorInvoice, fetchSmsOperatorInvoiceMonthlyReportStatus, fetchSmsOperatorInvoices, updateSmsOperatorInvoice } from "#src/features/performance/api/performances.api";
import { TableActionEditIcon, TableActionTrashIcon } from "#src/icons";
import { BarChartOutlined, CheckCircleOutlined, ExclamationCircleOutlined, FileAddOutlined, FilePdfOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Form, InputNumber, Modal, Popconfirm, Select, Space, Spin, Table, Tag, Typography } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";

/* eslint-disable style/max-statements-per-line -- This page keeps closely related request state transitions together. */

const YEARS = Array.from({ length: 7 }, (_, i) => 1404 + i);
const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const OPS: Array<{ label: string, value: SmsOperatorCode }> = [{ label: "همراه اول (MCI)", value: "MCI" }, { label: "ایرانسل (IRANCELL)", value: "IRANCELL" }, { label: "رایتل (RIGHTEL)", value: "RIGHTEL" }];
const number = (v: number | null | undefined) => Number(v ?? 0).toLocaleString("fa-IR");
const name = (v: SmsOperatorCode) => OPS.find(x => x.value === v)?.label ?? v;
const yearOptions = YEARS.map(value => ({ label: String(value), value }));
const monthOptions = MONTHS.map((label, i) => ({ label, value: i + 1 }));

function invoiceStatus(invoice: { invoice_registered: boolean, message?: string }) {
	return invoice.invoice_registered
		? <Tag color="success" icon={<CheckCircleOutlined />}>ثبت شده</Tag>
		: <Tag color="warning" icon={<ExclamationCircleOutlined />}>{invoice.message ?? "ثبت نشده"}</Tag>;
}

function print(report: SmsOperatorInvoiceMonthlyReport, onError: (content: string) => void) {
	const title = `گزارش مقایسه‌ای ماهانه — ${MONTHS[report.sh_month - 1]} ${report.sh_year}`;
	const body = (report.rows ?? []).map(r => `<tr><td>${name(r.operator)}</td><td>${r.language === "FA" ? "فارسی" : "انگلیسی"}</td><td>${number(r.gateway_total)}</td><td>${number(r.manual_invoice.count)}</td><td>${number(r.manual_invoice.cost)}</td><td>${number(r.internal_system_total)}</td><td>${number(r.internal_system_cost)}</td></tr>`).join("");
	const win = window.open("", "_blank"); if (!win) { onError("باز شدن پنجره PDF مسدود شده است."); return; }
	win.document.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Tahoma;padding:28px}table{border-collapse:collapse;width:100%;margin-top:24px}th,td{border:1px solid #aaa;padding:8px;text-align:center}th{background:#eee}</style></head><body><h2>${title}</h2><table><tr><th>اپراتور</th><th>زبان</th><th>Gateway</th><th>تعداد فاکتور</th><th>هزینه فاکتور</th><th>تعداد سیستم داخلی</th><th>هزینه سیستم داخلی</th></tr>${body}</table></body></html>`); win.document.close(); win.print();
}

export function SmsGatewayOperatorInvoicesPage() {
	const [form] = Form.useForm<SmsOperatorInvoicePayload>(); const [reportForm] = Form.useForm<{ sh_year?: number, sh_month?: number }>(); const client = useQueryClient();
	const invoices = useQuery({ queryKey: ["sms-gateway", "operator-invoices"], queryFn: fetchSmsOperatorInvoices });
	const invoicesTableActionRef = useRef<ActionType>(null);
	const [saving, setSaving] = useState(false); const [loadingReport, setLoadingReport] = useState(false); const [report, setReport] = useState<SmsOperatorInvoiceMonthlyReport>();
	const [editing, setEditing] = useState<SmsOperatorInvoice>(); const [editForm] = Form.useForm<SmsOperatorInvoicePayload>(); const [updating, setUpdating] = useState(false);
	const reportRequestId = useRef(0);
	const year = Form.useWatch("sh_year", form); const month = Form.useWatch("sh_month", form);
	const isReportProcessing = loadingReport && (!report || ["PENDING", "RUNNING"].includes(report.status));
	const showMessage = (type: "error" | "success" | "warning", content: string) => window.$message?.[type](content);
	const selectNumberInput = (event: FocusEvent<HTMLInputElement>) => event.currentTarget.select();
	const preventNonNumericInput = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.ctrlKey || event.metaKey || ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End"].includes(event.key))
			return;
		if (!/^\d$/.test(event.key))
			event.preventDefault();
	};
	const availableMonths = useMemo(() => !year ? monthOptions : monthOptions.filter(({ value }) => new Set((invoices.data ?? []).filter(x => x.sh_year === year && x.sh_month === value).map(x => x.operator)).size < OPS.length), [invoices.data, year]);
	const activeOps = useMemo(() => !year || !month ? [] : OPS.filter(op => !(invoices.data ?? []).some(x => x.sh_year === year && x.sh_month === month && x.operator === op.value)), [invoices.data, month, year]);
	const createReport = async (values: { sh_year?: number, sh_month?: number }) => {
		if (!values.sh_year || !values.sh_month) { showMessage("warning", "لطفاً سال و ماه را انتخاب کنید."); return; } const requestId = ++reportRequestId.current; setLoadingReport(true); setReport(undefined); try {
			const next = await createSmsOperatorInvoiceMonthlyReport(values.sh_year, values.sh_month); if (requestId === reportRequestId.current)
				setReport(next);
		}
		catch { if (requestId === reportRequestId.current) { setLoadingReport(false); showMessage("error", "دریافت گزارش ناموفق بود."); } }
	};
	useEffect(() => {
		if (!report?.job_id || !["PENDING", "RUNNING"].includes(report.status))
			return;

		const requestId = reportRequestId.current; const timer = window.setTimeout(async () => {
			try {
				const next = await fetchSmsOperatorInvoiceMonthlyReportStatus(report.job_id); if (requestId === reportRequestId.current)
					setReport(next);
			}
			catch { if (requestId === reportRequestId.current) { setLoadingReport(false); showMessage("error", "دریافت وضعیت گزارش ناموفق بود."); } }
		}, 900); return () => window.clearTimeout(timer);
	}, [report]);
	useEffect(() => {
		if (year && month)
			form.setFieldValue("operator", undefined);
	}, [month, year]);
	const save = async (values: SmsOperatorInvoicePayload) => {
		setSaving(true); try { const payload = { ...values, fa_count: Number(values.fa_count), en_count: Number(values.en_count), fa_cost: Number(values.fa_cost), en_cost: Number(values.en_cost) }; await createSmsOperatorInvoice(payload); window.$message?.success("فاکتور ارسالی اپراتور با موفقیت ثبت شد."); form.resetFields(); await client.invalidateQueries({ queryKey: ["sms-gateway", "operator-invoices"] }); await invoicesTableActionRef.current?.reload?.(); }
		catch (e) { const response = (e as { response?: Response }).response; showMessage("error", response ? `ثبت فاکتور ناموفق بود (کد ${response.status}).` : "ارتباط با سرور برقرار نشد."); }
		finally { setSaving(false); }
	};
	const remove = async (item: SmsOperatorInvoice, action?: ProCoreActionType<object>) => {
		try { await deleteSmsOperatorInvoice(item.id); showMessage("success", "فاکتور حذف شد."); await client.invalidateQueries({ queryKey: ["sms-gateway", "operator-invoices"] }); await action?.reload?.(); }
		catch { showMessage("error", "حذف فاکتور ناموفق بود."); }
	};
	const openEdit = (item: SmsOperatorInvoice) => { setEditing(item); editForm.setFieldsValue(item); };
	const update = async (values: SmsOperatorInvoicePayload) => {
		if (!editing)
			return; setUpdating(true); try { await updateSmsOperatorInvoice(editing.id, { ...values, fa_count: Number(values.fa_count), en_count: Number(values.en_count), fa_cost: Number(values.fa_cost), en_cost: Number(values.en_cost) }); showMessage("success", "فاکتور ویرایش شد."); setEditing(undefined); await client.invalidateQueries({ queryKey: ["sms-gateway", "operator-invoices"] }); await invoicesTableActionRef.current?.reload?.(); }
		catch { showMessage("error", "ویرایش فاکتور ناموفق بود."); }
		finally { setUpdating(false); }
	};
	const invoiceColumns: ProColumns<SmsOperatorInvoice>[] = [
		{ title: "اپراتور", dataIndex: "operator", valueType: "select", valueEnum: Object.fromEntries(OPS.map(({ label, value }) => [value, { text: label }])), render: (_, item) => <Tag color="blue">{name(item.operator)}</Tag> },
		{ title: "سال", dataIndex: "sh_year", align: "center", valueType: "select", valueEnum: Object.fromEntries(yearOptions.map(({ label, value }) => [value, { text: label }])), render: (_, item) => String(item.sh_year) },
		{ title: "ماه", dataIndex: "sh_month", align: "center", valueType: "select", valueEnum: Object.fromEntries(monthOptions.map(({ label, value }) => [value, { text: label }])), render: (_, item) => MONTHS[item.sh_month - 1] },
		{ title: "تعداد فارسی", dataIndex: "fa_count", search: false, render: (_, item) => number(item.fa_count) },
		{ title: "تعداد انگلیسی", dataIndex: "en_count", search: false, render: (_, item) => number(item.en_count) },
		{ title: "هزینه فارسی (ریال)", dataIndex: "fa_cost", search: false, render: (_, item) => <Typography.Text type="success">{number(item.fa_cost)}</Typography.Text> },
		{ title: "هزینه انگلیسی (ریال)", dataIndex: "en_cost", search: false, render: (_, item) => <Typography.Text type="success">{number(item.en_cost)}</Typography.Text> },
		{
			title: "عملیات",
			valueType: "option",
			key: "actions",
			width: 120,
			fixed: "right",
			align: "center",
			render: (_, item, __, action) => [
				<BasicButton key="edit" type="link" size="large" title="ویرایش فاکتور" icon={<TableActionEditIcon />} onClick={() => openEdit(item)} />,
				<Popconfirm key="delete" title="فاکتور حذف شود؟" okText="حذف" cancelText="انصراف" onConfirm={() => remove(item, action)}>
					<BasicButton type="link" size="large" title="حذف فاکتور" icon={<TableActionTrashIcon />} />
				</Popconfirm>,
			],
		},
	];
	return (
		<BasicContent className="h-full overflow-y-auto">
			<Space direction="vertical" size={16} className="w-full">
				<div>
					<Typography.Title level={4} className="!mb-1">فاکتور ارسالی اپراتورهای پیامک</Typography.Title>
					<Typography.Text type="secondary">ثبت و مشاهده تعداد و هزینه پیامک‌های ارسالی هر اپراتور</Typography.Text>
				</div>
				<Card title={(
					<Space>
						<FileAddOutlined />
						ثبت فاکتور ارسالی اپراتور جدید
					</Space>
				)}
				>
					<Form form={form} layout="vertical" onFinish={save} initialValues={{ fa_cost: 0, en_cost: 0 }}>
						<div className="grid grid-cols-1 gap-x-4 md:grid-cols-3">
							<Form.Item name="sh_year" label="سال (شمسی)" rules={[{ required: true }]}><Select options={yearOptions} placeholder="انتخاب کنید" /></Form.Item>
							<Form.Item name="sh_month" label="ماه (شمسی)" rules={[{ required: true }]}><Select options={availableMonths} placeholder={!year ? "ابتدا سال را انتخاب کنید" : "انتخاب کنید"} disabled={!year} /></Form.Item>
							<Form.Item name="operator" label="اپراتور" rules={[{ required: true }]}><Select options={activeOps} disabled={!year || !month} placeholder={!year || !month ? "ابتدا سال و ماه را انتخاب کنید" : "انتخاب کنید"} /></Form.Item>
						</div>
						<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
							<Card size="small" title="تعداد پیامک">
								<div className="grid grid-cols-2 gap-4">
									<Form.Item name="fa_count" label="فارسی" rules={[{ required: true, validator: (_, value) => value == null || value === "" ? Promise.reject(new Error("تعداد پیامک فارسی الزامی است.")) : Promise.resolve() }]}><InputNumber min={0} precision={0} placeholder="0" className="w-full" onFocus={selectNumberInput} onKeyDown={preventNonNumericInput} /></Form.Item>
									<Form.Item name="en_count" label="انگلیسی" rules={[{ required: true, validator: (_, value) => value == null || value === "" ? Promise.reject(new Error("تعداد پیامک انگلیسی الزامی است.")) : Promise.resolve() }]}><InputNumber min={0} precision={0} placeholder="0" className="w-full" onFocus={selectNumberInput} onKeyDown={preventNonNumericInput} /></Form.Item>
								</div>
							</Card>
							<Card size="small" title="هزینه پیامک (ریال)">
								<div className="grid grid-cols-2 gap-4">
									<Form.Item name="fa_cost" label="فارسی"><InputNumber min={0} precision={0} className="w-full" onFocus={selectNumberInput} onKeyDown={preventNonNumericInput} /></Form.Item>
									<Form.Item name="en_cost" label="انگلیسی"><InputNumber min={0} precision={0} className="w-full" onFocus={selectNumberInput} onKeyDown={preventNonNumericInput} /></Form.Item>
								</div>
							</Card>
						</div>
						<div className="mt-2 flex justify-end"><Button type="primary" htmlType="submit" loading={saving} disabled={activeOps.length === 0}>ثبت فاکتور</Button></div>
					</Form>
				</Card>
				<BasicTable<SmsOperatorInvoice>
					rowKey="id"
					columns={invoiceColumns}
					actionRef={invoicesTableActionRef}
					filterTitle="جستجوی فاکتورهای ارسالی اپراتور"
					filterSubtitle="برای مشاهده فاکتورهای هر اپراتور، سال و ماه را انتخاب کنید."
					tableTitle="لیست فاکتورهای ارسالی اپراتور"
					tableSubtitle="فاکتورهای ثبت‌شده را مشاهده، ویرایش یا حذف کنید."
					request={async (params) => {
						const responseData = await fetchSmsOperatorInvoices();
						const shYear = Number(params.sh_year) || undefined;
						const shMonth = Number(params.sh_month) || undefined;
						const operator = params.operator as SmsOperatorCode | undefined;
						const data = responseData.filter(item =>
							(!shYear || item.sh_year === shYear)
							&& (!shMonth || item.sh_month === shMonth)
							&& (!operator || item.operator === operator),
						);
						const current = Number(params.current) || 1;
						const pageSize = Number(params.pageSize) || 10;

						return {
							data: data.slice((current - 1) * pageSize, current * pageSize),
							total: data.length,
							success: true,
						};
					}}
				/>
				<Card title={(
					<Space>
						<BarChartOutlined />
						گزارش مقایسه‌ای ماهانه
					</Space>
				)}
				>
					<Form form={reportForm} layout="vertical" onFinish={createReport}>
						<div className="grid grid-cols-1 gap-x-4 md:grid-cols-3">
							<Form.Item name="sh_year" label="سال (شمسی)"><Select options={yearOptions} placeholder="انتخاب کنید" /></Form.Item>
							<Form.Item name="sh_month" label="ماه (شمسی)"><Select options={monthOptions} placeholder="انتخاب کنید" /></Form.Item>
							<div className="flex items-end gap-2 pb-6">
								<Button type="primary" icon={<BarChartOutlined />} htmlType="submit" loading={isReportProcessing}>نمایش گزارش</Button>
								<Button icon={<FilePdfOutlined />} disabled={report?.status !== "SUCCESS"} onClick={() => report && print(report, content => showMessage("error", content))}>دانلود PDF</Button>
							</div>
						</div>
					</Form>
					{isReportProcessing && (
						<div className="py-4 text-center">
							<Spin />
							<div className="mt-2">گزارش در حال آماده‌سازی است…</div>
						</div>
					)}
					{report?.status === "FAILURE" && <Alert type="error" showIcon message="تهیه گزارش ناموفق بود." />}
					{report?.status === "SUCCESS" && (
						<>
							<Typography.Text className="mb-3 block">
								دوره گزارش:
								{MONTHS[report.sh_month - 1]}
								{" "}
								سال
								{report.sh_year}
							</Typography.Text>
							<div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
								{(report.operator_totals ?? []).map((item) => {
									const difference = Number(item.manual_invoice.count ?? 0) - Number(item.internal_system.total ?? 0);
									const diffClass = difference === 0 ? "text-green-500" : difference > 0 ? "text-yellow-500" : "text-red-400";

									return (
										<Card
											key={item.operator}
											size="small"
											title={(
												<div className="flex items-center justify-between">
													<b>{name(item.operator)}</b>
													{invoiceStatus(item.manual_invoice)}
												</div>
											)}
										>
											<div className="grid grid-cols-3 pb-2 text-center text-xs text-secondary">
												<span />
												<span>تعداد</span>
												<span>هزینه (ریال)</span>
											</div>
											<div className="text-sm">
												<div className="grid grid-cols-3 border-t border-[var(--ant-color-border-secondary)] py-2">
													<span>فاکتور ارسالی اپراتور</span>
													<b className="text-center">{number(item.manual_invoice.count)}</b>
													<b className="text-center">{number(item.manual_invoice.cost)}</b>
												</div>
												<div className="grid grid-cols-3 border-t border-[var(--ant-color-border-secondary)] py-2">
													<span>سامانه نگاه</span>
													<b className="text-center">{number(item.internal_system.total)}</b>
													<b className="text-center">{number(item.internal_system.cost)}</b>
												</div>
												<div className="grid grid-cols-3 border-t border-[var(--ant-color-border-secondary)] py-2">
													<span>سامانه Gateway</span>
													<b className="text-center">{number(item.gateway_total)}</b>
													<span className="text-center">—</span>
												</div>
												<div className="grid grid-cols-3 border-t border-[var(--ant-color-border-secondary)] pt-2">
													<span>اختلاف فاکتور و نگاه</span>
													<b className={`text-center ${diffClass}`}>{number(difference)}</b>
													<span className="text-center">—</span>
												</div>
											</div>
										</Card>
									);
								})}
							</div>
							<Typography.Text strong className="mb-2 block">به تفکیک اپراتور و زبان</Typography.Text>
							<Table size="small" pagination={false} scroll={{ x: 1300 }} rowKey={r => `${r.operator}-${r.language}`} dataSource={report.rows ?? []} columns={[{ title: "اپراتور", dataIndex: "operator", render: name }, { title: "زبان", dataIndex: "language", render: v => v === "FA" ? "فارسی" : "انگلیسی" }, { title: "وضعیت فاکتور ارسالی اپراتور", dataIndex: "manual_invoice", render: invoiceStatus }, { title: "تعداد فاکتور ارسالی اپراتور", dataIndex: ["manual_invoice", "count"], render: number }, { title: "هزینه فاکتور ارسالی اپراتور (ریال)", dataIndex: ["manual_invoice", "cost"], render: number }, { title: "تعداد سامانه نگاه", dataIndex: "internal_system_total", render: number }, { title: "هزینه سامانه نگاه (ریال)", dataIndex: "internal_system_cost", render: number }, { title: "تعداد سامانه Gateway", dataIndex: "gateway_total", render: number }]} />
						</>
					)}
				</Card>
				<Modal title="ویرایش فاکتور ارسالی" open={Boolean(editing)} onCancel={() => setEditing(undefined)} onOk={() => editForm.submit()} okText="ذخیره" cancelText="انصراف" confirmLoading={updating}>
					<Form form={editForm} layout="vertical" onFinish={update}>
						<div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
							<Form.Item name="sh_year" label="سال" rules={[{ required: true }]}><Select options={yearOptions} /></Form.Item>
							<Form.Item name="sh_month" label="ماه" rules={[{ required: true }]}><Select options={monthOptions} /></Form.Item>
							<Form.Item name="operator" label="اپراتور" rules={[{ required: true }]}><Select options={OPS} /></Form.Item>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<Form.Item name="fa_count" label="تعداد فارسی"><InputNumber min={0} precision={0} className="w-full" onFocus={selectNumberInput} /></Form.Item>
							<Form.Item name="en_count" label="تعداد انگلیسی"><InputNumber min={0} precision={0} className="w-full" onFocus={selectNumberInput} /></Form.Item>
							<Form.Item name="fa_cost" label="هزینه فارسی (ریال)"><InputNumber min={0} precision={0} className="w-full" onFocus={selectNumberInput} /></Form.Item>
							<Form.Item name="en_cost" label="هزینه انگلیسی (ریال)"><InputNumber min={0} precision={0} className="w-full" onFocus={selectNumberInput} /></Form.Item>
						</div>
					</Form>
				</Modal>
			</Space>
		</BasicContent>
	);
}
