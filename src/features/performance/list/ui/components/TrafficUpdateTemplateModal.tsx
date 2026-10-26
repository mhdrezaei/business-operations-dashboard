import type { TrafficExcelUpdateResponse } from "#src/features/performance/api/performances.api";
import type { UploadProps } from "antd";
import {
	downloadTrafficUpdateTemplate,
	updateTrafficExcelImport,
} from "#src/features/performance/api/performances.api";
import { buildMonthsByYearMap } from "#src/features/performance/shared/model/performance.helpers";
import { performanceGapsQuery } from "#src/features/performance/shared/queries/performance.queries";
import { MONTH_OPTIONS } from "#src/features/performance/shared/ui/form/constants/jalali-date-options";
import { TrafficExcelResult, UploadStatCard } from "#src/features/performance/shared/ui/traffic-excel-result";
import { SectionCard } from "#src/shared/ui/section-card";
import { downloadBlob } from "#src/utils/download-blob";
import { CloudUploadOutlined, DownloadOutlined, InboxOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Modal, Select, Upload } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "#src/shared/ui/form-layout/styles.css";
import "#src/features/performance/shared/ui/form/performance-form.css";

function getMonthLabel(month: number) {
	const found = MONTH_OPTIONS.find(option => option.value === month);
	return found?.label ?? String(month);
}

export interface TrafficUpdateTemplateModalProps {
	open: boolean
	serviceId: number | null
	companyTypeOptions: Array<{ label: string, value: string }>
	onClose?: () => void
	onUploaded?: () => void
	embedded?: boolean
}

export function TrafficUpdateTemplateModal({
	open,
	serviceId,
	companyTypeOptions,
	onClose,
	onUploaded,
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
			onUploaded?.();
		}
		finally {
			setUploading(false);
		}
	}

	if (!open)
		return null;

	const content = uploadResult
		? (
			<TrafficExcelResult
				rejected_by_reason={uploadResult.rejected_by_reason}
				rejected_items={uploadResult.rejected_items}
				onConfirm={resetState}
			>
				<UploadStatCard label={t("performance.traffic.editTemplate.totalRows")} value={uploadResult.total_rows_in_file} />
				<UploadStatCard label={t("performance.traffic.editTemplate.filledRows")} value={uploadResult.filled_rows} />
				<UploadStatCard label={t("performance.traffic.editTemplate.updated")} value={uploadResult.updated} />
				<UploadStatCard label={t("performance.traffic.editTemplate.skippedEmpty")} value={uploadResult.skipped_empty ?? 0} />
				<UploadStatCard label={t("performance.traffic.editTemplate.rejected")} value={uploadResult.rejected} danger />
			</TrafficExcelResult>
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
							<div className="performance-traffic-step__title">{t("performance.traffic.editTemplate.stepDownload")}</div>
						</div>
						<Button icon={<DownloadOutlined />} disabled={!canDownload} loading={downloading} onClick={() => void handleDownload()}>
							{t("performance.traffic.editTemplate.download")}
						</Button>
					</div>

					<div className="performance-traffic-step performance-traffic-step--upload">
						<div className="performance-traffic-step__number">۲</div>
						<div className="performance-traffic-step__content">
							<div className="performance-traffic-step__title">{t("performance.traffic.editTemplate.stepUpload")}</div>
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
							<div className="performance-traffic-step__title">{t("performance.traffic.editTemplate.stepImport")}</div>
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
			<SectionCard title={t("performance.traffic.editTemplate.bulkTitle")} tone="traffic" defaultExpanded>
				{content}
			</SectionCard>
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
