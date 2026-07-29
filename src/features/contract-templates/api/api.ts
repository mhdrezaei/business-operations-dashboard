// src/features/contract-templates/queries/template-create.queries.ts

import { request } from "#src/utils/index.js";

export interface AssetUploadResponse {
	id: number
	file_url: string
}

export const TemplateCreateApi = {
	/**
	 * آپلود فایل (لوگو و ...) برای قالب قرارداد
	 */
	uploadAsset: (file: File) => {
		const formData = new FormData();
		formData.append("file", file);

		// توکن احراز هویت به صورت خودکار توسط اینترسپتورهای ky شما اضافه می‌شود
		return request.post("contracts/templates/assets/", {
			body: formData,
		}).json<AssetUploadResponse>();
	},
};
