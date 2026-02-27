import type { UploadProps } from "antd";
import type { PerformanceFormValues } from "../../model/performance.form.types";
import { downloadPerformanceTemplate } from "#src/features/performance/api/performances.api";
import { DownloadOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { Button, Form, Tag, Upload } from "antd";
import { useState } from "react";
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
	const { control } = useFormContext<PerformanceFormValues>();
	const [downloading, setDownloading] = useState(false);

	const year = useWatch({ control, name: "year" });
	const month = useWatch({ control, name: "month" });
	const companyType = useWatch({ control, name: "trafficCompanyType" });

	const canDownloadTemplate = !!companyType && !!year && !!month;

	const uploadProps: Omit<UploadProps, "fileList" | "onChange"> = {
		beforeUpload: () => false,
		maxCount: 1,
		accept: ".xlsx,.xls",
	};

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
						نتیجه آپلود به‌صورت پیام نمایش داده می‌شود.
					</div>
				</div>

				<Controller
					name={sf("monthlyPerformanceFile") as any}
					control={control}
					render={({ field, fieldState }) => (
						<Form.Item
							help={fieldState.error?.message}
							validateStatus={fieldState.error?.message ? "error" : undefined}
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
		</ProCard>
	);
}
