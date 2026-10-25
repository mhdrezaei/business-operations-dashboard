import type { TrafficExcelImportResponse } from "#src/features/performance/api/performances.api";
import type { UploadProps } from "antd";
import type { PerformanceFormValues } from "../../model/performance.form.types";
import { downloadPerformanceTemplate, uploadTrafficExcelImport } from "#src/features/performance/api/performances.api";
import { TrafficExcelResult, UploadStatCard } from "#src/features/performance/shared/ui/traffic-excel-result";
import { FieldCard } from "#src/shared/ui/dashed-card";
import { downloadBlob } from "#src/utils/download-blob";
import { CloudUploadOutlined, DeleteOutlined, DownloadOutlined, InboxOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Form, Modal, Upload } from "antd";
import { useEffect, useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { isCollocationCompanyType } from "./traffic-collocation";
import { TrafficCollocationFields } from "./TrafficCollocationFields";
import { TrafficMetricField } from "./TrafficMetricField";

const sf = (path: string) => `serviceFields.${path}` as const;

interface TrafficLocationCardProps {
	location: "tehran" | "county"
	enabled: boolean
	available: boolean
	unit: string | null
	isCp: boolean
	onToggle: (enabled: boolean) => void
}

function TrafficLocationCard({ location, enabled, available, unit, isCp, onToggle }: TrafficLocationCardProps) {
	const { t } = useTranslation();

	if (!available)
		return null;

	if (!enabled) {
		return (
			<Button type="dashed" block icon={<PlusOutlined />} onClick={() => onToggle(true)}>
				{t(`performance.traffic.${location}Add`)}
			</Button>
		);
	}

	return (
		<FieldCard
			title={t(`performance.traffic.${location}Performance`)}
			className="performance-traffic-location"
			extra={(
				<Button size="small" danger icon={<DeleteOutlined />} onClick={() => onToggle(false)}>
					{t("common.delete")}
				</Button>
			)}
		>
			{unit
				? (
					<div className="performance-traffic-location__unit">
						{`${t(`performance.traffic.${location}ContractUnit`)}: ${unit}`}
					</div>
				)
				: null}
			<div className="performance-traffic-location__fields">
				<TrafficMetricField name={sf(`${location}Value`)} label={t(`performance.fields.traffic.${location}Value`)} placeholder={t("performance.placeholders.example100")} decimal />
				<TrafficMetricField name={sf(`${location}ValueReceive`)} label={t(`performance.fields.traffic.${location}ValueReceive`)} placeholder={t("performance.placeholders.example10000")} decimal />
				{isCp ? <TrafficMetricField name={sf(`${location}ConversionRatio`)} label={t(`performance.fields.traffic.${location}ConversionRatio`)} placeholder={t("performance.placeholders.exampleConversionRatio")} decimal /> : null}
			</div>
		</FieldCard>
	);
}

export function TrafficPerformanceFields() {
	const { t } = useTranslation();
	const { control, setValue, getValues, trigger, reset } = useFormContext<PerformanceFormValues>();
	const [downloading, setDownloading] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [uploadResult, setUploadResult] = useState<TrafficExcelImportResponse | null>(null);

	const year = useWatch({ control, name: "year" });
	const month = useWatch({ control, name: "month" });
	const companyType = useWatch({ control, name: "companyType" });
	const submitMode = useWatch({ control, name: sf("submitMode") as any }) as "template" | "single" | undefined;
	const countyEnabled = useWatch({ control, name: sf("countyEnabled") as any }) as boolean | undefined;
	const tehranEnabled = (useWatch({ control, name: sf("tehranEnabled") as any }) as boolean | undefined) !== false;
	const hasCountyContract = useWatch({ control, name: sf("hasCountyContract") as any }) as boolean | undefined;
	const isCollocation = isCollocationCompanyType(companyType);
	const isCp = typeof companyType === "string" && companyType.toUpperCase() === "CP";
	const trafficLocationUnits = useWatch({ control, name: sf("trafficLocationUnits") as any }) as Record<string, string> | undefined;
	const tehranUnit = typeof trafficLocationUnits?.TEHRAN === "string" ? trafficLocationUnits.TEHRAN : null;
	const countyUnit = typeof trafficLocationUnits?.COUNTY === "string" ? trafficLocationUnits.COUNTY : null;
	const monthlyPerformanceFile = useWatch({ control, name: sf("monthlyPerformanceFile") as any }) as UploadProps["fileList"] | undefined;

	const canDownloadTemplate = !!companyType && !!year && !!month;
	const canUploadTemplate = canDownloadTemplate && Array.isArray(monthlyPerformanceFile) && monthlyPerformanceFile.length > 0;
	const uploadProps: Omit<UploadProps, "fileList" | "onChange"> = {
		beforeUpload: () => false,
		maxCount: 1,
		accept: ".xlsx,.xls",
	};

	useEffect(() => {
		if (!countyEnabled) {
			setValue(sf("countyValue") as any, null, { shouldDirty: false, shouldValidate: false });
			setValue(sf("countyValueReceive") as any, null, { shouldDirty: false, shouldValidate: false });
			setValue(sf("countyConversionRatio") as any, null, { shouldDirty: false, shouldValidate: false });
		}
	}, [countyEnabled, setValue]);

	useEffect(() => {
		if (!tehranEnabled) {
			setValue(sf("tehranValue") as any, null, { shouldDirty: false, shouldValidate: false });
			setValue(sf("tehranValueReceive") as any, null, { shouldDirty: false, shouldValidate: false });
			setValue(sf("tehranConversionRatio") as any, null, { shouldDirty: false, shouldValidate: false });
		}
	}, [tehranEnabled, setValue]);

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
									<div className="performance-traffic-step__title">{t("performance.traffic.stepDownload")}</div>
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
									<div className="performance-traffic-step__title">{t("performance.traffic.stepUpload")}</div>
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
									<div className="performance-traffic-step__title">{t("performance.traffic.stepImport")}</div>
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
					: isCollocation
						? <TrafficCollocationFields />
						: (
							<div className="performance-traffic-locations">
								{(["tehran", "county"] as const).map(location => (
									<TrafficLocationCard
										key={location}
										location={location}
										enabled={location === "tehran" ? tehranEnabled : countyEnabled === true}
										available={location === "tehran" || hasCountyContract === true}
										unit={location === "tehran" ? tehranUnit : countyUnit}
										isCp={isCp}
										onToggle={enabled => setValue(sf(`${location}Enabled`) as any, enabled, { shouldDirty: true, shouldValidate: false })}
									/>
								))}
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
				title={t("performance.traffic.editTemplate.resultTitle")}
			>
				{uploadResult
					? (
						<TrafficExcelResult
							rejected_by_reason={uploadResult.rejected_by_reason}
							rejected_items={uploadResult.rejected_items}
							onConfirm={handleCloseUploadResult}
						>
							<UploadStatCard label={t("performance.traffic.editTemplate.totalRows")} value={uploadResult.total_rows_in_file} />
							<UploadStatCard label={t("performance.traffic.editTemplate.filledRows")} value={uploadResult.filled_rows} />
							<UploadStatCard label={t("performance.traffic.created")} value={uploadResult.created} />
							<UploadStatCard label={t("performance.traffic.editTemplate.rejected")} value={uploadResult.rejected} danger />
						</TrafficExcelResult>
					)
					: null}
			</Modal>
		</>
	);
}
