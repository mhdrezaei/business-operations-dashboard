import type { CommercialExcelImportKind } from "#src/features/performance/api/performances.api";
import type { UploadFile, UploadProps } from "antd";
import { uploadCommercialExcelImport } from "#src/features/performance/api/performances.api";
import { FieldCard } from "#src/shared/ui/dashed-card";
import { CloudUploadOutlined } from "@ant-design/icons";
import { Button, Upload } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const uploadProps: Omit<UploadProps, "fileList" | "onChange"> = {
	beforeUpload: () => false,
	maxCount: 1,
	accept: ".xlsx,.xls",
};

function UploadCard({ title, kind }: { title: string, kind: CommercialExcelImportKind }) {
	const { t } = useTranslation();
	const [fileList, setFileList] = useState<UploadFile[]>([]);
	const [uploading, setUploading] = useState(false);

	async function handleUpload() {
		const file = fileList[0]?.originFileObj;
		if (!file) {
			window.$message?.error(t("performance.commercial.selectFile"));
			return;
		}

		setUploading(true);
		try {
			await uploadCommercialExcelImport(kind, file);
			window.$message?.success(t("performance.commercial.uploadSuccess", { title }));
			setFileList([]);
		}
		finally {
			setUploading(false);
		}
	}

	return (
		<FieldCard title={title}>
			<Upload.Dragger
				{...uploadProps}
				fileList={fileList}
				onChange={info => setFileList(info.fileList.slice(-1))}
			>
				<p className="m-0 text-lg">{t("performance.labels.selectExcelFile")}</p>
				<p className="m-0 mt-2">{t("performance.labels.allowedFormatsXls")}</p>
			</Upload.Dragger>
			<Button
				className="mt-3"
				block
				icon={<CloudUploadOutlined />}
				disabled={fileList.length < 1}
				loading={uploading}
				onClick={() => void handleUpload()}
			>
				{t("performance.commercial.upload")}
			</Button>
		</FieldCard>
	);
}

export function CommercialPerformanceFields() {
	const { t } = useTranslation();

	return (
		<div className="performance-field-group w-full">
			<div className="performance-field-group__header">
				<h3 className="performance-field-group__title">{t("performance.commercial.title")}</h3>
			</div>
			<div className="dashed-card__hint">
				{t("performance.commercial.uploadOnlyDescription")}
			</div>

			<div className="performance-field-grid performance-field-grid--three">
				<UploadCard title={t("performance.commercial.servicesFile")} kind="serviceTypes" />
				<UploadCard title={t("performance.commercial.provinceCodeFile")} kind="provinces" />
				<UploadCard title={t("performance.commercial.monthlyPerformanceFile")} kind="monthly" />
			</div>
		</div>
	);
}
