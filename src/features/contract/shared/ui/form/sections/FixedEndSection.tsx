import type { UploadFile, UploadProps } from "antd";
import type { ContractFormValues } from "../../../model/contract.form.types";
import {
	createContractDocument,
	deleteContractDocument,
	downloadContractDocument,
} from "#src/features/contract/api/contract-documents.api";
import { RHFProCheckbox, RHFProTextArea, RHFProUploadButton } from "#src/shared/ui/rhf-pro";

import { Card } from "antd";
import { ContractAlignedField, useContractAlignedLabelWidth } from "../components/ContractAlignedField";

interface FixedEndSectionProps {
	showSignedCheckbox?: boolean
	contractId?: number | null
}

export function FixedEndSection({ showSignedCheckbox = false, contractId = null }: FixedEndSectionProps) {
	const alignedLabelStyle = useContractAlignedLabelWidth(["توضیحات", "مدارک", "قرارداد امضا شده است"]);

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
		<Card className="w-full">
			<div className="flex flex-col gap-3" style={alignedLabelStyle}>
				<ContractAlignedField label="توضیحات" labelId="contract-form-label-description" align="start">
					<RHFProTextArea<ContractFormValues, "description">
						name="description"
						formItemProps={{ className: "mb-0" }}
						textAreaProps={{
							"rows": 4,
							"placeholder": "توضیحات قرارداد را وارد کنید...",
							"showCount": true,
							"maxLength": 2000,
							"aria-labelledby": "contract-form-label-description",
						} as any}
					/>
				</ContractAlignedField>

				<ContractAlignedField label="مدارک" labelId="contract-form-label-documents">
					<RHFProUploadButton<ContractFormValues, "documents">
						name="documents"
						buttonText="آپلود مدارک (PDF)"
						itemProps={{ className: "mb-0" }}
						uploadProps={uploadProps}
					/>
				</ContractAlignedField>

				{showSignedCheckbox
					? (
						<ContractAlignedField label="" labelId="contract-form-label-signed">
							<RHFProCheckbox<ContractFormValues, any>
								name={"serviceFields.isOfficial" as any}
								label=""
								checkboxLabel="قرارداد امضا شده است"
								checkboxProps={{
									"aria-labelledby": "contract-form-label-signed",
								} as any}
							/>
						</ContractAlignedField>
					)
					: null}
			</div>
		</Card>
	);
}
