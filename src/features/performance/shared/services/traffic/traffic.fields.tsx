import type { TrafficExcelImportResponse } from "#src/features/performance/api/performances.api";
import type { UploadProps } from "antd";
import type { PerformanceFormValues } from "../../model/performance.form.types";
import { downloadPerformanceTemplate, uploadTrafficExcelImport } from "#src/features/performance/api/performances.api";
import { PerformanceFieldCard } from "#src/features/performance/shared/ui/form/components/PerformanceFieldCard";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { CloudUploadOutlined, DeleteOutlined, DownloadOutlined, InboxOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { Button, Form, Modal, theme, Upload } from "antd";
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

interface TrafficMetricFieldProps {
	name: string
	label: string
	placeholder: string
	decimal?: boolean
}

function TrafficMetricField({ name, label, placeholder, decimal }: TrafficMetricFieldProps) {
	const inputId = `performance-traffic-${name}`;

	return (
		<div className="performance-traffic-location__field">
			<label className="performance-traffic-location__label" htmlFor={inputId}>{label}</label>
			<RHFProNumber<PerformanceFormValues, any>
				name={sf(name) as any}
				label=""
				inputProps={{
					"id": inputId,
					"placeholder": placeholder,
					"aria-label": label,
				}}
				formItemProps={{ className: "mb-0" }}
				decimal={decimal}
				enableGrouping={!decimal}
				enableWordsTooltip={!decimal}
			/>
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
	const companyType = useWatch({ control, name: "companyType" });
	const submitMode = useWatch({ control, name: sf("submitMode") as any }) as "template" | "single" | undefined;
	const countyEnabled = useWatch({ control, name: sf("countyEnabled") as any }) as boolean | undefined;
	const isCp = typeof companyType === "string" && companyType.toUpperCase() === "CP";
	const trafficLocationUnits = useWatch({ control, name: sf("trafficLocationUnits") as any }) as Record<string, string> | undefined;
	const tehranUnit = typeof trafficLocationUnits?.TEHRAN === "string" ? trafficLocationUnits.TEHRAN : null;
	const countyUnit = typeof trafficLocationUnits?.COUNTY === "string" ? trafficLocationUnits.COUNTY : null;
	const isUnitVisible = typeof companyType === "string" && ["CP", "PREMIUM", "IXP", "TCI"].includes(companyType.toUpperCase());
	const monthlyPerformanceFile = useWatch({ control, name: sf("monthlyPerformanceFile") as any }) as UploadProps["fileList"] | undefined;

	const canDownloadTemplate = !!companyType && !!year && !!month;
	const canUploadTemplate = canDownloadTemplate && Array.isArray(monthlyPerformanceFile) && monthlyPerformanceFile.length > 0;
	const rejectionReasons = useMemo(
		() => Object.entries(uploadResult?.rejected_by_reason ?? {}),
		[uploadResult],
	);
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
			"companyType",
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
			companyType: null,
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
			<div className="performance-field-group">
				{(submitMode ?? "template") === "template"
					? (
						<div className="performance-traffic-steps">
							<div className="performance-traffic-step">
								<div className="performance-traffic-step__number">۱</div>
								<div className="performance-traffic-step__content">
									<div className="performance-traffic-step__title">دانلود فایل تمپلیت</div>
								</div>
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
							</div>

							<div className="performance-traffic-step performance-traffic-step--upload">
								<div className="performance-traffic-step__number">۲</div>
								<div className="performance-traffic-step__content">
									<div className="performance-traffic-step__title">آپلود فایل عملکرد</div>
								</div>
								<Controller
									name={sf("monthlyPerformanceFile") as any}
									control={control}
									render={({ field, fieldState, formState }) => (
										<Form.Item
											help={(formState.isSubmitted || fieldState.isTouched) ? fieldState.error?.message : undefined}
											validateStatus={(formState.isSubmitted || fieldState.isTouched) && fieldState.error?.message ? "error" : undefined}
											className="performance-traffic-step__dropzone mb-0"
										>
											<Upload.Dragger
												{...uploadProps}
												fileList={field.value ?? []}
												onChange={info => field.onChange(info.fileList.slice(-1))}
											>
												<p className="performance-traffic-upload__icon">
													<InboxOutlined />
												</p>
												<p className="performance-traffic-upload__title">{t("performance.labels.selectOrDropExcel")}</p>
												<p className="performance-traffic-upload__hint">{t("performance.labels.allowedFormatsXls")}</p>
											</Upload.Dragger>
										</Form.Item>
									)}
								/>
							</div>

							<div className="performance-traffic-step">
								<div className="performance-traffic-step__number">۳</div>
								<div className="performance-traffic-step__content">
									<div className="performance-traffic-step__title">ایمپورت مقادیر</div>
								</div>
								<Button
									type="primary"
									icon={<CloudUploadOutlined />}
									disabled={!canUploadTemplate}
									loading={uploading}
									onClick={() => void handleTemplateUpload()}
								>
									{t("performance.traffic.templateUpload")}
								</Button>
							</div>
						</div>
					)
					: (
						<div className="performance-traffic-locations">
							<PerformanceFieldCard
								title={t("performance.traffic.tehranPerformance")}
								className="performance-traffic-location"
							>
								{isUnitVisible && tehranUnit
									? (
										<div className="performance-traffic-location__unit">
											{`${t("performance.traffic.tehranContractUnit")}: ${tehranUnit}`}
										</div>
									)
									: null}
								<div className="performance-traffic-location__fields">
									<TrafficMetricField name="tehranValue" label={t("performance.fields.traffic.tehranValue")} placeholder={t("performance.placeholders.example100")} />
									<TrafficMetricField name="tehranValueReceive" label={t("performance.fields.traffic.tehranValueReceive")} placeholder={t("performance.placeholders.example10000")} />
									{isCp ? <TrafficMetricField name="tehranConversionRatio" label={t("performance.fields.traffic.tehranConversionRatio")} placeholder="مثلاً 1.5" decimal /> : null}
								</div>
							</PerformanceFieldCard>
							{countyEnabled
								? (
									<PerformanceFieldCard
										title={t("performance.traffic.countyPerformance")}
										className="performance-traffic-location"
										headerExtra={(
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
										{isUnitVisible && countyUnit
											? (
												<div className="performance-traffic-location__unit">
													{`${t("performance.traffic.countyContractUnit")}: ${countyUnit}`}
												</div>
											)
											: null}
										<div className="performance-traffic-location__fields">
											<TrafficMetricField name="countyValue" label={t("performance.fields.traffic.countyValue")} placeholder={t("performance.placeholders.example100")} />
											<TrafficMetricField name="countyValueReceive" label={t("performance.fields.traffic.countyValueReceive")} placeholder={t("performance.placeholders.example10000")} />
											{isCp ? <TrafficMetricField name="countyConversionRatio" label={t("performance.fields.traffic.countyConversionRatio")} placeholder="مثلاً 1.5" decimal /> : null}
										</div>
									</PerformanceFieldCard>
								)
								: null}
						</div>
					)}
			</div>
			<Modal
				open={!!uploadResult}
				onCancel={handleCloseUploadResult}
				footer={null}
				centered
				width={980}
				destroyOnHidden
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
