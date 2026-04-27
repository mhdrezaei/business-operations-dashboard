import type { UploadProps } from "antd";
import type { PerformanceFormValues } from "../../model/performance.form.types";
import { Card, Form, Upload } from "antd";
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
				<Card bordered title={title} className="rounded-lg">
					<Form.Item
						help={(formState.isSubmitted || fieldState.isTouched)
							? fieldState.error?.message
							: undefined}
						validateStatus={(formState.isSubmitted || fieldState.isTouched) && fieldState.error?.message
							? "error"
							: undefined}
						className="mb-0"
					>
						<Upload.Dragger
							{...uploadProps}
							fileList={field.value ?? []}
							onChange={info => field.onChange(info.fileList.slice(-1))}
						>
							<p className="m-0 text-lg">{t("performance.labels.selectExcelFile")}</p>
							<p className="m-0 mt-2">{t("performance.labels.allowedFormatsXls")}</p>
						</Upload.Dragger>
					</Form.Item>
				</Card>
			)}
		/>
	);
}

export function CommercialPerformanceFields() {
	const { t } = useTranslation();

	return (
		<Card
			bordered
			className="rounded-lg"
			title={t("performance.commercial.title")}
		>
			<div className="mb-3 opacity-80">
				{t("performance.commercial.uploadOnlyDescription")}
			</div>

			<div
				className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-3"
			>
				<UploadCard title={t("performance.commercial.servicesFile")} name={sf("servicesFile")} />
				<UploadCard title={t("performance.commercial.provinceCodeFile")} name={sf("provinceCodeFile")} />
				<UploadCard title={t("performance.commercial.monthlyPerformanceFile")} name={sf("monthlyPerformanceFile")} />
			</div>
		</Card>
	);
}
