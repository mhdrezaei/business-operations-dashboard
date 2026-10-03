import type { UploadFile, UploadProps } from "antd";
import type { ContractFormValues } from "../../../model/contract.form.types";
import {
	createContractDocument,
	deleteContractDocument,
	downloadContractDocument,
} from "#src/features/contract/api/contract-documents.api";
import { RHFProCheckbox, RHFProTextArea, RHFProUploadButton } from "#src/shared/ui/rhf-pro";
import { SectionCard } from "#src/shared/ui/section-card";

interface FixedEndSectionProps {
	showSignedCheckbox?: boolean
	contractId?: number | null
	showDocuments?: boolean
}

export function FixedEndSection({ showSignedCheckbox = false, contractId = null, showDocuments = true }: FixedEndSectionProps) {
	// در حالت ایجاد قرارداد (بدون contractId) فایل‌ها فقط محلی نگه‌داشته می‌شوند
	// و بعد از ثبت موفق قرارداد، توسط فراخواننده (CreateContract) به سرور ارسال می‌شوند.
	const uploadProps: UploadProps = contractId
		? {
			multiple: true,
			maxCount: 10,
			accept: ".pdf,.png,.jpg,.jpeg",
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
			maxCount: 10,
			accept: ".pdf,.png,.jpg,.jpeg",
			beforeUpload: () => false,
		};

	return (
		<SectionCard title="اطلاعات تکمیلی" className="w-full mt-3">
			<div className="contract-supplementary-fields">
				<div className="contract-supplementary-control contract-supplementary-description-control">
					<div className="contract-supplementary-control__label">توضیحات</div>
					<RHFProTextArea<ContractFormValues, "description">
						name="description"
						label=""
						formItemProps={{ className: "contract-supplementary-field mb-0" }}
						textAreaProps={{
							placeholder: "توضیحات قرارداد",
							autoSize: { minRows: 1, maxRows: 4 },
							maxLength: 2000,
						} as any}
					/>
				</div>

				{showDocuments
					? (
						<div className="contract-supplementary-control contract-supplementary-upload-control">
							<div className="contract-supplementary-control__label">مدارک پیوستی</div>
							<RHFProUploadButton<ContractFormValues, "documents">
								name="documents"
								label=""
								variant="dragger"
								draggerTitle="فایل‌ها را بکشید یا برای انتخاب اینجا کلیک کنید"
								draggerHint="امکان آپلود هم‌زمان فایل‌های PNG، JPG و PDF"
								itemProps={{ className: "contract-supplementary-field mb-0" }}
								uploadProps={uploadProps}
							/>
						</div>
					)
					: null}

				{showSignedCheckbox
					? (
						<RHFProCheckbox<ContractFormValues, any>
							name={"serviceFields.isOfficial" as any}
							label=""
							checkboxLabel="قرارداد امضا شده است"
							checkboxProps={{}}
						/>
					)
					: null}
			</div>
		</SectionCard>
	);
}
