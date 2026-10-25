import type { SmsGatewayImportOperator, SmsGatewayManualImportResponse } from "#src/features/performance/api/performances.api";
import type { TFunction } from "i18next";
import SelectPerformanceEmptyState from "#src/assets/svg/select-performance.svg?react";
import { fetchSmsGatewayImportStatus, importSmsGatewayPerformance } from "#src/features/performance/api/performances.api";
import { MONTH_OPTIONS } from "#src/features/performance/shared/ui/form/constants/jalali-date-options";
import { notification } from "#src/utils";
import { CheckCircleOutlined, EyeOutlined, ReloadOutlined, SearchOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Checkbox, ConfigProvider, Empty, Input, Modal, Select, Spin, Tag, theme } from "antd";
import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const YEAR_OPTIONS = Array.from({ length: 10 }, (_, index) => {
	const year = 1404 + index;
	return { value: year, label: String(year) };
});
const MIN_IMPORT_YEAR = 1404;
const MIN_IMPORT_MONTH = 10;
const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;
const SELECTABLE_STATUSES = ["will_create", "will_update"];
export const SMS_GATEWAY_SUMMARY_KEYS = ["imported_count", "updated_count", "commission_imported_count", "commission_updated_count", "skipped_count"] as const;
const STATUS_COLORS: Record<string, string> = {
	will_create: "green",
	will_update: "blue",
	no_contract: "orange",
	unmapped: "red",
};

function formatNumber(value: number) {
	return new Intl.NumberFormat("fa-IR").format(value ?? 0);
}

function operatorLabel(item: SmsGatewayImportOperator, t: TFunction) {
	const operator = item.operator === "MCI" ? t("performance.operator.mci") : item.operator === "IRANCELL" ? t("performance.operator.irancell") : t("performance.operator.other");
	return `${operator} / ${item.language === "FA" ? t("performance.language.fa") : t("performance.language.en")}`;
}

type SmsGatewayImportItem = SmsGatewayManualImportResponse["items"][number];
type SelectableItem = SmsGatewayImportItem & { company_id: number };

function isSelectable(item: SmsGatewayImportItem): item is SelectableItem {
	return SELECTABLE_STATUSES.includes(item.status) && item.company_id != null;
}

function selectableIds(items: SmsGatewayImportItem[]) {
	return items.filter(isSelectable).map(item => item.company_id);
}

interface Props {
	open: boolean
	onClose: () => void
	inline?: boolean
}

export function SmsGatewayImportModal({ open, onClose, inline = false }: Props) {
	const { t } = useTranslation();
	const { token } = theme.useToken();
	const antdContext = useContext(ConfigProvider.ConfigContext);
	const configuredCardRadius = antdContext.theme?.components?.Card?.borderRadiusLG;
	const itemRadius = typeof configuredCardRadius === "number" ? configuredCardRadius : token.borderRadiusLG;
	const [year, setYear] = useState<number | null>(null);
	const [month, setMonth] = useState<number | null>(null);
	const [preview, setPreview] = useState<SmsGatewayManualImportResponse | null>(null);
	const [selected, setSelected] = useState<number[]>([]);
	const [activeFilters, setActiveFilters] = useState<string[]>(Object.keys(STATUS_COLORS));
	const [search, setSearch] = useState("");
	const [loading, setLoading] = useState(false);
	const [confirming, setConfirming] = useState(false);
	const [processing, setProcessing] = useState(false);
	const [successSummary, setSuccessSummary] = useState<Record<string, number> | null>(null);
	const pollTimerRef = useRef<ReturnType<typeof setTimeout>>();
	const pollJobIdRef = useRef<number | null>(null);
	const selectedYear = year;
	const selectedMonth = month;
	const monthOptions = MONTH_OPTIONS.filter(item => year !== MIN_IMPORT_YEAR || item.value >= MIN_IMPORT_MONTH);

	const stopPolling = () => {
		clearTimeout(pollTimerRef.current);
		pollJobIdRef.current = null;
	};

	useEffect(() => stopPolling, []);

	const close = () => {
		stopPolling();
		setPreview(null);
		setSelected([]);
		setProcessing(false);
		setSuccessSummary(null);
		onClose();
	};

	const pollJob = async (jobId: number, startedAt: number) => {
		try {
			const job = await fetchSmsGatewayImportStatus(jobId);
			if (pollJobIdRef.current !== jobId)
				return;
			if (job.status === "SUCCESS" || job.status === "FAILED" || Date.now() - startedAt > POLL_TIMEOUT_MS) {
				stopPolling();
				setProcessing(false);
				if (job.status === "SUCCESS")
					setSuccessSummary(job.summary ?? {});
				else
					notification.error({ message: job.status === "FAILED" ? job.error || t("performance.smsGatewayImport.jobFailed") : t("performance.smsGatewayImport.pollTimeout"), placement: "topRight" });
				return;
			}
			pollTimerRef.current = setTimeout(() => void pollJob(jobId, startedAt), POLL_INTERVAL_MS);
		}
		catch {
			if (pollJobIdRef.current === jobId) {
				stopPolling();
				setProcessing(false);
				notification.error({ message: t("performance.smsGatewayImport.pollFailed"), placement: "topRight" });
			}
		}
	};

	const loadPreviewForPeriod = async (targetYear: number | null, targetMonth: number | null) => {
		if (!targetYear || !targetMonth)
			return;
		setLoading(true);
		try {
			const response = await importSmsGatewayPerformance(targetYear, targetMonth, false);
			setPreview(response);
			setSelected(selectableIds(response.items));
			setActiveFilters(Object.keys(STATUS_COLORS));
			setSearch("");
		}
		finally {
			setLoading(false);
		}
	};

	const loadPreview = () => loadPreviewForPeriod(selectedYear, selectedMonth);

	const confirm = async () => {
		if (!selectedYear || !selectedMonth || !preview || selected.length === 0)
			return;
		setConfirming(true);
		try {
			const allSelected = selectableIds(preview.items).every(id => selected.includes(id));
			const response = await importSmsGatewayPerformance(selectedYear, selectedMonth, true, allSelected ? undefined : selected);
			if (response.queued && response.job_id) {
				const jobId = response.job_id;
				stopPolling();
				pollJobIdRef.current = jobId;
				setProcessing(true);
				const startedAt = Date.now();
				pollTimerRef.current = setTimeout(() => void pollJob(jobId, startedAt), POLL_INTERVAL_MS);
			}
			else {
				setSuccessSummary(response.summary ?? {});
			}
		}
		finally {
			setConfirming(false);
		}
	};

	const toggleItem = (companyId: number) => {
		setSelected(current => current.includes(companyId)
			? current.filter(value => value !== companyId)
			: [...current, companyId]);
	};

	const toggleFilter = (status: string) => {
		const removing = activeFilters.includes(status);
		setActiveFilters(current => removing ? current.filter(value => value !== status) : [...current, status]);
		if (!preview)
			return;
		const ids = selectableIds(preview.items.filter(item => item.status === status));
		setSelected(current => removing
			? current.filter(id => !ids.includes(id))
			: [...current, ...ids.filter(id => !current.includes(id))]);
	};

	const query = search.trim().toLowerCase();
	const visibleItems = (preview?.items ?? []).filter((item) => {
		const matchesSearch = !query || (item.company_name ?? item.gateway_customer_name ?? "").toLowerCase().includes(query);
		return matchesSearch && activeFilters.includes(item.status);
	});
	const visibleIds = selectableIds(visibleItems);
	const visibleSelectedCount = visibleIds.filter(id => selected.includes(id)).length;
	const selectAllVisible = () => setSelected(current => [...current, ...visibleIds.filter(id => !current.includes(id))]);

	const handleYearChange = (value: number) => {
		setYear(value);
		setMonth(null);
		setPreview(null);
	};

	const handleMonthChange = (value: number) => {
		setMonth(value);
		setPreview(null);
		if (inline)
			void loadPreviewForPeriod(year, value);
	};

	const successRows = SMS_GATEWAY_SUMMARY_KEYS.filter(key => successSummary?.[key] != null);

	const content = (
		<div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-5 min-h-[460px]" dir="rtl">
			<div className="border-l-0 lg:border-l border-solid border-slate-200 pl-0 lg:pl-5 space-y-3">
				<div className="sms-gateway-period-controls">
					<div className="sms-gateway-period-controls__field">
						<label className="block text-sm">{t("performance.columns.shYear")}</label>
						<Select className="w-full" value={year} options={YEAR_OPTIONS} placeholder={t("performance.smsGatewayImport.selectYear")} onChange={handleYearChange} />
					</div>
					<div className="sms-gateway-period-controls__field">
						<label className="block text-sm">{t("performance.smsGatewayImport.shMonth")}</label>
						<Select className="w-full" value={month} options={monthOptions} placeholder={t("performance.placeholders.selectYearFirst")} disabled={!year} onChange={handleMonthChange} />
					</div>
				</div>
				{inline
					? null
					: (
						<Button className="w-full" type="primary" icon={preview ? <ReloadOutlined /> : <EyeOutlined />} disabled={!selectedYear || !selectedMonth} loading={loading} onClick={loadPreview}>
							{preview ? t("performance.smsGatewayImport.refreshPreview") : t("performance.smsGatewayImport.preview")}
						</Button>
					)}
				{preview
					? (
						<div className="flex flex-wrap gap-1 pt-2">
							{Object.entries(preview.summary).filter(([status]) => STATUS_COLORS[status]).map(([status, count]) => (
								<Tag
									key={status}
									className="cursor-pointer select-none"
									color={activeFilters.includes(status) ? STATUS_COLORS[status] : undefined}
									onClick={() => toggleFilter(status)}
								>
									{t(`performance.smsGatewayImport.status.${status}`)}
									:
									{" "}
									{formatNumber(count)}
								</Tag>
							))}
						</div>
					)
					: null}
				<Button className="w-full mt-auto" type="primary" icon={<UploadOutlined />} disabled={selected.length === 0 || processing} loading={confirming} onClick={confirm}>{t("performance.smsGatewayImport.confirmAndRegister")}</Button>
			</div>
			<div className="sms-gateway-import-scrollbar max-h-[min(620px,calc(100vh-260px))] overflow-y-auto pl-1">
				{processing
					? (
						<div className="h-full min-h-[360px] flex flex-col justify-center items-center gap-3 text-center">
							<Spin size="large" />
							<h3 className="m-0 text-lg font-bold">{t("performance.smsGatewayImport.processingTitle")}</h3>
							<p className="m-0 text-sm opacity-70">{t("performance.smsGatewayImport.processingDescription")}</p>
						</div>
					)
					: loading
						? <div className="h-full min-h-[360px] flex justify-center items-center"><Spin /></div>
						: !preview
							? (
								<Empty
									className="h-full"
									style={{ minHeight: 360, marginBlock: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
									styles={{ image: { width: 125, height: 107, overflow: "visible" } }}
									image={<SelectPerformanceEmptyState aria-hidden="true" />}
									description={(
										<span style={{ color: token.colorTextTertiary }}>
											{inline ? t("performance.smsGatewayImport.emptyInline") : t("performance.smsGatewayImport.emptyManual")}
										</span>
									)}
								/>
							)
							: (
								<>
									<div className="font-medium mb-3">
										{t("performance.smsGatewayImport.previewResult")}
										<span className="text-sm font-normal text-slate-500">
											(
											{formatNumber(preview.items.length)}
											{" "}
											{t("performance.smsGatewayImport.itemUnit")}
											)
										</span>
									</div>
									{visibleIds.length > 0
										? (
											<div className="mb-3 flex items-center justify-between gap-3 text-xs" style={{ border: `1px solid ${token.colorPrimaryBorder}`, borderRadius: token.borderRadius, background: token.colorPrimaryBg, padding: `${token.paddingXS}px ${token.paddingSM}px` }}>
												<span>{t("performance.smsGatewayImport.selectedCount", { selected: formatNumber(visibleSelectedCount), total: formatNumber(visibleIds.length) })}</span>
												{visibleSelectedCount < visibleIds.length
													? <Button type="link" size="small" onClick={selectAllVisible}>{t("performance.smsGatewayImport.selectAll")}</Button>
													: null}
											</div>
										)
										: null}
									<Input
										className="mb-3"
										allowClear
										prefix={<SearchOutlined />}
										value={search}
										placeholder={t("performance.smsGatewayImport.searchPlaceholder")}
										onChange={event => setSearch(event.target.value)}
									/>
									{visibleItems.length === 0 ? <Empty description={t("performance.smsGatewayImport.noSearchResult")} /> : null}
									<div className="space-y-3">
										{visibleItems.map((item, index) => {
											const selectable = isSelectable(item);
											const checked = selectable && selected.includes(item.company_id);
											const meta = STATUS_COLORS[item.status]
												? { label: t(`performance.smsGatewayImport.status.${item.status}`), color: STATUS_COLORS[item.status] }
												: { label: item.status, color: "default" };
											return (
												<div
													key={selectable ? item.company_id : `${item.status}-${item.gateway_customer_name}-${index}`}
													className={`sms-gateway-item ${checked ? "sms-gateway-item--selected" : ""} ${selectable ? "sms-gateway-item--selectable" : ""}`}
													style={{
														border: `1px solid ${checked ? token.colorPrimary : token.colorBorderSecondary}`,
														borderRadius: itemRadius,
														background: checked ? token.colorPrimaryBg : token.colorBgLayout,
														boxShadow: checked ? `inset 0 0 0 ${token.lineWidth}px ${token.colorPrimary}` : undefined,
													}}
													onClick={selectable ? () => toggleItem(item.company_id) : undefined}
												>
													<div className="mb-2 flex items-start justify-between gap-3">
														<div className="flex items-center gap-2">
															{selectable
																? (
																	<Checkbox
																		checked={checked}
																		onClick={event => event.stopPropagation()}
																		onChange={() => toggleItem(item.company_id)}
																	/>
																)
																: null}
															<Tag bordered={false} style={{ background: token.colorPrimaryBgHover, color: token.colorText }}>
																{item.company_name ?? t("performance.smsGatewayImport.unmatchedCompany")}
															</Tag>
														</div>
														<Tag color={meta.color}>{meta.label}</Tag>
													</div>
													<div className="mb-1 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
														<div className="sms-gateway-item__identity flex justify-between" style={{ borderRadius: token.borderRadius, background: token.colorPrimaryBgHover, color: token.colorText, padding: `${token.paddingXS}px ${token.paddingSM}px` }}>
															<span>{t("performance.smsGatewayImport.gatewayName")}</span>
															<b>{item.gateway_customer_name || "—"}</b>
														</div>
														<div className="sms-gateway-item__identity flex justify-between" style={{ borderRadius: token.borderRadius, background: token.colorPrimaryBgHover, color: token.colorText, padding: `${token.paddingXS}px ${token.paddingSM}px` }}>
															<span>{t("performance.smsGatewayImport.type")}</span>
															<b>{item.company_type || "—"}</b>
														</div>
													</div>
													<div className="grid grid-cols-2 gap-1 text-xs">
														{item.operators.map(operator => (
															<div key={`${operator.operator}-${operator.language}`} className="sms-gateway-item__operator flex justify-between" style={{ border: 0, borderRadius: token.borderRadius, background: token.colorBgContainer, color: token.colorText, padding: `${token.paddingXS}px ${token.paddingSM}px` }}>
																<span>{operatorLabel(operator, t)}</span>
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
	);

	return (
		<>
			{inline
				? <div className="sms-gateway-import-inline">{content}</div>
				: (
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
								{t("performance.smsGatewayImport.modalTitle")}
							</span>
						)}
					>
						{content}
					</Modal>
				)}
			<Modal open={!!successSummary} className="sms-gateway-success-modal" closable={false} footer={null} onCancel={close} width={460} centered>
				<div className="text-center py-5" dir="rtl">
					<CheckCircleOutlined className="sms-gateway-success-icon text-5xl" />
					<h3 className="mt-5 mb-1 text-lg font-bold">{t("performance.smsGatewayImport.successTitle")}</h3>
					<p className="mb-5 text-sm opacity-70">{t("performance.smsGatewayImport.successSummary")}</p>
					<div className="space-y-2 text-right">
						{successRows.map(key => (
							<div key={key} className="sms-gateway-success-row flex items-center justify-between rounded-lg px-3 py-2 text-sm">
								<span>{t(`performance.smsGatewayImport.summary.${key}`)}</span>
								<b>{formatNumber(successSummary?.[key] ?? 0)}</b>
							</div>
						))}
					</div>
					<Button className="mt-5" type="primary" onClick={close}>{t("performance.smsGatewayImport.ok")}</Button>
				</div>
			</Modal>
		</>
	);
}
