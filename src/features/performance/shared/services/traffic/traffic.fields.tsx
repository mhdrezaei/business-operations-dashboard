import type { TrafficExcelImportResponse } from "#src/features/performance/api/performances.api";
import type { UploadProps } from "antd";
import type { PerformanceFormValues } from "../../model/performance.form.types";
import { TopRightAlert } from "#src/components";
import { downloadPerformanceTemplate, uploadTrafficExcelImport } from "#src/features/performance/api/performances.api";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { CloudUploadOutlined, DeleteOutlined, DownloadOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { Button, Col, Form, Modal, Row, Tag, theme, Upload } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

const sf = (path: string) => `serviceFields.${path}` as const;

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
	item: TrafficExcelImportResponse["rejected_items"][number]
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

export function TrafficPerformanceFields() {
	const { t } = useTranslation();
	const { token } = theme.useToken();
	const { control, setValue, getValues, trigger, reset } = useFormContext<PerformanceFormValues>();
	const [downloading, setDownloading] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [uploadResult, setUploadResult] = useState<TrafficExcelImportResponse | null>(null);

	const year = useWatch({ control, name: "year" });
	const month = useWatch({ control, name: "month" });
	const companyType = useWatch({ control, name: "trafficCompanyType" });
	const submitMode = useWatch({ control, name: sf("submitMode") as any }) as "template" | "single" | undefined;
	const countyEnabled = useWatch({ control, name: sf("countyEnabled") as any }) as boolean | undefined;
	const monthlyPerformanceFile = useWatch({ control, name: sf("monthlyPerformanceFile") as any }) as UploadProps["fileList"] | undefined;

	const canDownloadTemplate = !!companyType && !!year && !!month;
	const canUploadTemplate = canDownloadTemplate && Array.isArray(monthlyPerformanceFile) && monthlyPerformanceFile.length > 0;
	const rejectionReasons = useMemo(
		() => Object.entries(uploadResult?.rejected_by_reason ?? {}),
		[uploadResult],
	);
	const cardTitle = (submitMode ?? "template") === "template"
		? t("performance.traffic.excelTitle")
		: t("performance.traffic.singleEntry");

	const uploadProps: Omit<UploadProps, "fileList" | "onChange"> = {
		beforeUpload: () => false,
		maxCount: 1,
		accept: ".xlsx,.xls",
	};

	useEffect(() => {
		if (!countyEnabled) {
			setValue(sf("countyValue") as any, null, { shouldDirty: false, shouldValidate: false });
			setValue(sf("countyValueReceive") as any, null, { shouldDirty: false, shouldValidate: false });
		}
	}, [countyEnabled, setValue]);

	async function handleTemplateUpload() {
		const isValid = await trigger([
			"trafficCompanyType",
			"year",
			"month",
			sf("monthlyPerformanceFile") as any,
		]);
		if (!isValid)
			return;

		const selectedFileList = getValues(sf("monthlyPerformanceFile") as any) as UploadProps["fileList"] | undefined;
		const file = selectedFileList?.[0]?.originFileObj;
		if (!file || !companyType || !year || !month)
			return;

		setUploading(true);
		try {
			const result = await uploadTrafficExcelImport({
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

	function handleCloseUploadResult() {
		setUploadResult(null);
		reset({
			serviceId: null,
			serviceCode: null,
			companyId: null,
			trafficCompanyType: null,
			salesAgentId: null,
			year: null,
			month: null,
			contractId: null,
			contractModel: null,
			serviceFields: {},
		});
	}

	return (
		<>
			<ProCard
				bordered
				headerBordered
				className="rounded-lg"
				title={cardTitle}
			>
				<div className="flex gap-2 flex-wrap mb-3">
					<Tag color="blue">{`${t("performance.columns.companyType")}: ${companyType ?? "-"}`}</Tag>
					<Tag color="blue">{`${t("performance.columns.year")}: ${year ?? "-"}`}</Tag>
					<Tag color="blue">{`${t("performance.columns.month")}: ${month ?? "-"}`}</Tag>
				</div>

				{(submitMode ?? "template") === "template"
					? (
						<div
							className="grid grid-cols-[320px_1fr] gap-3 items-start"
						>
							<div className="grid gap-2.5">
								<Button
									icon={<DownloadOutlined />}
									disabled={!canDownloadTemplate}
									loading={downloading}
									onClick={async () => {
										if (!canDownloadTemplate)
											return;

										setDownloading(true);
										try {
											const blob = await downloadPerformanceTemplate("traffic", {
												company_type: companyType,
												sh_year: year!,
												sh_month: month!,
											});
											downloadBlob(blob, `traffic-template-${companyType}-${year}-${month}.xlsx`);
										}
										finally {
											setDownloading(false);
										}
									}}
								>
									{t("performance.traffic.downloadTemplate")}
								</Button>

								<Button
									type="primary"
									icon={<CloudUploadOutlined />}
									disabled={!canUploadTemplate}
									loading={uploading}
									onClick={() => void handleTemplateUpload()}
								>
									{t("performance.traffic.templateUpload")}
								</Button>

								<div className="opacity-80 text-xs leading-[1.8]">
									{t("performance.traffic.preUploadHint")}
								</div>
							</div>

							<Controller
								name={sf("monthlyPerformanceFile") as any}
								control={control}
								render={({ field, fieldState, formState }) => (
									<Form.Item
										help={(formState.isSubmitted || fieldState.isTouched)
											? fieldState.error?.message
											: undefined}
										validateStatus={(formState.isSubmitted || fieldState.isTouched) && fieldState.error?.message
											? "error"
											: undefined}
									>
										<Upload.Dragger
											{...uploadProps}
											fileList={field.value ?? []}
											onChange={info => field.onChange(info.fileList.slice(-1))}
										>
											<p className="m-0 text-lg">{t("performance.labels.selectOrDropExcel")}</p>
											<p className="m-0 mt-2">{t("performance.labels.allowedFormatsXls")}</p>
										</Upload.Dragger>
									</Form.Item>
								)}
							/>
						</div>
					)
					: (
						<div className="grid gap-3">
							<TopRightAlert
								alertKey="traffic-performance-unit-price-hint"
								type="info"
								message={t("performance.traffic.unitPriceHint")}
							/>

							<ProCard bordered title={t("performance.traffic.tehranPerformance")} className="rounded-[10px]">
								<Row gutter={16}>
									<Col span={12}>
										<RHFProNumber
											name={sf("tehranValue") as any}
											label={t("performance.fields.traffic.tehranValue")}
											inputProps={{ placeholder: t("performance.placeholders.example100") }}
										/>
									</Col>
									<Col span={12}>
										<RHFProNumber
											name={sf("tehranValueReceive") as any}
											label={t("performance.fields.traffic.tehranValueReceive")}
											inputProps={{ placeholder: t("performance.placeholders.example10000") }}
										/>
									</Col>
								</Row>
							</ProCard>

							{countyEnabled
								? (
									<ProCard
										bordered
										title={t("performance.traffic.countyPerformance")}
										className="rounded-[10px]"
										extra={(
											<Button
												size="small"
												danger
												icon={<DeleteOutlined />}
												onClick={() =>
													setValue(sf("countyEnabled") as any, false, {
														shouldDirty: true,
														shouldValidate: false,
													})}
											>
												{t("common.delete")}
											</Button>
										)}
									>
										<Row gutter={16}>
											<Col span={12}>
												<RHFProNumber
													name={sf("countyValue") as any}
													label={t("performance.fields.traffic.countyValue")}
													inputProps={{ placeholder: t("performance.placeholders.example100") }}
												/>
											</Col>
											<Col span={12}>
												<RHFProNumber
													name={sf("countyValueReceive") as any}
													label={t("performance.fields.traffic.countyValueReceive")}
													inputProps={{ placeholder: t("performance.placeholders.example10000") }}
												/>
											</Col>
										</Row>
									</ProCard>
								)
								: null}
						</div>
					)}
			</ProCard>
			<Modal
				open={!!uploadResult}
				onCancel={handleCloseUploadResult}
				footer={null}
				centered
				width={980}
				destroyOnClose
				styles={{
					content: {
						background: token.colorBgContainer,
						border: `1px solid ${token.colorBorderSecondary}`,
						boxShadow: token.boxShadowSecondary,
					},
					header: {
						background: token.colorBgContainer,
						borderBottom: "none",
					},
					body: {
						paddingTop: 8,
					},
				}}
			>
				{uploadResult
					? (
						<div className="grid gap-5">
							<div className="grid justify-items-center gap-3">
								<div
									className="grid h-[84px] w-[84px] place-items-center rounded-full border-4 border-[#40c4ff] text-[40px] text-[#40c4ff]"
								>
									<InfoCircleOutlined />
								</div>
								<div className="text-center">
									<div className="text-[34px] font-extrabold">نتیجه آپلود فایل ترافیک</div>
								</div>
							</div>

							<div
								className="grid grid-cols-4 gap-2.5"
							>
								<UploadStatCard label="کل ردیف‌ها" value={uploadResult.total_rows_in_file} />
								<UploadStatCard label="ردیف‌های پر شده" value={uploadResult.filled_rows} />
								<UploadStatCard label="ایجاد شده" value={uploadResult.created} />
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
											<div
												className="rounded-xl border border-[rgba(255,255,255,0.12)] px-4 py-3"
											>
												موردی برای نمایش وجود ندارد.
											</div>
										)}
								</div>
							</div>

							<div className="grid gap-2.5">
								<div className="font-bold">ردیف‌های رد شده</div>
								<div
									className="overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.12)]"
								>
									<div
										className="grid grid-cols-[140px_minmax(0,1fr)_minmax(220px,1.2fr)] gap-3 bg-[rgba(255,255,255,0.06)] px-[18px] py-4 font-bold"
									>
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

							<div className="flex justify-center">
								<Button type="primary" size="large" onClick={handleCloseUploadResult}>
									باشه
								</Button>
							</div>
						</div>
					)
					: null}
			</Modal>
		</>
	);
}
