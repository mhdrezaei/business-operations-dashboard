import type { UploadProps } from "antd";
import type { ContractFormValues } from "../../model/contract.form.types";
import { RHFProTextArea, RHFProUploadButton } from "#src/shared/ui/rhf-pro";

import React from "react";

export function FixedEndSection() {
	// تنظیمات پیشنهادی آپلود (قابل تغییر بر اساس API شما)
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
		<>
			<RHFProTextArea<ContractFormValues, "description">
				name="description"
				label="توضیحات"
				textAreaProps={{
					rows: 4,
					placeholder: "توضیحات قرارداد را وارد کنید...",
					showCount: true,
					maxLength: 2000,
				}}
			/>

			<RHFProUploadButton<ContractFormValues, "documents">
				name="documents"
				label="مدارک"
				buttonText="آپلود مدارک"
				uploadProps={uploadProps}
				itemProps={{
					extra: "فرمت‌های مجاز: PDF / JPG / PNG — حداکثر ۱۰ فایل",
				}}
			/>
		</>
	);
}
