import { formatJalaliIsoDate } from "#src/shared/lib/jalali-intl";

export function formatJalaliDate(value: string | null | undefined) {
	return value ? formatJalaliIsoDate(value) : "-";
}
