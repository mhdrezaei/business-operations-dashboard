import type { TrafficExcelUpdateResponse } from "#src/features/performance/api/performances.api";
import type { UploadProps } from "antd";
import { ContractFormSection } from "#src/features/contract/shared/ui/form/components/ContractFormSection";
import {
	downloadTrafficUpdateTemplate,
	updateTrafficExcelImport,
} from "#src/features/performance/api/performances.api";
import { buildMonthsByYearMap } from "#src/features/performance/shared/model/performance.helpers";
import { performanceGapsQuery } from "#src/features/performance/shared/queries/performance.queries";
import { MONTH_OPTIONS } from "#src/features/performance/shared/ui/form/constants/jalali-date-options";
import { CloudUploadOutlined, DownloadOutlined, InboxOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Modal, Select, Upload } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "#src/features/contract/shared/ui/form/contract-form.css";
import "#src/features/performance/shared/ui/form/performance-form.css";

function getMonthLabel(month: number) {
	const found = MONTH_OPTIONS.find(option => option.value === month);
	return found?.label ?? String(month);
}

function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}

function UploadStatCard({
	label,
	value,
	danger,
}: {
	label: string
	value: number
	danger?: boolean
}) {
	return (
		<div className="flex items-center justify-between gap-4 rounded-[14px] border border-[rgba(255,255,255,0.12)] px-4 py-3">
			<span className="opacity-[0.88]">{label}</span>
			<strong className={danger ? "text-[#ff7875]" : undefined}>{value.toLocaleString("fa-IR")}</strong>
		</div>
	);
}

function UploadRejectedRow({
	item,
	index,
}: {
	item: TrafficExcelUpdateResponse["rejected_items"][number]
	index: number
}) {
	return (
		<div
			className={index === 0
				? "grid grid-cols-[140px_minmax(0,1fr)_minmax(220px,1.2fr)] items-center gap-3 px-[18px] py-[14px]"
				: "grid grid-cols-[140px_minmax(0,1fr)_minmax(220px,1.2fr)] items-center gap-3 border-t border-t-[rgba(255,255,255,0.08)] px-[18px] py-[14px]"}
		>
			<div>{item.row_no}</div>
			<div>{item.company_name || "-"}</div>
			<div className="text-[#ff7875]">{item.reason}</div>
		</div>
	);
}

export interface TrafficUpdateTemplateModalProps {
	open: boolean
	serviceId: number | null
	companyTypeOptions: Array<{ label: string, value: string }>
	onClose?: () => void
	embedded?: boolean
}

export function TrafficUpdateTemplateModal({
	open,
	serviceId,
	companyTypeOptions,
	onClose,
	embedded = false,
}: TrafficUpdateTemplateModalProps) {
	const { t } = useTranslation();

	const [companyType, setCompanyType] = useState<string | null>(null);
	const [year, setYear] = useState<number | null>(null);
	const [month, setMonth] = useState<number | null>(null);
	const [fileList, setFileList] = useState<UploadProps["fileList"]>([]);
	const [downloading, setDownloading] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [uploadResult, setUploadResult] = useState<TrafficExcelUpdateResponse | null>(null);

	const rejectionReasons = useMemo(
		() => Object.entries(uploadResult?.rejected_by_reason ?? {}),
		[uploadResult],
	);

	const gaps = useQuery(performanceGapsQuery({
		serviceId: open ? serviceId : null,
		companyId: null,
		companyType: open ? companyType : null,
	}));

	const performanceMonthsByYear = useMemo(
		() => buildMonthsByYearMap(gaps.data?.performance_months_by_year),
		[gaps.data],
	);

	const yearOptions = useMemo(
		() => Array.from(performanceMonthsByYear.keys())
			.sort((a, b) => a - b)
			.map(value => ({ label: String(value), value })),
		[performanceMonthsByYear],
	);

	const monthOptions = useMemo(() => {
		if (year == null)
			return [];
		return (performanceMonthsByYear.get(year) ?? [])
			.map(value => ({ label: getMonthLabel(value), value }));
	}, [performanceMonthsByYear, year]);

	const isDateOptionsLoading = !!companyType && (gaps.isLoading || gaps.isFetching);

	function handleCompanyTypeChange(value: string | null) {
		setCompanyType(value ?? null);
		// Reset the period selection because valid periods differ per company type.
		setYear(null);
		setMonth(null);
	}

	function handleYearChange(value: number | null) {
		setYear(value ?? null);
		setMonth(null);
	}

	// Drop the selected period if it is no longer valid once gaps data updates.
	useEffect(() => {
		if (year != null && !performanceMonthsByYear.has(year)) {
			// eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
			setYear(null);
			// eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
			setMonth(null);
		}
	}, [performanceMonthsByYear, year]);

	const canDownload = !!serviceId && !!companyType && !!year && !!month;
	const canUpload = canDownload && Array.isArray(fileList) && fileList.length > 0;

	const uploadProps: Omit<UploadProps, "fileList" | "onChange"> = {
		beforeUpload: () => false,
		maxCount: 1,
		accept: ".xlsx,.xls",
	};

	function resetState() {
		setCompanyType(null);
		setYear(null);
		setMonth(null);
		setFileList([]);
		setUploadResult(null);
		setDownloading(false);
		setUploading(false);
	}

	function handleClose() {
		resetState();
		onClose?.();
	}

	async function handleDownload() {
		if (!canDownload || !serviceId || !companyType || !year || !month)
			return;

		setDownloading(true);
		try {
			const blob = await downloadTrafficUpdateTemplate({
				serviceId,
				sh_year: year,
				sh_month: month,
				company_type: companyType,
			});
			downloadBlob(blob, `traffic_update_template_${companyType}_${year}_${month}.xlsx`);
		}
		finally {
			setDownloading(false);
		}
	}

	async function handleUpload() {
		if (!canUpload || !serviceId || !companyType || !year || !month)
			return;

		const file = fileList?.[0]?.originFileObj;
		if (!file)
			return;

		setUploading(true);
		try {
			const result = await updateTrafficExcelImport({
				serviceId,
				file,
				searchParams: {
					sh_year: year,
					sh_month: month,
					company_type: companyType,
				},
				suppressErrorNotification: true,
			});
			setUploadResult(result);
		}
		finally {
			setUploading(false);
		}
	}

	if (!open)
		return null;

	const content = uploadResult
		? (
			<div className="traffic-update-template-result">
				<div className="traffic-update-template-result__icon"><InfoCircleOutlined /></div>
				<div className="traffic-update-template-stats">
					<UploadStatCard label="کل ردیف‌ها" value={uploadResult.total_rows_in_file} />
					<UploadStatCard label="ردیف‌های پر شده" value={uploadResult.filled_rows} />
					<UploadStatCard label="ویرایش شده" value={uploadResult.updated} />
					<UploadStatCard label="رد شده" value={uploadResult.rejected} danger />
				</div>
				<div className="grid gap-2.5">
					<div className="font-bold">دلایل رد</div>
					<div className="grid gap-2">
						{rejectionReasons.length > 0
							? rejectionReasons.map(([reason, count]) => (
								<div key={reason} className="traffic-update-template-result__row">
									<span>{reason}</span>
									<strong>{count.toLocaleString("fa-IR")}</strong>
								</div>
							))
							: <div className="traffic-update-template-result__row">موردی برای نمایش وجود ندارد.</div>}
					</div>
				</div>
				<div className="grid gap-2.5">
					<div className="font-bold">ردیف‌های رد شده</div>
					<div className="traffic-update-template-rejections">
						<div className="traffic-update-template-rejections__header">
							<div>ردیف</div>
							<div>نام شرکت</div>
							<div>دلیل</div>
						</div>
						{uploadResult.rejected_items.length > 0
							? uploadResult.rejected_items.map((item, index) => (
								// eslint-disable-next-line react/no-array-index-key
								<UploadRejectedRow key={`${item.row_no}-${index}`} item={item} index={index} />
							))
							: <div className="p-[18px] opacity-80">ردیفی رد نشده است.</div>}
					</div>
				</div>
				<div className="flex justify-end">
					<Button type="primary" onClick={resetState}>{t("common.confirm")}</Button>
				</div>
			</div>
		)
		: (
			<div className="traffic-update-template-editor">
				<div className="traffic-update-template-hint">{t("performance.traffic.editTemplate.hint")}</div>
				<div className="traffic-update-template-period">
					<label className="performance-edit-filter">
						<span>{t("performance.columns.companyType")}</span>
						<Select
							allowClear
							placeholder={t("performance.placeholders.selectCompanyType")}
							value={companyType ?? undefined}
							onChange={value => handleCompanyTypeChange(value ?? null)}
							options={companyTypeOptions}
						/>
					</label>
					<label className="performance-edit-filter">
						<span>{t("performance.columns.year")}</span>
						<Select
							allowClear
							loading={isDateOptionsLoading}
							disabled={!companyType}
							placeholder={t("performance.placeholders.year")}
							value={year ?? undefined}
							onChange={value => handleYearChange(value ?? null)}
							options={yearOptions}
						/>
					</label>
					<label className="performance-edit-filter">
						<span>{t("performance.columns.month")}</span>
						<Select
							allowClear
							loading={isDateOptionsLoading}
							disabled={year == null}
							placeholder={year == null ? t("performance.placeholders.selectYearFirst") : t("performance.placeholders.month")}
							value={month ?? undefined}
							onChange={value => setMonth(value ?? null)}
							options={monthOptions}
						/>
					</label>
				</div>

				<div className="performance-traffic-steps">
					<div className="performance-traffic-step">
						<div className="performance-traffic-step__number">۱</div>
						<div className="performance-traffic-step__content">
							<div className="performance-traffic-step__title">دانلود فایل تمپلیت عملکرد ماهیانه</div>
						</div>
						<Button icon={<DownloadOutlined />} disabled={!canDownload} loading={downloading} onClick={() => void handleDownload()}>
							{t("performance.traffic.editTemplate.download")}
						</Button>
					</div>

					<div className="performance-traffic-step performance-traffic-step--upload">
						<div className="performance-traffic-step__number">۲</div>
						<div className="performance-traffic-step__content">
							<div className="performance-traffic-step__title">آپلود فایل اکسل عملکرد ترافیک</div>
						</div>
						<div className="performance-traffic-step__dropzone">
							<Upload.Dragger {...uploadProps} fileList={fileList ?? []} onChange={info => setFileList(info.fileList.slice(-1))}>
								<p className="performance-traffic-upload__icon"><InboxOutlined /></p>
								<p className="performance-traffic-upload__title">{t("performance.labels.selectOrDropExcel")}</p>
								<p className="performance-traffic-upload__hint">{t("performance.labels.allowedFormatsXls")}</p>
							</Upload.Dragger>
						</div>
					</div>

					<div className="performance-traffic-step">
						<div className="performance-traffic-step__number">۳</div>
						<div className="performance-traffic-step__content">
							<div className="performance-traffic-step__title">ایمپورت مقادیر فایل اکسل برای عملکرد</div>
						</div>
						<Button type="primary" icon={<CloudUploadOutlined />} disabled={!canUpload} loading={uploading} onClick={() => void handleUpload()}>
							{t("performance.traffic.editTemplate.upload")}
						</Button>
					</div>
				</div>
			</div>
		);

	if (embedded) {
		return (
			<ContractFormSection title="ویرایش گروهی عملکرد ترافیک" tone="traffic" defaultExpanded={false}>
				{content}
			</ContractFormSection>
		);
	}

	return (
		<Modal
			open
			onCancel={handleClose}
			footer={null}
			width={920}
			destroyOnHidden
			title={uploadResult ? t("performance.traffic.editTemplate.resultTitle") : t("performance.traffic.editTemplate.modalTitle")}
		>
			{content}
		</Modal>
	);
}
