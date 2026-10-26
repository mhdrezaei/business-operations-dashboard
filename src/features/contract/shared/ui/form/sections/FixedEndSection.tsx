import type { UploadFile, UploadProps } from "antd";
import type { ContractFormValues } from "../../../model/contract.form.types";
import {
	createContractDocument,
	deleteContractDocument,
	downloadContractDocument,
} from "#src/features/contract/api/contract-documents.api";
import { RHFProTextArea, RHFProUploadButton } from "#src/shared/ui/rhf-pro";
import { SectionCard } from "#src/shared/ui/section-card";
import { Upload } from "antd";
import { useTranslation } from "react-i18next";
import { CONTRACT_DOCUMENT_ACCEPT, CONTRACT_DOCUMENT_MAX_COUNT, getContractDocumentRejection } from "../../../model/contract-documents";

interface FixedEndSectionProps {
	contractId?: number | null
	showDocuments?: boolean
}

export function FixedEndSection({ contractId = null, showDocuments = true }: FixedEndSectionProps) {
	const { t } = useTranslation();
	const beforeUpload: UploadProps["beforeUpload"] = (file) => {
		const rejection = getContractDocumentRejection(file);
		if (rejection) {
			window.$message?.warning(t(`contract.documents.${rejection}`, { name: file.name }));
			return Upload.LIST_IGNORE;
		}
		// در حالت ایجاد قرارداد (بدون contractId) فایل‌ها فقط محلی نگه‌داشته می‌شوند
		// و بعد از ثبت موفق قرارداد، توسط فراخواننده (CreateContract) به سرور ارسال می‌شوند.
		return !!contractId;
	};
	const uploadProps: UploadProps = contractId
		? {
			multiple: true,
			maxCount: CONTRACT_DOCUMENT_MAX_COUNT,
			accept: CONTRACT_DOCUMENT_ACCEPT,
			beforeUpload,
			showUploadList: {
				showDownloadIcon: true,
				showRemoveIcon: true,
			},
			customRequest: async (options) => {
				const { file, onSuccess, onError } = options;
				try {
					const dto = await createContractDocument(contractId, file as File);
					onSuccess?.(dto);
				}
				catch (error) {
					onError?.(error as Error);
				}
			},
			onDownload: async (file: UploadFile) => {
				const documentId = Number((file as any).documentId ?? file.uid);
				if (Number.isFinite(documentId))
					await downloadContractDocument(documentId, file.name);
			},
			onRemove: async (file: UploadFile) => {
				const documentId = Number((file as any).documentId ?? file.uid);
				if (!Number.isFinite(documentId))
					return true;
				await deleteContractDocument(documentId);
				return true;
			},
		}
		: {
			multiple: true,
			maxCount: CONTRACT_DOCUMENT_MAX_COUNT,
			accept: CONTRACT_DOCUMENT_ACCEPT,
			beforeUpload,
		};

	return (
		<SectionCard title={t("contract.supplementary.title")} className="w-full mt-3">
			<div className="contract-supplementary-fields">
				<div className="contract-supplementary-control contract-supplementary-description-control">
					<div className="contract-supplementary-control__label">{t("contract.supplementary.description")}</div>
					<RHFProTextArea<ContractFormValues, "description">
						name="description"
						label=""
						formItemProps={{ className: "contract-supplementary-field mb-0" }}
						textAreaProps={{
							placeholder: t("contract.supplementary.descriptionPlaceholder"),
							autoSize: { minRows: 1, maxRows: 4 },
							maxLength: 2000,
						} as any}
					/>
				</div>

				{showDocuments
					? (
						<div className="contract-supplementary-control contract-supplementary-upload-control">
							<div className="contract-supplementary-control__label">{t("contract.supplementary.attachments")}</div>
							<RHFProUploadButton<ContractFormValues, "documents">
								name="documents"
								label=""
								variant="dragger"
								draggerTitle={t("contract.supplementary.draggerTitle")}
								draggerHint={t("contract.supplementary.draggerHint")}
								itemProps={{ className: "contract-supplementary-field mb-0" }}
								uploadProps={uploadProps}
							/>
						</div>
					)
					: null}
			</div>
		</SectionCard>
	);
}
