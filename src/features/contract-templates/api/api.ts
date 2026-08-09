// src/features/contract-templates/api/api.ts
import type { AssetUploadResponse, PaginatedFonts, TemplateFont } from "../types";
import { request } from "#src/utils/index.js";

export const TemplateCreateApi = {
	uploadAsset: (file: File) => {
		const formData = new FormData();
		formData.append("file", file);
		return request.post("contracts/templates/assets/", {
			body: formData,
		}).json<AssetUploadResponse>();
	},

	getFonts: () => {
		return request.get("contracts/templates/fonts/").json<PaginatedFonts>();
	},

	uploadFont: (name: string, file: File) => {
		const formData = new FormData();
		formData.append("name", name);
		formData.append("file", file);
		return request.post("contracts/templates/fonts/", {
			body: formData,
		}).json<TemplateFont>();
	},

	deleteFont: (id: number) => {
		return request.delete(`contracts/templates/fonts/${id}/`).json();
	},

	createTemplate: (payload: any) => {
		return request.post("contracts/templates/", {
			json: payload, // چون payload یک آبجکت جاوااسکریپتی است، از json استفاده می‌کنیم
		}).json();
	},
	getTemplate: (id: number) => {
		return request.get(`contracts/templates/${id}/`).json<any>();
	},

	// 🔴 متد برای به‌روزرسانی قالب (حالت ویرایش)
	updateTemplate: (id: number, payload: any) => {
		return request.put(`contracts/templates/${id}/`, { json: payload }).json();
	},
};
