import type { PaginatedResponse, TemplateListItemType, TemplatesListQueryParams } from "../model/templates.list.types";
import { request } from "#src/utils/request";

export async function fetchTemplatesList(params: TemplatesListQueryParams): Promise<PaginatedResponse<TemplateListItemType>> {
	return request.get("contracts/templates/", { searchParams: params as Record<string, string | number> }).json();
}

export async function fetchDeleteTemplate(id: number): Promise<void> {
	return request.delete(`contracts/templates/${id}/`).json();
}
