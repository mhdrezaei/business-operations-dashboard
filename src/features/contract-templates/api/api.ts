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
			json: payload,
		}).json();
	},

	getTemplate: (id: number) => {
		return request.get(`contracts/templates/${id}/`).json<any>();
	},

	updateTemplate: (id: number, payload: any) => {
		return request.put(`contracts/templates/${id}/`, {
			json: payload,
		}).json();
	},

	getVariableCatalog: (params: Record<string, any>) => {
		const cleanParams = Object.fromEntries(
			Object.entries(params).filter(([_, v]) => v != null && v !== ""),
		);
		return request.get("contracts/templates/variable-catalog/", {
			searchParams: cleanParams as any,
		}).json<any>();
	},
};
