import type { TrafficExcelUpdateResponse } from "#src/features/performance/api/performances.api";
import type { UploadProps } from "antd";
import {
	downloadTrafficUpdateTemplate,
	updateTrafficExcelImport,
} from "#src/features/performance/api/performances.api";
import { buildMonthsByYearMap } from "#src/features/performance/shared/model/performance.helpers";
import { performanceGapsQuery } from "#src/features/performance/shared/queries/performance.queries";
import { MONTH_OPTIONS } from "#src/features/performance/shared/ui/form/constants/jalali-date-options";
import { CloudUploadOutlined, DownloadOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Col, Modal, Row, Select, Upload } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

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
	onClose: () => void
}

export function TrafficUpdateTemplateModal({
	open,
	serviceId,
	companyTypeOptions,
	onClose,
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
		onClose();
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

	return (
		<Modal
			open={open}
			onCancel={handleClose}
			footer={null}
			width={920}
			destroyOnHidden
			title={uploadResult
				? t("performance.traffic.editTemplate.resultTitle")
				: t("performance.traffic.editTemplate.modalTitle")}
		>
			{uploadResult
				? (
					<>
						<Card>
							<div className="grid gap-5">
								<div className="grid justify-items-center gap-3">
									<div className="grid h-[72px] w-[72px] place-items-center rounded-full border-4 border-[#40c4ff] text-[34px] text-[#40c4ff]">
										<InfoCircleOutlined />
									</div>
								</div>

								<div className="grid grid-cols-4 gap-2.5">
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
												<div
													key={reason}
													className="flex justify-between gap-4 rounded-xl border border-[rgba(255,255,255,0.12)] px-4 py-3"
												>
													<span>{reason}</span>
													<strong>{count.toLocaleString("fa-IR")}</strong>
												</div>
											))
											: (
												<div className="rounded-xl border border-[rgba(255,255,255,0.12)] px-4 py-3">
													موردی برای نمایش وجود ندارد.
												</div>
											)}
									</div>
								</div>

								<div className="grid gap-2.5">
									<div className="font-bold">ردیف‌های رد شده</div>
									<div className="overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.12)]">
										<div className="grid grid-cols-[140px_minmax(0,1fr)_minmax(220px,1.2fr)] gap-3 bg-[rgba(255,255,255,0.06)] px-[18px] py-4 font-bold">
											<div>ردیف</div>
											<div>نام شرکت</div>
											<div>دلیل</div>
										</div>

										{uploadResult.rejected_items.length > 0
											? uploadResult.rejected_items.map((item, index) => (
												// eslint-disable-next-line react/no-array-index-key
												<UploadRejectedRow key={`${item.row_no}-${index}`} item={item} index={index} />
											))
											: (
												<div className="p-[18px] opacity-80">
													ردیفی رد نشده است.
												</div>
											)}
									</div>
								</div>
							</div>
						</Card>

						<div className="flex justify-end mt-2 gap-2">
							<Button type="primary" onClick={handleClose}>
								{t("common.confirm")}
							</Button>
						</div>
					</>
				)
				: (
					<>
						<Card>
							<div className="grid gap-4">
								<div className="opacity-80 text-xs leading-[1.8]">
									{t("performance.traffic.editTemplate.hint")}
								</div>

								<Row gutter={[16, 16]}>
									<Col span={8}>
										<div className="mb-1 text-sm opacity-80">{t("performance.columns.companyType")}</div>
										<Select
											className="w-full"
											allowClear
											placeholder={t("performance.placeholders.select")}
											value={companyType ?? undefined}
											onChange={value => handleCompanyTypeChange(value ?? null)}
											options={companyTypeOptions}
										/>
									</Col>
									<Col span={8}>
										<div className="mb-1 text-sm opacity-80">{t("performance.columns.year")}</div>
										<Select
											className="w-full"
											allowClear
											loading={isDateOptionsLoading}
											disabled={!companyType}
											placeholder={t("performance.placeholders.year")}
											value={year ?? undefined}
											onChange={value => handleYearChange(value ?? null)}
											options={yearOptions}
										/>
									</Col>
									<Col span={8}>
										<div className="mb-1 text-sm opacity-80">{t("performance.columns.month")}</div>
										<Select
											className="w-full"
											allowClear
											loading={isDateOptionsLoading}
											disabled={year == null}
											placeholder={year == null
												? t("performance.placeholders.selectYearFirst")
												: t("performance.placeholders.month")}
											value={month ?? undefined}
											onChange={value => setMonth(value ?? null)}
											options={monthOptions}
										/>
									</Col>
								</Row>

								<Upload.Dragger
									{...uploadProps}
									fileList={fileList ?? []}
									onChange={info => setFileList(info.fileList.slice(-1))}
								>
									<p className="m-0 text-lg">{t("performance.labels.selectOrDropExcel")}</p>
									<p className="m-0 mt-2">{t("performance.labels.allowedFormatsXls")}</p>
								</Upload.Dragger>
							</div>
						</Card>

						<div className="flex justify-end mt-2 gap-2">
							<Button onClick={handleClose}>{t("common.cancel")}</Button>
							<Button
								icon={<DownloadOutlined />}
								disabled={!canDownload}
								loading={downloading}
								onClick={() => void handleDownload()}
							>
								{t("performance.traffic.editTemplate.download")}
							</Button>
							<Button
								type="primary"
								icon={<CloudUploadOutlined />}
								disabled={!canUpload}
								loading={uploading}
								onClick={() => void handleUpload()}
							>
								{t("performance.traffic.editTemplate.upload")}
							</Button>
						</div>
					</>
				)}
		</Modal>
	);
}
