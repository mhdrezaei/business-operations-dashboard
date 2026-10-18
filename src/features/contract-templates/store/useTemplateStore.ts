import type { HeaderData, TemplateFont } from "../types";
// src/features/contract-templates/store/useTemplateStore.ts
import { create } from "zustand";
import { TemplateCreateApi } from "../api/api";

export function mapTemplateHeader(header: any): HeaderData {
	const h = header && typeof header === "object" ? header : {};
	const out: HeaderData = {};
	if (h.logo_asset_id != null)
		out.logo_asset_id = h.logo_asset_id;
	if (h.logo_url)
		out.logo_url = h.logo_url;
	if (typeof h.show_contract_number === "boolean")
		out.show_contract_number = h.show_contract_number;
	if (typeof h.extra_text === "string" && h.extra_text)
		out.extra_text = h.extra_text;
	if (h.header_font_family)
		out.header_font_family = h.header_font_family;
	if (typeof h.header_font_size === "number")
		out.header_font_size = h.header_font_size;
	return out;
}

/**
 * Backend file URLs are absolute (built from the API request host). Behind the
 * dev proxy that host is another origin without CORS, and browsers refuse
 * cross-origin fonts: load them from the origin the API client uses instead.
 */
function apiFileUrl(url: string) {
	const api = new URL(import.meta.env.VITE_API_BASE_URL || "/", location.origin);
	const file = new URL(url, api);
	return `${api.origin}${file.pathname}${file.search}`;
}

interface TemplateState {
	customFonts: TemplateFont[]
	headerData: HeaderData
	isFetchingFonts: boolean
	fetchFonts: () => Promise<void>
	setHeaderData: (data: HeaderData) => void
}

export const useTemplateStore = create<TemplateState>(set => ({
	customFonts: [],
	headerData: {},
	isFetchingFonts: false,

	fetchFonts: async () => {
		set({ isFetchingFonts: true });
		try {
			const data = await TemplateCreateApi.getFonts();
			set({ customFonts: data.results.map(f => ({ ...f, file_url: apiFileUrl(f.file_url) })), isFetchingFonts: false });
		}
		catch (error) {
			console.error("خطا در دریافت فونت‌ها", error);
			set({ isFetchingFonts: false });
		}
	},

	setHeaderData: data => set({ headerData: data }),
}));
