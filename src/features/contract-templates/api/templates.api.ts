import type { FontDto, PaginatedResponse, TemplateListItemType, TemplatesListQueryParams } from "../model/templates.list.types";
import { request } from "#src/utils/request";

export async function fetchTemplatesList(params: TemplatesListQueryParams): Promise<PaginatedResponse<TemplateListItemType>> {
	return request.get("contracts/templates/", { searchParams: params as Record<string, string | number> }).json();
}

export async function fetchDeleteTemplate(id: number): Promise<void> {
	return request.delete(`contracts/templates/${id}/`).json();
}
export function fetchTemplateFonts() {
	return request
		.get("contracts/templates/fonts/")
		.json<{ count: number, results: FontDto[] }>(); // بر اساس ساختار پاسخی که فرستادید
}
