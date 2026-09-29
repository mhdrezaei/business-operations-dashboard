import type { SmsGatewayTrafficReportFilters, SmsGatewayTrafficReportResult } from "#src/features/performance/api/performances.api";
import type { Dayjs } from "#src/shared/lib/dayjs-jalali";
import type { ReactNode } from "react";
import { fetchCompaniesByService, fetchServices } from "#src/api/common/common.api";
import { BasicContent } from "#src/components";
import { createSmsGatewayTrafficReport, fetchSmsGatewayTrafficReport, fetchSmsGatewayTrafficReportStatus } from "#src/features/performance/api/performances.api";
import { DashedBorder } from "#src/shared/ui/dashed-border";
import { BarChartOutlined, DownOutlined, UpOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Collapse, Descriptions, Empty, Select, Space, Spin, Statistic, Tag, Typography } from "antd";
import { DatePicker } from "antd-jalali";
import moment from "moment-jalaali";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./sms-gateway-traffic-report.css";
import "#src/shared/ui/form-layout/styles.css";

const OPERATORS = [
	{ label: "همراه اول (MCI)", value: "MCI" },
	{ label: "ایرانسل (MTN)", value: "MTN" },
	{ label: "رایتل (RTL)", value: "RTL" },
	{ label: "رایتل (RIGHTEL)", value: "RIGHTEL" },
	{ label: "اپراتورهای ناشناخته", value: "UNKNOWN_OPERATOR" },
];
const STATUSES = ["DELIVRD", "Pending", "EXPIRED", "REJECTD", "UNDELIV", "FAILED"];
const ALLOWED_COMPANY_NAMES = [
	"فرهنگ و توسعه کندو",
	"test sms",
	"پیک آسا",
	"شرکت شبکه گستران آریا سامانه (نواتل)",
	"منطقه تهران",
];
const number = (value?: number | null) => Number(value ?? 0).toLocaleString("fa-IR");
const statusColor = (status: string) => status === "DELIVRD" || status === "SUCCESSFUL" ? "success" : status === "Pending" ? "warning" : "error";

function operatorLabel(operator: string) {
	return ({
		MCI: "همراه اول (MCI)",
		MTN: "ایرانسل (MTN)",
		RIGHTEL: "رایتل (RIGHTEL)",
		RTL: "رایتل (RTL)",
		UNKNOWN_OPERATOR: "اپراتورهای ناشناخته",
	} as Record<string, string>)[operator] ?? operator;
}

function formatJalaliDate(value: { toDate?: () => Date } | null) {
	if (!value?.toDate)
		return undefined;
	return moment(value.toDate()).format("jYYYY/jMM/jDD");
}

function ReportSection({ title, children, className, defaultExpanded = true }: { title: string, children: ReactNode, className?: string, defaultExpanded?: boolean }) {
	const [expanded, setExpanded] = useState(defaultExpanded);

	return (
		<Card
			className={`sms-gateway-traffic-report__section ${!expanded ? "sms-gateway-traffic-report__section--collapsed" : ""} ${className ?? ""}`}
			title={<Tag bordered={false} className="sms-gateway-traffic-report__section-tag">{title}</Tag>}
			extra={(
				<Button
					className="sms-gateway-traffic-report__section-toggle"
					type="text"
					aria-label={expanded ? `بستن ${title}` : `باز کردن ${title}`}
					icon={expanded ? <UpOutlined /> : <DownOutlined />}
					onClick={() => setExpanded(current => !current)}
				/>
			)}
		>
			{expanded ? children : null}
		</Card>
	);
}

async function getRequestErrorMessage(error: unknown) {
	const response = (error as { response?: Response })?.response;
	if (!response) {
		const message = error instanceof Error ? error.message.trim() : "";
		return message || "ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.";
	}

	try {
		const body = await response.clone().json() as Record<string, unknown>;
		const detail = body.detail ?? body.message ?? body.error;
		if (typeof detail === "string" && detail.trim())
			return detail;
		return Object.entries(body)
			.map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join("، ") : String(value)}`)
			.join(" | ") || `خطای سرور (${response.status})`;
	}
	catch {
		return `خطای سرور (${response.status})`;
	}
}

export function SmsGatewayTrafficReportPage() {
	const [filters, setFilters] = useState<Omit<SmsGatewayTrafficReportFilters, "start_date" | "end_date">>({});
	const [startDate, setStartDate] = useState<Dayjs | null>(null);
	const [endDate, setEndDate] = useState<Dayjs | null>(null);
	const [result, setResult] = useState<SmsGatewayTrafficReportResult | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const activeJobId = useRef<number | null>(null);
	const hasLoadedDefaultReport = useRef(false);
	const services = useQuery({ queryKey: ["common", "services"], queryFn: fetchServices });
	const smsServiceId = useMemo(() => services.data?.results?.find(item => String(item.code).toLowerCase() === "sms")?.id, [services.data]);
	const companies = useQuery({ queryKey: ["common", "companies", "sms-gateway", smsServiceId], enabled: !!smsServiceId, queryFn: () => fetchCompaniesByService(Number(smsServiceId), { pageSize: 1000 }) });
	const companyOptions = useMemo(() => (companies.data?.results ?? [])
		.filter(company => ALLOWED_COMPANY_NAMES.includes(String(company.name).trim().toLowerCase() === "test sms" ? "test sms" : String(company.name).trim()))
		.map(company => ({ label: company.name, value: company.id })), [companies.data]);

	useEffect(() => {
		if (!result?.job_id || !["PENDING", "RUNNING"].includes(result.status))
			return;
		const jobId = result.job_id;
		const timer = window.setTimeout(async () => {
			try {
				const next = await fetchSmsGatewayTrafficReportStatus(jobId);
				if (activeJobId.current === jobId)
					setResult(next);
			}
			catch (caught) { setError(await getRequestErrorMessage(caught)); }
		}, 1200);
		return () => window.clearTimeout(timer);
	}, [result?.job_id, result?.status]);

	const requestReport = useCallback(async (payload: SmsGatewayTrafficReportFilters) => {
		activeJobId.current = null;
		setLoading(true);
		setError(null);
		setResult(null);
		try {
			const next = await createSmsGatewayTrafficReport(payload);
			activeJobId.current = next.job_id;
			setResult(next);
		}
		catch (caught) { setError(await getRequestErrorMessage(caught)); }
		finally { setLoading(false); }
	}, []);
	const loadLatestReport = useCallback(async () => {
		activeJobId.current = null;
		setLoading(true);
		setError(null);
		setResult(null);
		try {
			setResult(await fetchSmsGatewayTrafficReport());
		}
		catch (caught) { setError(await getRequestErrorMessage(caught)); }
		finally { setLoading(false); }
	}, []);
	const apply = () => requestReport({
		...filters,
		start_date: formatJalaliDate(startDate),
		end_date: formatJalaliDate(endDate),
	});

	useEffect(() => {
		if (hasLoadedDefaultReport.current)
			return;
		hasLoadedDefaultReport.current = true;
		void loadLatestReport();
	}, [loadLatestReport]);
	const clear = () => {
		setFilters({});
		setStartDate(null);
		setEndDate(null);
		void loadLatestReport();
	};
	const isProcessing = result && ["PENDING", "RUNNING"].includes(result.status);

	return (
		<BasicContent className="h-full sms-gateway-traffic-report">
			<Space direction="vertical" size={16} className="w-full">
				<div>
					<Typography.Title level={4} className="!mb-1">گزارش ترافیک پیامک Gateway</Typography.Title>
					<Typography.Text type="secondary">گزارش ترافیک ارسال پیامک به تفکیک شرکت، اپراتور و وضعیت تحویل</Typography.Text>
				</div>
				<ReportSection className="sms-gateway-traffic-report__filter-card" title="فیلترها">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
						<div>
							<Typography.Text className="mb-2 block">از تاریخ</Typography.Text>
							<DatePicker value={startDate} className="w-full" format="YYYY/MM/DD" placeholder="انتخاب تاریخ" onChange={setStartDate} />
						</div>
						<div>
							<Typography.Text className="mb-2 block">تا تاریخ</Typography.Text>
							<DatePicker value={endDate} className="w-full" format="YYYY/MM/DD" placeholder="انتخاب تاریخ" onChange={setEndDate} />
						</div>
						<div>
							<Typography.Text className="mb-2 block">شرکت</Typography.Text>
							<Select mode="multiple" allowClear showSearch optionFilterProp="label" className="w-full" placeholder="همه شرکت‌های مجاز" loading={companies.isLoading} value={filters.company_ids} options={companyOptions} onChange={company_ids => setFilters(x => ({ ...x, company_ids }))} />
						</div>
						<div>
							<Typography.Text className="mb-2 block">اپراتور</Typography.Text>
							<Select mode="multiple" allowClear className="w-full" placeholder="همه اپراتورها" value={filters.operators} options={OPERATORS} onChange={operators => setFilters(x => ({ ...x, operators }))} />
						</div>
						<div>
							<Typography.Text className="mb-2 block">وضعیت تحویل</Typography.Text>
							<Select mode="multiple" allowClear className="w-full" placeholder="همه وضعیت‌ها" value={filters.delivery_statuses} options={STATUSES.map(value => ({ label: value, value }))} onChange={delivery_statuses => setFilters(x => ({ ...x, delivery_statuses }))} />
						</div>
					</div>
					<Space className="sms-gateway-traffic-report__actions mt-5">
						<Button type="primary" loading={loading || !!isProcessing} onClick={apply}>اعمال فیلتر</Button>
						<Button onClick={clear}>پاکسازی فیلترها</Button>
					</Space>
				</ReportSection>
				{error && <Alert type="error" showIcon message={error} />}
				{isProcessing && (
					<Card>
						<div className="flex items-center justify-center gap-3 py-8">
							<Spin />
							<Typography.Text>گزارش در حال آماده‌سازی است…</Typography.Text>
						</div>
					</Card>
				)}
				{result?.status === "FAILURE" && <Alert type="error" showIcon message="تهیه گزارش ناموفق بود." />}
				{result?.status === "SUCCESS" && (
					<>
						<ReportSection className="sms-gateway-traffic-report__summary-card" title="خلاصه گزارش">
							<div className="sms-gateway-traffic-report__summary-fields">
								<DashedBorder />
								<Descriptions column={{ xs: 1, md: 3 }}>
									<Descriptions.Item label="مجموع کل"><Statistic value={result.grand_total ?? 0} formatter={v => number(Number(v))} /></Descriptions.Item>
									<Descriptions.Item label="تعداد شرکت‌ها">{number(result.count)}</Descriptions.Item>
									<Descriptions.Item label="وضعیت">
										{" "}
										<Tag color="success">آماده</Tag>
									</Descriptions.Item>
								</Descriptions>
							</div>
							<div className="sms-gateway-traffic-report__breakdown-list mt-4">
								<div className="sms-gateway-traffic-report__breakdown-item">
									<DashedBorder />
									<div className="sms-gateway-traffic-report__breakdown-content">
										<div className="sms-gateway-traffic-report__breakdown-title">مجموع به تفکیک اپراتور</div>
										<Space wrap>
											{(result.operator_totals ?? []).map(x => (
												<Tag key={x.operator}>
													{x.operator}
													:
													{" "}
													{number(x.total)}
												</Tag>
											))}
										</Space>
									</div>
								</div>
								<div className="sms-gateway-traffic-report__breakdown-item">
									<DashedBorder />
									<div className="sms-gateway-traffic-report__breakdown-content">
										<div className="sms-gateway-traffic-report__breakdown-title">مجموع به تفکیک وضعیت تحویل</div>
										<Space wrap>
											{(result.status_totals ?? []).map(x => (
												<Tag color={statusColor(x.delivery_status)} key={x.delivery_status}>
													{x.delivery_status}
													:
													{" "}
													{number(x.total_count)}
												</Tag>
											))}
										</Space>
									</div>
								</div>
							</div>
						</ReportSection>
						<ReportSection className="sms-gateway-traffic-report__details-card" title="جزئیات شرکت‌ها">
							{(result.results ?? []).length === 0
								? <Empty description="داده‌ای برای نمایش وجود ندارد." />
								: (
									<Collapse
										className="sms-gateway-company-collapse"
										items={(result.results ?? []).map((item, index) => ({
											key: `${item.company_id}-${index}`,
											label: (
												<div className="flex w-full items-center justify-between gap-4">
													<div>
														<b className="block text-base">{item.company_name}</b>
														<Typography.Text type="secondary">
															Gateway:
															{item.gateway_customer_name}
														</Typography.Text>
													</div>
													<b className="text-base">{number(item.total)}</b>
												</div>
											),
											children: (
												<Collapse
													className="sms-gateway-operator-collapse"
													items={item.operators.map(operator => ({
														key: operator.operator,
														label: (
															<div className="flex w-full items-center justify-between gap-4">
																<span className="font-bold">
																	<BarChartOutlined className="ml-2 text-primary" />
																	{operatorLabel(operator.operator)}
																</span>
																<b>{number(operator.total)}</b>
															</div>
														),
														children: (
															<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
																{operator.statuses.map(status => (
																	<div className="sms-gateway-status-row" key={status.delivery_status}>
																		<Tag color={statusColor(status.delivery_status)}>{status.delivery_status}</Tag>
																		<b>{number(status.total_count)}</b>
																	</div>
																))}
															</div>
														),
													}))}
												/>
											),
										}))}
									/>
								)}
						</ReportSection>
					</>
				)}
				{!result && !loading && <Card><Empty description="برای مشاهده گزارش، فیلترها را انتخاب و اعمال کنید." /></Card>}
			</Space>
		</BasicContent>
	);
}
