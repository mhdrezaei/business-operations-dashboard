import type { SmsOperatorCode, SmsOperatorInvoice, SmsOperatorInvoiceMonthlyReport, SmsOperatorInvoicePayload } from "#src/features/performance/api/performances.api";
import type { ActionType, ColumnsState, ProColumns, ProCoreActionType } from "@ant-design/pro-components";
import type { TFunction } from "i18next";
import type { FocusEvent, KeyboardEvent } from "react";
import { BasicButton, BasicContent, BasicTable } from "#src/components";
import { createSmsOperatorInvoice, createSmsOperatorInvoiceMonthlyReport, deleteSmsOperatorInvoice, fetchLatestSmsOperatorInvoiceMonthlyReport, fetchSmsOperatorInvoiceMonthlyReportStatus, updateSmsOperatorInvoice } from "#src/features/performance/api/performances.api";
import { formatInvoiceDifference, formatNullableNumber, getDifferenceTextType, getInvoiceDifference, getInvoiceYears, getNextFreeOperator, getTakenOperators, isMonthFullyInvoiced, OPERATOR_INVOICE_CODES, sortOperatorInvoices, toOperatorOptions, trafficOperatorLabel } from "#src/features/performance/report/model/sms-gateway-report";
import { getRequestErrorMessage } from "#src/features/performance/report/queries/sms-gateway-request-error";
import { smsOperatorInvoicesQuery, smsOperatorInvoicesQueryKey } from "#src/features/performance/report/queries/sms-gateway.queries";
import { TableActionEditIcon, TableActionTrashIcon } from "#src/icons";
import { dayjs } from "#src/shared/lib/dayjs-jalali";
import { SectionCard } from "#src/shared/ui/section-card";
import { BarChartOutlined, CheckCircleOutlined, ExclamationCircleOutlined, FilePdfOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Form, InputNumber, Modal, Popconfirm, Select, Space, Spin, Tag, Typography } from "antd";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { openSmsOperatorInvoicesPdfPrint } from "./operator-invoices-pdf";
import "#src/shared/ui/form-layout/styles.css";
import "./sms-gateway-operator-invoices.css";

/* eslint-disable style/max-statements-per-line -- This page keeps closely related request state transitions together. */

const YEARS = getInvoiceYears(dayjs().year());
const number = (v: number | null | undefined) => Number(v ?? 0).toLocaleString("fa-IR");
const nullableNumber = (v: number | null | undefined) => formatNullableNumber(v, number);
const yearOptions = YEARS.map(value => ({ label: String(value), value }));
type SmsOperatorInvoiceMonthlyTotal = NonNullable<SmsOperatorInvoiceMonthlyReport["operator_totals"]>[number];
type SmsOperatorInvoiceMonthlyRow = NonNullable<SmsOperatorInvoiceMonthlyReport["rows"]>[number];

function InvoiceDifference({ difference }: { difference: number | null }) {
	return difference == null
		? <>—</>
		: <Typography.Text type={getDifferenceTextType(difference)}>{formatInvoiceDifference(difference, number)}</Typography.Text>;
}

function invoiceStatus(invoice: { invoice_registered: boolean, message?: string }, t: TFunction) {
	return invoice.invoice_registered
		? <Tag color="success" icon={<CheckCircleOutlined />}>{t("performance.smsGatewayPages.shared.registered")}</Tag>
		: <Tag color="warning" icon={<ExclamationCircleOutlined />}>{invoice.message ?? t("performance.smsGatewayPages.shared.notRegistered")}</Tag>;
}

export function SmsGatewayOperatorInvoicesPage() {
	const { t } = useTranslation();
	const months = Array.from({ length: 12 }, (_, i) => t(`performance.months.${i + 1}`));
	const monthOptions = months.map((label, i) => ({ label, value: i + 1 }));
	const OPS = toOperatorOptions(t, OPERATOR_INVOICE_CODES);
	const name = (v: SmsOperatorCode) => trafficOperatorLabel(t, v);
	const [form] = Form.useForm<SmsOperatorInvoicePayload>(); const [reportForm] = Form.useForm<{ sh_year?: number, sh_month?: number }>(); const client = useQueryClient();
	const invoices = useQuery(smsOperatorInvoicesQuery());
	const invoicesTableActionRef = useRef<ActionType>(null);
	const [saving, setSaving] = useState(false); const [loadingReport, setLoadingReport] = useState(true); const [report, setReport] = useState<SmsOperatorInvoiceMonthlyReport>();
	const [editing, setEditing] = useState<SmsOperatorInvoice>(); const [editForm] = Form.useForm<SmsOperatorInvoicePayload>(); const [updating, setUpdating] = useState(false);
	const [summaryColumnsState, setSummaryColumnsState] = useState<Record<string, ColumnsState>>({});
	const [detailColumnsState, setDetailColumnsState] = useState<Record<string, ColumnsState>>({});
	const reportRequestId = useRef(0);
	const year = Form.useWatch("sh_year", form); const month = Form.useWatch("sh_month", form);
	const editYear = Form.useWatch("sh_year", editForm); const editMonth = Form.useWatch("sh_month", editForm);
	const isReportProcessing = loadingReport && (!report || ["PENDING", "RUNNING"].includes(report.status));
	const showMessage = (type: "error" | "success" | "warning", content: string) => window.$message?.[type](content);
	const selectNumberInput = (event: FocusEvent<HTMLInputElement>) => event.currentTarget.select();
	const preventNonNumericInput = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.ctrlKey || event.metaKey || ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End"].includes(event.key))
			return;
		if (!/^\d$/.test(event.key))
			event.preventDefault();
	};
	const invoiceList = invoices.data ?? [];
	const getAvailableMonths = (selectedYear?: number, excludeId?: number) => !selectedYear ? monthOptions : monthOptions.filter(({ value }) => !isMonthFullyInvoiced(invoiceList, selectedYear, value, excludeId));
	const getAvailableOperators = (selectedYear?: number, selectedMonth?: number, excludeId?: number) => {
		const taken = getTakenOperators(invoiceList, selectedYear, selectedMonth, excludeId);
		return !selectedYear || !selectedMonth ? [] : OPS.filter(op => !taken.has(op.value));
	};
	const activeOps = getAvailableOperators(year, month);
	const refreshInvoices = async () => {
		await client.invalidateQueries({ queryKey: smsOperatorInvoicesQueryKey });
		await invoicesTableActionRef.current?.reload?.();
	};
	const createReport = async (values: { sh_year?: number, sh_month?: number }) => {
		if (!values.sh_year || !values.sh_month) { showMessage("warning", t("performance.smsGatewayPages.invoices.messages.selectYearMonth")); return; } const requestId = ++reportRequestId.current; setLoadingReport(true); setReport(undefined); try {
			const next = await createSmsOperatorInvoiceMonthlyReport(values.sh_year, values.sh_month); if (requestId === reportRequestId.current)
				setReport(next);
		}
		catch { if (requestId === reportRequestId.current) { setLoadingReport(false); showMessage("error", t("performance.smsGatewayPages.invoices.messages.reportFailed")); } }
	};
	useEffect(() => {
		const requestId = ++reportRequestId.current;
		void fetchLatestSmsOperatorInvoiceMonthlyReport()
			.then((next) => {
				if (requestId === reportRequestId.current)
					setReport(next);
			})
			.catch(() => {
				if (requestId === reportRequestId.current)
					setLoadingReport(false);
			});
	}, []);
	useEffect(() => {
		if (!report?.job_id || !["PENDING", "RUNNING"].includes(report.status))
			return;

		const requestId = reportRequestId.current; const timer = window.setTimeout(async () => {
			try {
				const next = await fetchSmsOperatorInvoiceMonthlyReportStatus(report.job_id); if (requestId === reportRequestId.current)
					setReport(next);
			}
			catch { if (requestId === reportRequestId.current) { setLoadingReport(false); showMessage("error", t("performance.smsGatewayPages.invoices.messages.reportStatusFailed")); } }
		}, 900); return () => window.clearTimeout(timer);
	}, [report]);
	useEffect(() => {
		if (year && month)
			form.setFieldValue("operator", undefined);
	}, [month, year]);
	const normalizeCounts = (values: SmsOperatorInvoicePayload) => ({ ...values, fa_count: Number(values.fa_count), en_count: Number(values.en_count), fa_cost: Number(values.fa_cost), en_cost: Number(values.en_cost) });
	const save = async (values: SmsOperatorInvoicePayload) => {
		setSaving(true);
		try {
			await createSmsOperatorInvoice(normalizeCounts(values));
			window.$message?.success(t("performance.smsGatewayPages.invoices.messages.created"));
			// Keep the period and suggest the next free operator; clear the period once all operators are invoiced.
			const taken = getTakenOperators(invoiceList, values.sh_year, values.sh_month).add(values.operator);
			const nextOperator = getNextFreeOperator(taken);
			if (nextOperator) {
				form.resetFields(["fa_count", "en_count", "fa_cost", "en_cost"]);
				form.setFieldValue("operator", nextOperator);
			}
			else {
				form.resetFields();
			}
			await refreshInvoices();
		}
		catch (e) { showMessage("error", await getRequestErrorMessage(e, t("performance.smsGatewayReport.saveFailed"))); }
		finally { setSaving(false); }
	};
	const remove = async (item: SmsOperatorInvoice, action?: ProCoreActionType<object>) => {
		try { await deleteSmsOperatorInvoice(item.id); showMessage("success", t("performance.smsGatewayPages.invoices.messages.deleted")); await client.invalidateQueries({ queryKey: smsOperatorInvoicesQueryKey }); await action?.reload?.(); }
		catch (e) { showMessage("error", await getRequestErrorMessage(e, t("performance.smsGatewayPages.invoices.messages.deleteFailed"))); }
	};
	const openEdit = (item: SmsOperatorInvoice) => { setEditing(item); editForm.setFieldsValue(item); };
	const update = async (values: SmsOperatorInvoicePayload) => {
		if (!editing)
			return;
		setUpdating(true);
		try { await updateSmsOperatorInvoice(editing.id, normalizeCounts(values)); showMessage("success", t("performance.smsGatewayPages.invoices.messages.updated")); setEditing(undefined); await refreshInvoices(); }
		catch (e) { showMessage("error", await getRequestErrorMessage(e, t("performance.smsGatewayReport.updateFailed"))); }
		finally { setUpdating(false); }
	};
	const invoiceColumns: ProColumns<SmsOperatorInvoice>[] = [
		{ title: t("performance.columns.operator"), dataIndex: "operator", sorter: true, valueType: "select", valueEnum: Object.fromEntries(OPS.map(({ label, value }) => [value, { text: label }])), render: (_, item) => <Tag color="blue">{name(item.operator)}</Tag> },
		{ title: t("performance.columns.year"), dataIndex: "sh_year", sorter: true, align: "center", valueType: "select", valueEnum: Object.fromEntries(yearOptions.map(({ label, value }) => [value, { text: label }])), render: (_, item) => String(item.sh_year) },
		{ title: t("performance.columns.month"), dataIndex: "sh_month", sorter: true, align: "center", valueType: "select", valueEnum: Object.fromEntries(monthOptions.map(({ label, value }) => [value, { text: label }])), render: (_, item) => months[item.sh_month - 1] },
		{ title: t("performance.smsGatewayPages.invoices.faCountColumn"), dataIndex: "fa_count", search: false, render: (_, item) => number(item.fa_count) },
		{ title: t("performance.smsGatewayPages.invoices.enCountColumn"), dataIndex: "en_count", search: false, render: (_, item) => number(item.en_count) },
		{ title: t("performance.smsGatewayPages.invoices.faCostColumn"), dataIndex: "fa_cost", search: false, render: (_, item) => <Typography.Text type="success">{number(item.fa_cost)}</Typography.Text> },
		{ title: t("performance.smsGatewayPages.invoices.enCostColumn"), dataIndex: "en_cost", search: false, render: (_, item) => <Typography.Text type="success">{number(item.en_cost)}</Typography.Text> },
		{
			title: t("common.action"),
			valueType: "option",
			key: "actions",
			width: 120,
			fixed: "right",
			align: "center",
			render: (_, item, __, action) => [
				<BasicButton key="edit" type="link" size="large" title={t("performance.smsGatewayPages.invoices.editInvoice")} icon={<TableActionEditIcon />} onClick={() => openEdit(item)} />,
				<Popconfirm key="delete" title={t("performance.smsGatewayPages.invoices.confirmDelete")} okText={t("common.delete")} cancelText={t("common.cancel")} onConfirm={() => remove(item, action)}>
					<BasicButton type="link" size="large" title={t("performance.smsGatewayPages.invoices.deleteInvoice")} icon={<TableActionTrashIcon />} />
				</Popconfirm>,
			],
		},
	];
	return (
		<BasicContent className="h-full overflow-y-auto">
			<Space direction="vertical" size={16} className="w-full">
				<div>
					<Typography.Title level={4} className="!mb-1">{t("performance.smsGatewayPages.invoices.pageTitle")}</Typography.Title>
					<Typography.Text type="secondary">{t("performance.smsGatewayPages.invoices.pageSubtitle")}</Typography.Text>
				</div>
				<SectionCard
					title={t("performance.smsGatewayPages.invoices.createTitle")}
					tone="primary"
					className="sms-gateway-invoice-entry"
				>
					<Form form={form} layout="vertical" onFinish={save} initialValues={{ fa_cost: 0, en_cost: 0 }}>
						<div className="aligned-form-grid aligned-form-grid--three sms-gateway-invoice-entry__filters">
							<Form.Item name="sh_year" label={t("performance.smsGatewayPages.invoices.yearShamsi")} rules={[{ required: true }]}><Select options={yearOptions} placeholder={t("performance.placeholders.select")} /></Form.Item>
							<Form.Item name="sh_month" label={t("performance.smsGatewayPages.invoices.monthShamsi")} rules={[{ required: true }]}><Select options={getAvailableMonths(year)} placeholder={!year ? t("performance.placeholders.selectYearFirst") : t("performance.placeholders.select")} disabled={!year} /></Form.Item>
							<Form.Item name="operator" label={t("performance.columns.operator")} rules={[{ required: true }]}><Select options={activeOps} disabled={!year || !month} placeholder={!year || !month ? t("performance.smsGatewayPages.invoices.selectYearAndMonthFirst") : t("performance.placeholders.select")} /></Form.Item>
						</div>
						<div className="sms-gateway-invoice-entry__metrics">
							<SectionCard title={t("performance.smsGatewayPages.invoices.smsCount")} tone="blue" className="sms-gateway-invoice-entry__metric">
								<div className="sms-gateway-invoice-entry__metric-fields">
									<Form.Item name="fa_count" label={t("performance.language.fa")} rules={[{ required: true, validator: (_, value) => value == null || value === "" ? Promise.reject(new Error(t("performance.smsGatewayPages.invoices.faCountRequired"))) : Promise.resolve() }]}><InputNumber min={0} precision={0} placeholder="0" className="w-full" onFocus={selectNumberInput} onKeyDown={preventNonNumericInput} /></Form.Item>
									<Form.Item name="en_count" label={t("performance.language.en")} rules={[{ required: true, validator: (_, value) => value == null || value === "" ? Promise.reject(new Error(t("performance.smsGatewayPages.invoices.enCountRequired"))) : Promise.resolve() }]}><InputNumber min={0} precision={0} placeholder="0" className="w-full" onFocus={selectNumberInput} onKeyDown={preventNonNumericInput} /></Form.Item>
								</div>
							</SectionCard>
							<SectionCard title={t("performance.smsGatewayPages.invoices.smsCost")} tone="purple" className="sms-gateway-invoice-entry__metric">
								<div className="sms-gateway-invoice-entry__metric-fields">
									<Form.Item name="fa_cost" label={t("performance.language.fa")}><InputNumber min={0} precision={0} className="w-full" onFocus={selectNumberInput} onKeyDown={preventNonNumericInput} /></Form.Item>
									<Form.Item name="en_cost" label={t("performance.language.en")}><InputNumber min={0} precision={0} className="w-full" onFocus={selectNumberInput} onKeyDown={preventNonNumericInput} /></Form.Item>
								</div>
							</SectionCard>
						</div>
						<div className="mt-2 flex justify-end"><Button type="primary" htmlType="submit" loading={saving} disabled={activeOps.length === 0}>{t("performance.smsGatewayPages.invoices.submit")}</Button></div>
					</Form>
				</SectionCard>
				<BasicTable<SmsOperatorInvoice>
					rowKey="id"
					columns={invoiceColumns}
					actionRef={invoicesTableActionRef}
					search={{ defaultCollapsed: false }}
					tableTitle={t("performance.smsGatewayPages.invoices.listTitle")}
					tableSubtitle={t("performance.smsGatewayPages.invoices.listSubtitle")}
					request={async (params, sort) => {
						const responseData = sortOperatorInvoices(await client.fetchQuery(smsOperatorInvoicesQuery()), sort);
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
				<SectionCard
					title={t("performance.smsGatewayPages.invoices.reportTitle")}
					tone="primary"
					className="sms-gateway-invoice-report"
				>
					<Form form={reportForm} layout="vertical" onFinish={createReport}>
						<div className="grid grid-cols-1 gap-x-4 md:grid-cols-3">
							<Form.Item name="sh_year" label={t("performance.smsGatewayPages.invoices.yearShamsi")}><Select options={yearOptions} placeholder={t("performance.placeholders.select")} /></Form.Item>
							<Form.Item name="sh_month" label={t("performance.smsGatewayPages.invoices.monthShamsi")}><Select options={monthOptions} placeholder={t("performance.placeholders.select")} /></Form.Item>
							<div className="flex items-end gap-2 pb-6">
								<Button type="primary" icon={<BarChartOutlined />} htmlType="submit" loading={isReportProcessing}>{t("performance.smsGatewayPages.invoices.showReport")}</Button>
								<Button
									icon={<FilePdfOutlined />}
									disabled={report?.status !== "SUCCESS"}
									onClick={() => {
										if (!report)
											return;
										try {
											openSmsOperatorInvoicesPdfPrint({ report, monthLabel: months[report.sh_month - 1], t, operatorName: name, formatNumber: number, summaryColumnsState, detailColumnsState });
										}
										catch (error) {
											showMessage("error", error instanceof Error && error.message === "POPUP_BLOCKED" ? t("performance.smsGatewayPages.invoices.messages.popupBlocked") : t("performance.smsGatewayPages.invoices.messages.pdfFailed"));
										}
									}}
								>
									{t("performance.smsGatewayPages.invoices.downloadPdf")}
								</Button>
							</div>
						</div>
					</Form>
					{isReportProcessing && (
						<div className="py-4 text-center">
							<Spin />
							<div className="mt-2">{t("performance.smsGatewayPages.shared.preparing")}</div>
						</div>
					)}
					{report?.status === "FAILED" && <Alert type="error" showIcon message={report.error || t("performance.smsGatewayReport.jobFailed")} />}
					{report?.status === "SUCCESS" && (
						<>
							<Typography.Text className="mb-3 block">
								{t("performance.smsGatewayPages.invoices.reportPeriod", { month: months[report.sh_month - 1], year: report.sh_year })}
							</Typography.Text>
							<BasicTable<SmsOperatorInvoiceMonthlyTotal>
								rowKey="operator"
								search={false}
								showFilterHeading={false}
								pagination={false}
								tableTitle={t("performance.smsGatewayPages.invoices.summaryTableTitle")}
								tableSubtitle={t("performance.smsGatewayPages.invoices.reportPeriod", { month: months[report.sh_month - 1], year: report.sh_year })}
								columnsState={{ value: summaryColumnsState, onChange: setSummaryColumnsState }}
								dataSource={report.operator_totals ?? []}
								columns={[
									{ title: t("performance.columns.operator"), dataIndex: "operator", render: (_, item) => <Tag color="blue">{name(item.operator)}</Tag> },
									{ title: t("performance.smsGatewayPages.invoices.columns.invoiceStatus"), dataIndex: "manual_invoice", render: (_, item) => invoiceStatus(item.manual_invoice, t) },
									{ title: t("performance.smsGatewayPages.invoices.columns.invoiceCount"), key: "manual_invoice_count", dataIndex: ["manual_invoice", "count"], render: (_, item) => nullableNumber(item.manual_invoice.count) },
									{ title: t("performance.smsGatewayPages.invoices.columns.invoiceCost"), key: "manual_invoice_cost", dataIndex: ["manual_invoice", "cost"], render: (_, item) => nullableNumber(item.manual_invoice.cost) },
									{ title: t("performance.smsGatewayPages.invoices.columns.internalCount"), key: "internal_system_total", dataIndex: ["internal_system", "total"], render: (_, item) => number(item.internal_system.total) },
									{ title: t("performance.smsGatewayPages.invoices.columns.internalCost"), key: "internal_system_cost", dataIndex: ["internal_system", "cost"], render: (_, item) => number(item.internal_system.cost) },
									{ title: t("performance.smsGatewayPages.invoices.columns.gatewayCount"), dataIndex: "gateway_total", render: (_, item) => number(item.gateway_total) },
									{ title: t("performance.smsGatewayPages.invoices.columns.countDiff"), key: "difference", render: (_, item) => <InvoiceDifference difference={getInvoiceDifference(item.manual_invoice.count, item.internal_system.total)} /> },
									{ title: t("performance.smsGatewayPages.invoices.columns.costDiff"), key: "cost_difference", render: (_, item) => <InvoiceDifference difference={getInvoiceDifference(item.manual_invoice.cost, item.internal_system.cost)} /> },
								]}
							/>
							<BasicTable<SmsOperatorInvoiceMonthlyRow>
								rowKey={item => `${item.operator}-${item.language}`}
								search={false}
								showFilterHeading={false}
								pagination={false}
								tableTitle={t("performance.smsGatewayPages.invoices.detailTableTitle")}
								tableSubtitle={t("performance.smsGatewayPages.invoices.detailTableSubtitle")}
								columnsState={{ value: detailColumnsState, onChange: setDetailColumnsState }}
								dataSource={report.rows ?? []}
								columns={[
									{ title: t("performance.columns.operator"), dataIndex: "operator", render: (_, item) => name(item.operator) },
									{ title: t("performance.columns.language"), dataIndex: "language", render: (_, item) => t(item.language === "FA" ? "performance.language.fa" : "performance.language.en") },
									{ title: t("performance.smsGatewayPages.invoices.columns.detailInvoiceStatus"), dataIndex: "manual_invoice", render: (_, item) => invoiceStatus(item.manual_invoice, t) },
									{ title: t("performance.smsGatewayPages.invoices.columns.detailInvoiceCount"), key: "manual_invoice_count", dataIndex: ["manual_invoice", "count"], render: (_, item) => nullableNumber(item.manual_invoice.count) },
									{ title: t("performance.smsGatewayPages.invoices.columns.detailInvoiceCost"), key: "manual_invoice_cost", dataIndex: ["manual_invoice", "cost"], render: (_, item) => nullableNumber(item.manual_invoice.cost) },
									{ title: t("performance.smsGatewayPages.invoices.columns.internalCount"), dataIndex: "internal_system_total", render: (_, item) => number(item.internal_system_total) },
									{ title: t("performance.smsGatewayPages.invoices.columns.internalCost"), dataIndex: "internal_system_cost", render: (_, item) => number(item.internal_system_cost) },
									{ title: t("performance.smsGatewayPages.invoices.columns.detailGatewayCount"), dataIndex: "gateway_total", render: (_, item) => number(item.gateway_total) },
								]}
							/>
						</>
					)}
				</SectionCard>
				<Modal title={t("performance.smsGatewayPages.invoices.editModalTitle")} open={Boolean(editing)} onCancel={() => setEditing(undefined)} onOk={() => editForm.submit()} okText={t("performance.smsGatewayPages.shared.save")} cancelText={t("common.cancel")} confirmLoading={updating}>
					<Form form={editForm} layout="vertical" onFinish={update}>
						<div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
							<Form.Item name="sh_year" label={t("performance.columns.year")} rules={[{ required: true }]}><Select options={yearOptions} /></Form.Item>
							<Form.Item name="sh_month" label={t("performance.columns.month")} rules={[{ required: true }]}><Select options={getAvailableMonths(editYear, editing?.id)} /></Form.Item>
							<Form.Item name="operator" label={t("performance.columns.operator")} dependencies={["sh_year", "sh_month"]} rules={[{ required: true }, { validator: (_, value) => value && getTakenOperators(invoiceList, editYear, editMonth, editing?.id).has(value) ? Promise.reject(new Error(t("performance.smsGatewayReport.duplicateInvoice"))) : Promise.resolve() }]}><Select options={OPS.filter(op => !getTakenOperators(invoiceList, editYear, editMonth, editing?.id).has(op.value))} /></Form.Item>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<Form.Item name="fa_count" label={t("performance.smsGatewayPages.invoices.faCountColumn")}><InputNumber min={0} precision={0} className="w-full" onFocus={selectNumberInput} /></Form.Item>
							<Form.Item name="en_count" label={t("performance.smsGatewayPages.invoices.enCountColumn")}><InputNumber min={0} precision={0} className="w-full" onFocus={selectNumberInput} /></Form.Item>
							<Form.Item name="fa_cost" label={t("performance.smsGatewayPages.invoices.faCostColumn")}><InputNumber min={0} precision={0} className="w-full" onFocus={selectNumberInput} /></Form.Item>
							<Form.Item name="en_cost" label={t("performance.smsGatewayPages.invoices.enCostColumn")}><InputNumber min={0} precision={0} className="w-full" onFocus={selectNumberInput} /></Form.Item>
						</div>
					</Form>
				</Modal>
			</Space>
		</BasicContent>
	);
}
