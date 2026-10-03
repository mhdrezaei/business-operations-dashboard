import type { PerformanceServicePath } from "#src/features/performance/api/performances.api";
import type { CSSProperties } from "react";
import type { PerformanceListRow } from "../model/performance.list.types";
import { BasicContent } from "#src/components";
import {
	deletePerformanceByComposite,
	deletePerformanceById,
	deleteSmsCommissionPerformanceByComposite,
	fetchPerformanceList,
} from "#src/features/performance/api/performances.api";
import {
	aggregatePerformanceRows,
	companyTypeMatches,
	normalizePerformanceRecord,
	resolvePerformanceServicePath,
	shouldAggregatePerformanceRows,
} from "#src/features/performance/shared/model/performance.helpers";
import { companiesByServiceQuery, servicesQuery } from "#src/features/performance/shared/queries/performance.queries";
import { MONTH_OPTIONS } from "#src/features/performance/shared/ui/form/constants/jalali-date-options";
import { useAccess } from "#src/hooks";
import { SectionCard } from "#src/shared/ui/section-card";
import { useQuery } from "@tanstack/react-query";
import { Button, Empty, Select, Skeleton, Tag, theme, Typography } from "antd";
import i18next from "i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { PerformanceDetailModal } from "./components/PerformanceDetailModal";
import { TrafficUpdateTemplateModal } from "./components/TrafficUpdateTemplateModal";
import "./performance-edit-workspace.css";

function serviceRequiresCompanyType(serviceCode: string | null | undefined) {
	const normalized = String(serviceCode ?? "").trim().toLowerCase();
	return normalized === "sms" || normalized === "psp" || normalized === "traffic" || normalized === "sales_agency";
}

function rowKey(row: PerformanceListRow) {
	const normalized = normalizePerformanceRecord(row);
	return String(normalized.id ?? [
		normalized.companyId,
		normalized.salesAgentId,
		normalized.year,
		normalized.month,
		row.operation_type,
		row.operator,
		row.language,
		row.location,
	].join("-"));
}

function formatNumeric(value: unknown) {
	if (value == null || value === "")
		return null;
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric.toLocaleString("en-US") : String(value);
}

function resolveMonthLabel(value: unknown) {
	const month = Number(value);
	return MONTH_OPTIONS.find(option => option.value === month)?.label ?? String(value ?? "-");
}

interface PerformanceSummaryItem {
	key: string
	label: string
	value: string
}

function summaryNumber(value: unknown, monetary = false) {
	const formatted = formatNumeric(value);
	return formatted ? `${formatted}${monetary ? " ریال" : ""}` : null;
}

function operatorLabel(value: unknown) {
	const normalized = String(value ?? "").trim().toUpperCase();
	if (normalized === "MCI" || normalized === "HAMRAH_AVAL")
		return "همراه اول";
	if (normalized === "MTN" || normalized === "IRANCELL")
		return "ایرانسل";
	if (normalized === "RIGHTEL")
		return "رایتل";
	return normalized || "سایر";
}

function languageLabel(value: unknown) {
	const normalized = String(value ?? "").trim().toUpperCase();
	if (normalized === "FA")
		return "فارسی";
	if (normalized === "EN")
		return "انگلیسی";
	return normalized || "-";
}

function trafficLocationLabel(value: unknown) {
	const normalized = String(value ?? "").trim().toUpperCase();
	if (normalized === "TEHRAN")
		return "تهران";
	if (normalized === "COUNTY")
		return "شهرستان";
	return String(value ?? "").trim() || "ترافیک";
}

function operationTypeLabel(value: unknown) {
	const normalized = String(value ?? "").trim().toUpperCase();
	const labels: Record<string, string> = {
		BILL_INQUIRY: i18next.t("performance.operationType.billInquiry"),
		RECEIPT_REGISTER: i18next.t("performance.operationType.receiptRegister"),
		TRAFFIC: i18next.t("performance.fields.openapi.trafficPackageCount"),
		TRAFFIC_REVENUE: i18next.t("performance.fields.openapi.trafficRevenue"),
		TRAFFIC_PACKAGE_COUNT: i18next.t("performance.fields.openapi.trafficPackageCount"),
	};
	return labels[normalized] ?? String(value ?? "عملکرد");
}

function buildPerformanceSummary(service: PerformanceServicePath | null, row: PerformanceListRow): PerformanceSummaryItem[] {
	const add = (items: PerformanceSummaryItem[], key: string, label: string, value: unknown, monetary = false) => {
		const formatted = summaryNumber(value, monetary);
		if (formatted)
			items.push({ key, label, value: formatted });
	};
	const items: PerformanceSummaryItem[] = [];
	const sourceRows = Array.isArray(row.performance_items) ? row.performance_items as PerformanceListRow[] : [row];

	if (service === "sms" || service === "sms-commission") {
		sourceRows.forEach((item, index) => add(
			items,
			`sms-${index}`,
			`${operatorLabel(item.operator)} - ${languageLabel(item.language)}`,
			item.value,
		));
		return items;
	}

	if (service === "openapi") {
		sourceRows.forEach((item, index) => {
			const value = summaryNumber(item.value);
			const income = summaryNumber(item.income, true);
			if (value || income) {
				items.push({
					key: `openapi-${index}`,
					label: operationTypeLabel(item.operation_type),
					value: [value ? `مقدار ${value}` : null, income ? `درآمد ${income}` : null].filter(Boolean).join(" · "),
				});
			}
		});
		return items;
	}

	if (service === "traffic") {
		const trafficRows = Array.isArray(row.traffic_locations) ? row.traffic_locations as PerformanceListRow[] : [row];
		trafficRows.forEach((item, index) => {
			const location = trafficLocationLabel(item.location);
			add(items, `traffic-sent-${index}`, `${location} · ترافیک ارسالی`, item.value);
			add(items, `traffic-received-${index}`, `${location} · ترافیک دریافتی`, item.value_receive);
			add(items, `traffic-income-${index}`, `${location} · درآمد`, item.income, true);
			add(items, `traffic-expense-${index}`, `${location} · هزینه`, item.expense, true);
		});
		return items;
	}

	if (service === "commercial" && row.customer_name)
		items.push({ key: "customer", label: "مشتری", value: String(row.customer_name) });
	add(items, "value", service === "psp" ? "مقدار عملکرد" : "مقدار", row.value);
	add(items, "income", "درآمد", row.income, true);
	add(items, "expense", "هزینه", row.expense, true);
	add(items, "profit", "سود", row.profit, true);
	return items;
}

async function fetchAllPerformances(
	service: PerformanceServicePath,
	serviceId: number,
	companyId: number,
	companyType: string | null,
) {
	const rows: PerformanceListRow[] = [];
	const pageSize = 250;
	let page = 1;
	let total = 0;

	do {
		const response = await fetchPerformanceList(service, {
			page,
			page_size: pageSize,
			service: serviceId,
			company: companyId,
			company_type: companyType ?? undefined,
			ordering: "-sh_year,-sh_month",
		});
		rows.push(...(response.results ?? []));
		total = response.count ?? rows.length;
		page += 1;
		if ((response.results ?? []).length === 0)
			break;
	}
	while (rows.length < total);

	const result = shouldAggregatePerformanceRows(service)
		? aggregatePerformanceRows(service, rows)
		: rows;

	return result.sort((first, second) => {
		const firstRecord = normalizePerformanceRecord(first);
		const secondRecord = normalizePerformanceRecord(second);
		const yearDifference = (secondRecord.year ?? 0) - (firstRecord.year ?? 0);
		if (yearDifference !== 0)
			return yearDifference;
		return (secondRecord.month ?? 0) - (firstRecord.month ?? 0);
	});
}

export default function PerformanceListPage() {
	const { t } = useTranslation();
	const { token } = theme.useToken();
	const navigate = useNavigate();
	const location = useLocation();
	const initializedDirectEdit = useRef(false);
	const { hasDomainPermissionByServiceId, getPermittedCompanyTypes, getPermittedServiceIds } = useAccess();

	const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
	const [selectedServiceCode, setSelectedServiceCode] = useState<string | null>(null);
	const [selectedCompanyType, setSelectedCompanyType] = useState<string | null>(null);
	const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
	const [selectedYear, setSelectedYear] = useState<number | null>(null);
	const [selectedRow, setSelectedRow] = useState<PerformanceListRow | null>(null);
	const [detailRevision, setDetailRevision] = useState(0);
	const [deleting, setDeleting] = useState(false);

	const directEdit = (location.state as {
		directEdit?: {
			service: PerformanceServicePath
			serviceCode: string | null
			serviceId: number | null
			record: PerformanceListRow
		}
	} | null)?.directEdit;

	const performanceViewIds = getPermittedServiceIds("performances", "view");
	const contractViewIds = getPermittedServiceIds("contracts", "view");
	const permittedViewServiceIdsList = performanceViewIds.length > 0 ? performanceViewIds : contractViewIds;
	const permittedViewServiceIds = useMemo(
		() => new Set(permittedViewServiceIdsList),
		[permittedViewServiceIdsList.join(",")],
	);

	const services = useQuery(servicesQuery());
	const companies = useQuery(companiesByServiceQuery(selectedServiceId));
	const selectedServicePath = useMemo(
		() => resolvePerformanceServicePath(selectedServiceCode as any, selectedCompanyType),
		[selectedServiceCode, selectedCompanyType],
	);
	const requiresCompanyType = serviceRequiresCompanyType(selectedServiceCode);
	const permittedCompanyTypeOptions = useMemo(
		() => requiresCompanyType
			? getPermittedCompanyTypes("performances", "view", selectedServiceId)
			: [],
		[requiresCompanyType, selectedServiceId, getPermittedCompanyTypes],
	);

	const serviceOptions = useMemo(() => (services.data?.results ?? [])
		.filter(service => permittedViewServiceIds.has(Number(service.id)))
		.map(service => ({
			label: service.name,
			value: Number(service.id),
			code: String(service.code ?? "").trim().toLowerCase(),
		})), [services.data, permittedViewServiceIdsList.join(",")]);

	const companyOptions = useMemo(() => (companies.data?.results ?? [])
		.filter(company => !requiresCompanyType || (selectedCompanyType && companyTypeMatches(company.company_type, selectedCompanyType)))
		.map(company => ({ label: company.name, value: Number(company.id) })), [companies.data, requiresCompanyType, selectedCompanyType]);

	useEffect(() => {
		if (!directEdit || initializedDirectEdit.current)
			return;
		initializedDirectEdit.current = true;
		const normalized = normalizePerformanceRecord(directEdit.record);
		setSelectedServiceId(directEdit.serviceId ?? normalized.serviceId);
		setSelectedServiceCode(directEdit.serviceCode ?? directEdit.service);
		setSelectedCompanyType(normalized.companyType);
		setSelectedCompanyId(normalized.companyId);
		setSelectedYear(normalized.year);
		setSelectedRow(directEdit.record);
		navigate("/performances/edit", { replace: true, state: null });
	}, [directEdit, navigate]);

	const performances = useQuery({
		queryKey: ["performance-edit-workspace", selectedServicePath, selectedServiceId, selectedCompanyId, selectedCompanyType],
		queryFn: () => fetchAllPerformances(
			selectedServicePath!,
			selectedServiceId!,
			selectedCompanyId!,
			selectedCompanyType,
		),
		enabled: Boolean(
			selectedServicePath
			&& selectedServiceId
			&& selectedCompanyId
			&& (!requiresCompanyType || selectedCompanyType),
		),
	});

	const availableYears = useMemo(() => Array.from(new Set((performances.data ?? [])
		.map(row => normalizePerformanceRecord(row).year)
		.filter((year): year is number => year != null)))
		.sort((first, second) => second - first), [performances.data]);

	useEffect(() => {
		if (performances.isLoading || performances.isFetching)
			return;
		if (availableYears.length === 0) {
			setSelectedYear(null);
			setSelectedRow(null);
			return;
		}
		if (selectedYear == null || !availableYears.includes(selectedYear))
			setSelectedYear(availableYears[0]);
	}, [availableYears.join(","), performances.isLoading, performances.isFetching, selectedYear]);

	const visibleRows = useMemo(() => (performances.data ?? []).filter(
		row => normalizePerformanceRecord(row).year === selectedYear,
	), [performances.data, selectedYear]);

	const canUpdateRow = useCallback((row: PerformanceListRow) => {
		const normalized = normalizePerformanceRecord(row);
		const serviceId = normalized.serviceId ?? selectedServiceId;
		if (!serviceId)
			return false;
		const companyType = normalized.companyType ?? selectedCompanyType;
		const hasPerformanceAccess = hasDomainPermissionByServiceId("performances", "update", serviceId, companyType);
		const hasContractAccess = hasDomainPermissionByServiceId("contracts", "update", serviceId, companyType);
		return hasPerformanceAccess || hasContractAccess;
	}, [selectedServiceId, selectedCompanyType, hasDomainPermissionByServiceId]);
	const canDeleteRow = useCallback((row: PerformanceListRow) => {
		const normalized = normalizePerformanceRecord(row);
		const serviceId = normalized.serviceId ?? selectedServiceId;
		if (!serviceId)
			return false;
		const companyType = normalized.companyType ?? selectedCompanyType;
		const hasPerformanceDelete = hasDomainPermissionByServiceId("performances", "delete", serviceId, companyType);
		const hasContractDelete = hasDomainPermissionByServiceId("contracts", "delete", serviceId, companyType);
		return hasPerformanceDelete || hasContractDelete;
	}, [selectedServiceId, selectedCompanyType, hasDomainPermissionByServiceId]);

	useEffect(() => {
		if (deleting || performances.isFetching)
			return;
		if (visibleRows.length === 0) {
			setSelectedRow(null);
			return;
		}
		const currentKey = selectedRow ? rowKey(selectedRow) : null;
		const current = visibleRows.find(row => rowKey(row) === currentKey && canUpdateRow(row));
		if (current) {
			if (current !== selectedRow)
				setSelectedRow(current);
			return;
		}
		setSelectedRow(visibleRows.find(canUpdateRow) ?? null);
	}, [visibleRows, selectedRow, canUpdateRow, deleting, performances.isFetching]);

	const resetAfterService = () => {
		setSelectedCompanyType(null);
		setSelectedCompanyId(null);
		setSelectedYear(null);
		setSelectedRow(null);
	};

	const resetAfterCompanyType = () => {
		setSelectedCompanyId(null);
		setSelectedYear(null);
		setSelectedRow(null);
	};

	const emptyDescription = !selectedServiceId
		? t("performance.messages.selectServiceFirst")
		: requiresCompanyType && !selectedCompanyType
			? t("performance.placeholders.selectCompanyTypeFirst")
			: !selectedCompanyId
				? t("performance.placeholders.selectCompany")
				: visibleRows.length === 0
					? "برای این شرکت در سال انتخاب‌شده عملکردی ثبت نشده است."
					: "یک عملکرد را از فهرست انتخاب کنید.";
	const handleDelete = async (targetRow: PerformanceListRow | null = selectedRow) => {
		if (!targetRow || !selectedServicePath || !canDeleteRow(targetRow))
			return;
		const normalized = normalizePerformanceRecord(targetRow);
		setDeleting(true);
		try {
			if (selectedServicePath === "sms-commission") {
				if (normalized.companyId == null || normalized.salesAgentId == null || normalized.year == null || normalized.month == null)
					throw new Error(t("performance.errors.deleteCompositeKeyIncomplete"));
				await deleteSmsCommissionPerformanceByComposite(normalized.companyId, normalized.salesAgentId, normalized.year, normalized.month);
			}
			else if (selectedServicePath === "openapi" || selectedServicePath === "sms" || selectedServicePath === "traffic") {
				if (normalized.companyId == null || normalized.year == null || normalized.month == null)
					throw new Error(t("performance.errors.deleteCompositeKeyIncomplete"));
				await deletePerformanceByComposite(selectedServicePath, normalized.companyId, normalized.year, normalized.month);
			}
			else if (selectedServicePath === "psp") {
				if (normalized.companyId == null || normalized.year == null || normalized.month == null)
					throw new Error(t("performance.errors.deleteCompositeKeyIncomplete"));
				await deletePerformanceByComposite(selectedServicePath, normalized.companyId, normalized.year, normalized.month);
			}
			else if (normalized.id != null) {
				await deletePerformanceById(selectedServicePath, normalized.id);
			}
			else if (normalized.companyId != null && normalized.year != null && normalized.month != null) {
				await deletePerformanceByComposite(selectedServicePath, normalized.companyId, normalized.year, normalized.month);
			}
			else {
				throw new Error(t("performance.errors.deleteUniqueKeyNotFound"));
			}
			setSelectedRow(null);
			await performances.refetch();
			window.$message?.success(t("common.deleteSuccess"));
		}
		finally {
			setDeleting(false);
		}
	};

	return (
		<BasicContent className="performance-edit-page">
			<div className="performance-edit-page__layout">
				<aside className="performance-edit-sidebar" aria-label="فیلتر و فهرست عملکردها">
					<SectionCard title="انتخاب سرویس و شرکت" collapsible={false}>
						<div className="performance-edit-filter-stack">
							<label className="performance-edit-filter">
								<span>{t("performance.columns.service")}</span>
								<Select
									showSearch
									optionFilterProp="label"
									loading={services.isLoading}
									value={selectedServiceId}
									options={serviceOptions}
									placeholder={t("performance.placeholders.selectService")}
									onChange={(value) => {
										const option = serviceOptions.find(item => item.value === value);
										setSelectedServiceId(value ?? null);
										setSelectedServiceCode(option?.code ?? null);
										resetAfterService();
									}}
								/>
							</label>

							{requiresCompanyType
								? (
									<label className="performance-edit-filter">
										<span>{t("performance.columns.companyType")}</span>
										<Select
											value={selectedCompanyType}
											options={permittedCompanyTypeOptions.map(option => ({ label: option.value, value: option.key }))}
											placeholder={t("performance.placeholders.selectCompanyType", { defaultValue: "نوع شرکت را انتخاب کنید" })}
											onChange={(value) => {
												setSelectedCompanyType(value ?? null);
												resetAfterCompanyType();
											}}
										/>
									</label>
								)
								: null}

							<label className="performance-edit-filter">
								<span>{t("performance.columns.company")}</span>
								<Select
									showSearch
									optionFilterProp="label"
									loading={companies.isLoading}
									value={selectedCompanyId}
									options={companyOptions}
									disabled={!selectedServiceId || (requiresCompanyType && !selectedCompanyType)}
									placeholder={!selectedServiceId
										? t("performance.placeholders.selectServiceFirst")
										: requiresCompanyType && !selectedCompanyType
											? t("performance.placeholders.selectCompanyTypeFirst")
											: t("performance.placeholders.selectCompany")}
									onChange={(value) => {
										setSelectedCompanyId(value ?? null);
										setSelectedYear(null);
										setSelectedRow(null);
									}}
								/>
							</label>
						</div>
					</SectionCard>

					<SectionCard title="عملکردهای شرکت" collapsible={false}>
						<label className="performance-edit-filter performance-edit-year-filter">
							<span>انتخاب سال (شمسی)</span>
							<Select
								value={selectedYear}
								options={availableYears.map(year => ({ label: String(year), value: year }))}
								loading={performances.isLoading || performances.isFetching}
								disabled={!selectedCompanyId || availableYears.length === 0}
								placeholder={availableYears.length > 0 ? t("performance.placeholders.year") : "سال دارای عملکردی یافت نشد"}
								onChange={(value) => {
									setSelectedYear(value ?? null);
									setSelectedRow(null);
								}}
							/>
						</label>

						<div className="performance-edit-list-heading">
							<Typography.Text strong>عملکردهای شرکت</Typography.Text>
							{visibleRows.length > 0 ? <Tag bordered={false}>{visibleRows.length}</Tag> : null}
						</div>

						{performances.isError
							? (
								<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="دریافت عملکردها ناموفق بود.">
									<Button onClick={() => void performances.refetch()}>تلاش دوباره</Button>
								</Empty>
							)
							: performances.isLoading || performances.isFetching
								? <Skeleton active paragraph={{ rows: 5 }} title={false} />
								: visibleRows.length > 0
									? (
										<div className="performance-edit-list">
											{visibleRows.map((row) => {
												const normalized = normalizePerformanceRecord(row);
												const key = rowKey(row);
												const selected = selectedRow ? rowKey(selectedRow) === key : false;
												const editable = canUpdateRow(row);
												const summary = selected ? buildPerformanceSummary(selectedServicePath, row) : [];
												const itemStyle = {
													"--performance-list-border": selected ? token.colorPrimary : token.colorBorderSecondary,
													"--performance-list-bg": selected ? token.colorPrimaryBgHover : token.colorBgLayout,
													"--performance-list-hover-border": selected ? token.colorPrimaryHover : token.colorTextSecondary,
													"--performance-list-hover-bg": selected ? token.colorPrimaryBgHover : token.colorBgLayout,
												} as CSSProperties;
												return (
													<button
														key={key}
														type="button"
														className={`performance-edit-list-item${selected ? " performance-edit-list-item--selected" : ""}`}
														style={itemStyle}
														disabled={!editable}
														aria-pressed={selected}
														onClick={() => setSelectedRow(row)}
													>
														<span className="performance-edit-list-item__header">
															<strong>
																عملکرد
																{normalized.year}
																/
																{String(normalized.month ?? "-").padStart(2, "0")}
															</strong>
															<span>{resolveMonthLabel(normalized.month)}</span>
														</span>
														{summary.length > 0
															? (
																<span className="performance-edit-list-item__summary">
																	{summary.map(item => (
																		<span key={item.key}>
																			<span dir="rtl">
																				{item.label}
																				:
																			</span>
																			<b dir="ltr">{item.value}</b>
																		</span>
																	))}
																</span>
															)
															: null}
														{!editable ? <span className="performance-edit-list-item__readonly">دسترسی ویرایش ندارید</span> : null}
													</button>
												);
											})}
										</div>
									)
									: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyDescription} />}
					</SectionCard>
				</aside>

				<main className="performance-edit-main">
					{selectedServicePath === "traffic" && selectedServiceId
						? (
							<TrafficUpdateTemplateModal
								embedded
								open
								serviceId={selectedServiceId}
								companyTypeOptions={permittedCompanyTypeOptions.map(option => ({ label: option.value, value: option.key }))}
							/>
						)
						: null}
					{selectedRow && selectedServicePath
						? (
							<PerformanceDetailModal
								key={`${rowKey(selectedRow)}-${detailRevision}`}
								embedded
								open
								service={selectedServicePath}
								companies={companies.data?.results}
								record={selectedRow}
								onDelete={canDeleteRow(selectedRow) ? target => void handleDelete(target ?? selectedRow) : undefined}
								deleting={deleting}
								onClose={() => setSelectedRow(null)}
								onUpdated={() => {
									void (async () => {
										const currentKey = selectedRow ? rowKey(selectedRow) : null;
										const refreshed = await performances.refetch();
										const nextRows = refreshed.data ?? [];
										const nextRow = currentKey ? nextRows.find(row => rowKey(row) === currentKey) : undefined;
										setSelectedRow(nextRow ?? null);
										setDetailRevision(revision => revision + 1);
									})();
								}}
							/>
						)
						: (
							<div
								className="performance-edit-main__empty"
								style={{ background: token.colorBgContainer, borderColor: token.colorSplit }}
							>
								<span
									className="performance-edit-main__empty-badge"
									style={{ background: token.colorPrimaryBg, color: token.colorText }}
								>
									ویرایش عملکرد
								</span>
								<div className="performance-edit-main__empty-inner">
									<img
										className="performance-edit-main__empty-image"
										src="/empty_state_performance.svg"
										alt=""
										aria-hidden="true"
									/>
									<Typography.Paragraph className="performance-edit-main__empty-copy">
										برای ویرایش، ابتدا از ستون سمت راست سرویس و شرکت را انتخاب کرده و سپس یکی از عملکردها را از لیست انتخاب کنید.
									</Typography.Paragraph>
								</div>
							</div>
						)}
				</main>
			</div>
		</BasicContent>
	);
}
