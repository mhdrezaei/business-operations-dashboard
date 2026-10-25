import type { Paginated } from "#src/api/types";
import { request } from "#src/utils/request";

const TELECOM_FRAME_PATH = "contracts/telecom-frame";
const PAGE_SIZE = 100;

export interface TelecomFrameDirectoryEntryDto {
	id: number
	name?: string
	full_name?: string
	title?: string
	is_active?: boolean
	company_types?: string[]
}

export interface TelecomFrameDirectoryFilter {
	department?: number | null
	general_office?: number | null
	division?: number | null
}

export type TelecomFrameDirectoryResource = "bo/departments" | "bo/general-offices" | "bo/people" | "po/divisions" | "po/people";

/** لیست‌های BO/PO صفحه‌بندی‌شده‌اند (سقف page_size سمت بک‌اند ۱۰۰)؛ همه صفحه‌ها خوانده می‌شود. */
export async function fetchTelecomFrameDirectory(
	resource: TelecomFrameDirectoryResource,
	filter: TelecomFrameDirectoryFilter = {},
) {
	const searchParams: Record<string, string> = { page_size: String(PAGE_SIZE) };
	Object.entries(filter).forEach(([key, value]) => {
		if (value != null)
			searchParams[key] = String(value);
	});

	const entries: TelecomFrameDirectoryEntryDto[] = [];
	for (let page = 1; ; page++) {
		const response = await request
			.get(`${TELECOM_FRAME_PATH}/${resource}/`, { searchParams: { ...searchParams, page: String(page) } })
			.json<Paginated<TelecomFrameDirectoryEntryDto> | TelecomFrameDirectoryEntryDto[]>();
		if (Array.isArray(response))
			return response;
		entries.push(...response.results);
		if (!response.next)
			return entries;
	}
}
