import type { UploadProps } from "antd";
import type { PerformanceFormValues } from "../../model/performance.form.types";
import { downloadPerformanceTemplate } from "#src/features/performance/api/performances.api";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { DeleteOutlined, DownloadOutlined, PlusOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { Alert, Button, Col, Form, Radio, Row, Tag, Upload } from "antd";
import { useEffect, useState } from "react";
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

export function TrafficPerformanceFields() {
	const { t } = useTranslation();
	const { control, setValue } = useFormContext<PerformanceFormValues>();
	const [downloading, setDownloading] = useState(false);

	const year = useWatch({ control, name: "year" });
	const month = useWatch({ control, name: "month" });
	const companyType = useWatch({ control, name: "trafficCompanyType" });
	const submitMode = useWatch({ control, name: sf("submitMode") as any }) as "template" | "single" | undefined;
	const countyEnabled = useWatch({ control, name: sf("countyEnabled") as any }) as boolean | undefined;

	const canDownloadTemplate = !!companyType && !!year && !!month;

	const uploadProps: Omit<UploadProps, "fileList" | "onChange"> = {
		beforeUpload: () => false,
		maxCount: 1,
		accept: ".xlsx,.xls",
	};

	useEffect(() => {
		if (!submitMode) {
			setValue(sf("submitMode") as any, "template", {
				shouldDirty: false,
				shouldValidate: false,
			});
		}

		if (countyEnabled == null) {
			setValue(sf("countyEnabled") as any, true, {
				shouldDirty: false,
				shouldValidate: false,
			});
		}
	}, [submitMode, countyEnabled, setValue]);

	useEffect(() => {
		if (!countyEnabled) {
			setValue(sf("countyValue") as any, null, { shouldDirty: false, shouldValidate: false });
			setValue(sf("countyValueReceive") as any, null, { shouldDirty: false, shouldValidate: false });
		}
	}, [countyEnabled, setValue]);

	return (
		<ProCard
			bordered
			headerBordered
			style={{ borderRadius: 8 }}
			title={t("performance.traffic.excelTitle")}
		>
			<div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
				<Tag color="blue">{`${t("performance.columns.companyType")}: ${companyType ?? "-"}`}</Tag>
				<Tag color="blue">{`${t("performance.columns.year")}: ${year ?? "-"}`}</Tag>
				<Tag color="blue">{`${t("performance.columns.month")}: ${month ?? "-"}`}</Tag>
			</div>

			<Controller
				name={sf("submitMode") as any}
				control={control}
				render={({ field }) => (
					<Form.Item label={t("performance.traffic.submitMethod")}>
						<Radio.Group
							optionType="button"
							buttonStyle="solid"
							value={field.value ?? "template"}
							onChange={e => field.onChange(e.target.value)}
						>
							<Radio.Button value="template">{t("performance.traffic.templateUpload")}</Radio.Button>
							<Radio.Button value="single">{t("performance.traffic.singleEntry")}</Radio.Button>
						</Radio.Group>
					</Form.Item>
				)}
			/>

			{(submitMode ?? "template") === "template"
				? (
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "320px 1fr",
							gap: 12,
							alignItems: "start",
						}}
					>
						<div style={{ display: "grid", gap: 10 }}>
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

							<div style={{ opacity: 0.8, fontSize: 12, lineHeight: 1.8 }}>
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
										<p style={{ margin: 0, fontSize: 18 }}>{t("performance.labels.selectOrDropExcel")}</p>
										<p style={{ margin: 0, marginTop: 8 }}>{t("performance.labels.allowedFormatsXls")}</p>
									</Upload.Dragger>
								</Form.Item>
							)}
						/>
					</div>
				)
				: (
					<div style={{ display: "grid", gap: 12 }}>
						<Alert
							type="info"
							showIcon
							message={t("performance.traffic.unitPriceHint")}
						/>

						<ProCard bordered title={t("performance.traffic.tehranPerformance")} style={{ borderRadius: 10 }}>
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
									style={{ borderRadius: 10 }}
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
							: (
								<Button
									icon={<PlusOutlined />}
									onClick={() =>
										setValue(sf("countyEnabled") as any, true, {
											shouldDirty: true,
											shouldValidate: false,
										})}
								>
									{t("performance.traffic.addCountyPerformance")}
								</Button>
							)}
					</div>
				)}
		</ProCard>
	);
}
