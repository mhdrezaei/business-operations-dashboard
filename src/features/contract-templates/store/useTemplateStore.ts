import type { HeaderData, TemplateFont } from "../types";
// src/features/contract-templates/store/useTemplateStore.ts
import { create } from "zustand";
import { TemplateCreateApi } from "../api/api";

interface TemplateState {
	customFonts: TemplateFont[]
	headerData: HeaderData
	isFetchingFonts: boolean

	// Actions
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
			set({ customFonts: data.results, isFetchingFonts: false });
		}
		catch (error) {
			console.error("خطا در دریافت فونت‌ها", error);
			set({ isFetchingFonts: false });
		}
	},

	setHeaderData: data => set({ headerData: data }),
}));
