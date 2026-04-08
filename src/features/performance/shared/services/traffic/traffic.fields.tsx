import type { UploadProps } from "antd";
import type { PerformanceFormValues } from "../../model/performance.form.types";
import { downloadPerformanceTemplate } from "#src/features/performance/api/performances.api";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { DeleteOutlined, DownloadOutlined, PlusOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { Alert, Button, Col, Form, Radio, Row, Tag, Upload } from "antd";
import { useEffect, useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

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
			title="فایل اکسل عملکرد ترافیک"
		>
			<div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
				<Tag color="blue">{`نوع شرکت: ${companyType ?? "-"}`}</Tag>
				<Tag color="blue">{`سال: ${year ?? "-"}`}</Tag>
				<Tag color="blue">{`ماه: ${month ?? "-"}`}</Tag>
			</div>

			<Controller
				name={sf("submitMode") as any}
				control={control}
				render={({ field }) => (
					<Form.Item label="روش ثبت عملکرد">
						<Radio.Group
							optionType="button"
							buttonStyle="solid"
							value={field.value ?? "template"}
							onChange={e => field.onChange(e.target.value)}
						>
							<Radio.Button value="template">آپلود از تمپلیت</Radio.Button>
							<Radio.Button value="single">ثبت تکی</Radio.Button>
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
								دانلود فایل تمپلیت
							</Button>

							<div style={{ opacity: 0.8, fontSize: 12, lineHeight: 1.8 }}>
								قبل از دانلود/آپلود، نوع شرکت، سال و ماه را انتخاب کنید.
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
										<p style={{ margin: 0, fontSize: 18 }}>فایل اکسل را انتخاب کنید یا بکشید و رها کنید</p>
										<p style={{ margin: 0, marginTop: 8 }}>فرمت‌های مجاز: xlsx, xls</p>
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
							message="توجه: هر واحد قیمت برابر با یک گیگابایت است."
						/>

						<ProCard bordered title="عملکرد تهران" style={{ borderRadius: 10 }}>
							<Row gutter={16}>
								<Col span={12}>
									<RHFProNumber
										name={sf("tehranValue") as any}
										label="مقدار ترافیک ارسالی در تهران"
										inputProps={{ placeholder: "مثلا 100" }}
									/>
								</Col>
								<Col span={12}>
									<RHFProNumber
										name={sf("tehranValueReceive") as any}
										label="مقدار ترافیک دریافتی در تهران"
										inputProps={{ placeholder: "مثلا 10000" }}
									/>
								</Col>
							</Row>
						</ProCard>

						{countyEnabled
							? (
								<ProCard
									bordered
									title="عملکرد مراکز استان"
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
											حذف
										</Button>
									)}
								>
									<Row gutter={16}>
										<Col span={12}>
											<RHFProNumber
												name={sf("countyValue") as any}
												label="مقدار ترافیک ارسالی در مراکز استان"
												inputProps={{ placeholder: "مثلا 100" }}
											/>
										</Col>
										<Col span={12}>
											<RHFProNumber
												name={sf("countyValueReceive") as any}
												label="مقدار ترافیک دریافتی در مراکز استان"
												inputProps={{ placeholder: "مثلا 10000" }}
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
									افزودن عملکرد مراکز استان
								</Button>
							)}
					</div>
				)}
		</ProCard>
	);
}
