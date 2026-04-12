import type { UploadProps } from "antd";
import type { PerformanceFormValues } from "../../model/performance.form.types";
import { ProCard } from "@ant-design/pro-components";
import { Form, Upload } from "antd";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

const sf = (path: string) => `serviceFields.${path}` as const;

function UploadCard({
	title,
	name,
}: {
	title: string
	name: string
}) {
	const { t } = useTranslation();
	const { control } = useFormContext<PerformanceFormValues>();

	const uploadProps: Omit<UploadProps, "fileList" | "onChange"> = {
		beforeUpload: () => false,
		maxCount: 1,
		accept: ".xlsx,.xls",
	};

	return (
		<Controller
			name={name as any}
			control={control}
			render={({ field, fieldState, formState }) => (
				<ProCard bordered headerBordered title={title} style={{ borderRadius: 8 }}>
					<Form.Item
						help={(formState.isSubmitted || fieldState.isTouched)
							? fieldState.error?.message
							: undefined}
						validateStatus={(formState.isSubmitted || fieldState.isTouched) && fieldState.error?.message
							? "error"
							: undefined}
						style={{ marginBottom: 0 }}
					>
						<Upload.Dragger
							{...uploadProps}
							fileList={field.value ?? []}
							onChange={info => field.onChange(info.fileList.slice(-1))}
						>
							<p style={{ margin: 0, fontSize: 18 }}>{t("performance.labels.selectExcelFile")}</p>
							<p style={{ margin: 0, marginTop: 8 }}>{t("performance.labels.allowedFormatsXls")}</p>
						</Upload.Dragger>
					</Form.Item>
				</ProCard>
			)}
		/>
	);
}

export function CommercialPerformanceFields() {
	const { t } = useTranslation();

	return (
		<ProCard
			bordered
			headerBordered
			style={{ borderRadius: 8 }}
			title={t("performance.commercial.title")}
		>
			<div style={{ marginBottom: 12, opacity: 0.8 }}>
				{t("performance.commercial.uploadOnlyDescription")}
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
					gap: 12,
				}}
			>
				<UploadCard title={t("performance.commercial.servicesFile")} name={sf("servicesFile")} />
				<UploadCard title={t("performance.commercial.provinceCodeFile")} name={sf("provinceCodeFile")} />
				<UploadCard title={t("performance.commercial.monthlyPerformanceFile")} name={sf("monthlyPerformanceFile")} />
			</div>
		</ProCard>
	);
}
