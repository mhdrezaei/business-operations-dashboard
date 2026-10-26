import type { TelecomFrameDirectoryEntryDto } from "#src/features/contract/api/telecom-frame.api";

export interface DirectoryOption {
	label: string
	value: number
}

export function entryLabel(entry: TelecomFrameDirectoryEntryDto) {
	return entry.full_name ?? entry.name ?? `#${entry.id}`;
}

function supportsCompanyType(entry: TelecomFrameDirectoryEntryDto, companyType: string | null | undefined) {
	return !companyType || (Array.isArray(entry.company_types) && entry.company_types.includes(companyType));
}

/** فقط رکوردهای فعالی که نوع شرکت انتخاب‌شده را پشتیبانی می‌کنند (مثل old). */
export function toDirectoryOptions(
	entries: TelecomFrameDirectoryEntryDto[] | undefined,
	companyType: string | null | undefined,
	excludeIds: number[] = [],
): DirectoryOption[] {
	return (entries ?? [])
		.filter(entry => entry.is_active !== false && !excludeIds.includes(entry.id) && supportsCompanyType(entry, companyType))
		.map(entry => ({ label: entryLabel(entry), value: entry.id }));
}
