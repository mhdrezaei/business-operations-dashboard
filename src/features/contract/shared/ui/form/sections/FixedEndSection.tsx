import type { UploadProps } from "antd";
import type { ContractFormValues } from "../../../model/contract.form.types";
import { RHFProTextArea, RHFProUploadButton } from "#src/shared/ui/rhf-pro";
import { ProCard } from "@ant-design/pro-components";
import { ContractAlignedField, useContractAlignedLabelWidth } from "../components/ContractAlignedField";

export function FixedEndSection() {
	const alignedLabelStyle = useContractAlignedLabelWidth(["توضیحات", "مدارک"]);
	const uploadProps: UploadProps = {
		multiple: true,
		maxCount: 10,
		accept: ".pdf",
		// اگر آپلود سمت سرور دارید، این‌ها رو ست کنید:
		// action: "api/v1/upload/",
		// headers: { ... },
		// با request ky هم میشه customRequest نوشت (اگر خواستی می‌دم)
	};

	return (
		<ProCard>
			<div className="flex flex-col gap-3" style={alignedLabelStyle}>
				<ContractAlignedField label="توضیحات" labelId="contract-form-label-description" align="start">
					<RHFProTextArea<ContractFormValues, "description">
						name="description"
						formItemProps={{ style: { marginBottom: 0 } }}
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
						itemProps={{ style: { marginBottom: 0 } }}
						uploadProps={uploadProps}
					/>
				</ContractAlignedField>
			</div>
		</ProCard>
	);
}
