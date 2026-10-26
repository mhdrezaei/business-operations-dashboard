import type { TrafficReportFormFilters } from "#src/features/performance/report/model/sms-gateway-report";
import type { Dayjs } from "#src/shared/lib/dayjs-jalali";
import type { ReactNode } from "react";
import { BasicContent } from "#src/components";
import { areTrafficFiltersEqual, buildTrafficReportPayload, toOperatorOptions, TRAFFIC_OPERATOR_CODES, TRAFFIC_PAGE_SIZE_OPTIONS, trafficOperatorLabel, trafficStatusColor } from "#src/features/performance/report/model/sms-gateway-report";
import { smsGatewayDeliveryStatusesQuery, smsGatewayMappedCompaniesQuery } from "#src/features/performance/report/queries/sms-gateway.queries";
import { useSmsGatewayTrafficReportJob } from "#src/features/performance/report/queries/use-sms-gateway-traffic-report-job";
import { DashedBorder } from "#src/shared/ui/dashed-border";
import { BarChartOutlined, DownOutlined, UpOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Collapse, Descriptions, Empty, Pagination, Select, Space, Spin, Statistic, Tag, Typography } from "antd";
import { DatePicker } from "antd-jalali";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import "./sms-gateway-traffic-report.css";
import "#src/shared/ui/form-layout/styles.css";

const number = (value?: number | null) => Number(value ?? 0).toLocaleString("fa-IR");

function ReportSection({ title, children, className, defaultExpanded = true }: { title: string, children: ReactNode, className?: string, defaultExpanded?: boolean }) {
	const { t } = useTranslation();
	const [expanded, setExpanded] = useState(defaultExpanded);

	return (
		<Card
			className={`sms-gateway-traffic-report__section ${!expanded ? "sms-gateway-traffic-report__section--collapsed" : ""} ${className ?? ""}`}
			title={<Tag bordered={false} className="sms-gateway-traffic-report__section-tag">{title}</Tag>}
			extra={(
				<Button
					className="sms-gateway-traffic-report__section-toggle"
					type="text"
					aria-label={expanded ? t("performance.smsGatewayPages.traffic.closeSection", { title }) : t("performance.smsGatewayPages.traffic.openSection", { title })}
					icon={expanded ? <UpOutlined /> : <DownOutlined />}
					onClick={() => setExpanded(current => !current)}
				/>
			)}
		>
			{expanded ? children : null}
		</Card>
	);
}

export function SmsGatewayTrafficReportPage() {
	const { t } = useTranslation();
	const [draft, setDraft] = useState<TrafficReportFormFilters>({ dateFrom: null, dateTo: null });
	const { state, isLocked, canSubmit, page, pageSize, submit, changePage } = useSmsGatewayTrafficReportJob();
	const companies = useQuery(smsGatewayMappedCompaniesQuery());
	const deliveryStatuses = useQuery(smsGatewayDeliveryStatusesQuery());
	const payload = buildTrafficReportPayload(draft);
	const filtersAreDirty = !areTrafficFiltersEqual(payload, state.submittedFilters);
	const isJobRunning = state.phase === "locked";
	const result = state.jobStatus === "SUCCESS" ? state.result : null;
	const updateDraft = (patch: Partial<TrafficReportFormFilters>) => setDraft(current => ({ ...current, ...patch }));
	const clear = () => setDraft({ dateFrom: null, dateTo: null });

	return (
		<BasicContent className="h-full sms-gateway-traffic-report">
			<Space direction="vertical" size={16} className="w-full">
				<div>
					<Typography.Title level={4} className="!mb-1">{t("performance.smsGatewayPages.traffic.title")}</Typography.Title>
					<Typography.Text type="secondary">{t("performance.smsGatewayPages.traffic.subtitle")}</Typography.Text>
				</div>
				<ReportSection className="sms-gateway-traffic-report__filter-card" title={t("performance.smsGatewayPages.traffic.filters")}>
					{isJobRunning && <Alert className="mb-4" type="warning" showIcon message={t("performance.smsGatewayReport.lockedNotice")} />}
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
						<div>
							<Typography.Text className="mb-2 block">{t("performance.smsGatewayPages.traffic.dateFrom")}</Typography.Text>
							<DatePicker value={draft.dateFrom} disabled={isLocked} className="w-full" format="YYYY/MM/DD" placeholder={t("performance.smsGatewayPages.traffic.pickDate")} onChange={(dateFrom: Dayjs | null) => updateDraft({ dateFrom })} />
						</div>
						<div>
							<Typography.Text className="mb-2 block">{t("performance.smsGatewayPages.traffic.dateTo")}</Typography.Text>
							<DatePicker value={draft.dateTo} disabled={isLocked} className="w-full" format="YYYY/MM/DD" placeholder={t("performance.smsGatewayPages.traffic.pickDate")} onChange={(dateTo: Dayjs | null) => updateDraft({ dateTo })} />
						</div>
						<div>
							<Typography.Text className="mb-2 block">{t("performance.smsGatewayPages.traffic.company")}</Typography.Text>
							<Select allowClear showSearch optionFilterProp="label" className="w-full" placeholder={t("performance.smsGatewayPages.traffic.allCompanies")} disabled={isLocked} loading={companies.isLoading} status={companies.isError ? "error" : undefined} value={draft.companyId} options={companies.data} onChange={companyId => updateDraft({ companyId })} />
							{companies.isError && <Typography.Text type="danger">{t("performance.smsGatewayReport.companiesLoadFailed")}</Typography.Text>}
						</div>
						<div>
							<Typography.Text className="mb-2 block">{t("performance.smsGatewayPages.traffic.operator")}</Typography.Text>
							<Select allowClear className="w-full" placeholder={t("performance.smsGatewayPages.traffic.allOperators")} disabled={isLocked} value={draft.operator} options={toOperatorOptions(t, TRAFFIC_OPERATOR_CODES)} onChange={operator => updateDraft({ operator })} />
						</div>
						<div>
							<Typography.Text className="mb-2 block">{t("performance.smsGatewayPages.traffic.deliveryStatus")}</Typography.Text>
							<Select allowClear className="w-full" placeholder={t("performance.smsGatewayPages.traffic.allStatuses")} disabled={isLocked} loading={deliveryStatuses.isLoading} value={draft.deliveryStatusId} options={deliveryStatuses.data} onChange={deliveryStatusId => updateDraft({ deliveryStatusId })} />
						</div>
					</div>
					<Space className="sms-gateway-traffic-report__actions mt-5">
						<Button type="primary" loading={state.submitting || isJobRunning} disabled={!canSubmit || !filtersAreDirty} onClick={() => void submit(payload)}>{t("performance.smsGatewayPages.traffic.apply")}</Button>
						<Button disabled={isLocked} onClick={clear}>{t("performance.smsGatewayPages.traffic.clear")}</Button>
					</Space>
				</ReportSection>
				{state.lastError && <Alert type="error" showIcon message={state.lastError} />}
				{isJobRunning && (
					<Card>
						<div className="flex items-center justify-center gap-3 py-8">
							<Spin />
							<Typography.Text>{t("performance.smsGatewayPages.shared.preparing")}</Typography.Text>
						</div>
					</Card>
				)}
				{result && (
					<>
						<ReportSection className="sms-gateway-traffic-report__summary-card" title={t("performance.smsGatewayPages.traffic.summary")}>
							<div className="sms-gateway-traffic-report__summary-fields">
								<DashedBorder />
								<Descriptions column={{ xs: 1, md: 3 }}>
									<Descriptions.Item label={t("performance.smsGatewayPages.traffic.grandTotal")}><Statistic value={result.grand_total ?? 0} formatter={v => number(Number(v))} /></Descriptions.Item>
									<Descriptions.Item label={t("performance.smsGatewayPages.traffic.companiesCount")}>{number(result.count)}</Descriptions.Item>
									<Descriptions.Item label={t("performance.smsGatewayPages.traffic.status")}>
										{" "}
										<Tag color="success">{t("performance.smsGatewayPages.traffic.ready")}</Tag>
									</Descriptions.Item>
								</Descriptions>
							</div>
							<div className="sms-gateway-traffic-report__breakdown-list mt-4">
								<div className="sms-gateway-traffic-report__breakdown-item">
									<DashedBorder />
									<div className="sms-gateway-traffic-report__breakdown-content">
										<div className="sms-gateway-traffic-report__breakdown-title">{t("performance.smsGatewayPages.traffic.totalByOperator")}</div>
										<Space wrap>
											{(result.operator_totals ?? []).map(x => (
												<Tag key={x.operator}>
													{trafficOperatorLabel(t, x.operator)}
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
										<div className="sms-gateway-traffic-report__breakdown-title">{t("performance.smsGatewayPages.traffic.totalByStatus")}</div>
										<Space wrap>
											{(result.status_totals ?? []).map(x => (
												<Tag color={trafficStatusColor(x.delivery_status)} key={x.delivery_status}>
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
						<ReportSection className="sms-gateway-traffic-report__details-card" title={t("performance.smsGatewayPages.traffic.companyDetails")}>
							{(result.results ?? []).length === 0
								? <Empty description={t("performance.smsGatewayPages.traffic.noData")} />
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
																	{trafficOperatorLabel(t, operator.operator)}
																</span>
																<b>{number(operator.total)}</b>
															</div>
														),
														children: (
															<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
																{operator.statuses.map(status => (
																	<div className="sms-gateway-status-row" key={status.delivery_status}>
																		<Tag color={trafficStatusColor(status.delivery_status)}>{status.delivery_status}</Tag>
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
							{(result.count ?? 0) > TRAFFIC_PAGE_SIZE_OPTIONS[0] && (
								<Pagination
									className="mt-4 text-center"
									current={page}
									pageSize={pageSize}
									total={result.count}
									pageSizeOptions={TRAFFIC_PAGE_SIZE_OPTIONS}
									showSizeChanger
									onChange={(nextPage, nextPageSize) => void changePage(nextPageSize === pageSize ? nextPage : 1, nextPageSize)}
								/>
							)}
						</ReportSection>
					</>
				)}
				{!result && state.phase === "ready" && <Card><Empty description={t("performance.smsGatewayPages.traffic.selectFilters")} /></Card>}
			</Space>
		</BasicContent>
	);
}
