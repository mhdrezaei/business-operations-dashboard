import type { PerformanceContractListItem } from "#src/features/performance/api/performances.api";
import i18next from "i18next";
import { isContractActiveInPeriod, isYearMonthInRange, toNullableNumber } from "../../model/performance.helpers";

export const COLLOCATION_PARTNER_TYPES = ["COLO", "CP"] as const;
export type CollocationPartnerType = typeof COLLOCATION_PARTNER_TYPES[number];

export const COLLOCATION_ROW_METRICS = ["ipCount", "bandwidthUsed", "ampereUsed"] as const;
export type CollocationRowMetric = typeof COLLOCATION_ROW_METRICS[number];

export interface CollocationDatacenter {
	datacenter: number
	datacenterName: string
}

export type CollocationRow = CollocationDatacenter & Record<CollocationRowMetric, number | null>;

type UnknownRecord = Record<string, unknown>;

export function isCollocationCompanyType(companyType: unknown) {
	return typeof companyType === "string" && companyType.toUpperCase() === "COLLOCATION";
}

/** شرکت‌های شریک COLO با نوع COLLOCATION و شرکای CP با نوع CP ثبت می‌شوند. */
export function collocationPartnerCompanyType(partner: CollocationPartnerType | null | undefined) {
	if (!partner)
		return null;
	return partner === "CP" ? "CP" : "COLLOCATION";
}

function asRecord(value: unknown): UnknownRecord | null {
	return value != null && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : null;
}

function pickDatacenter(location: UnknownRecord): CollocationDatacenter | null {
	const raw = location.datacenter;
	if (raw == null || raw === "")
		return null;

	const rawRecord = asRecord(raw);
	const id = Number(rawRecord ? rawRecord.id : raw);
	if (!Number.isFinite(id))
		return null;

	const name = [
		rawRecord?.name,
		location.datacenter_name,
		location.data_center_name,
		location.datacenter_display,
		location.datacenter_title,
		asRecord(location.data_center)?.name,
	].find(candidate => typeof candidate === "string" && candidate);

	return {
		datacenter: id,
		datacenterName: typeof name === "string" ? name : i18next.t("performance.traffic.collocation.datacenterFallback", { id }),
	};
}

function flattenAddenda(item: PerformanceContractListItem): PerformanceContractListItem[] {
	const children = (item.addenda ?? item.children ?? []) as PerformanceContractListItem[];
	return children.flatMap(child => [child, ...flattenAddenda(child)]);
}

/** دیتاسنترهای قراردادهای کولوکیشن فعال در دوره؛ اگر قرارداد اصلی دوره را پوشش ندهد، الحاقیه فعال منبع است. */
export function extractContractDatacenters(
	contracts: PerformanceContractListItem[],
	year: number,
	month: number,
): CollocationDatacenter[] {
	const byDatacenter = new Map<number, CollocationDatacenter>();
	const covers = (item: PerformanceContractListItem) => isYearMonthInRange(year, month, item.start_jy, item.start_jm, item.end_jy, item.end_jm);

	contracts.filter(contract => isContractActiveInPeriod(contract, year, month)).forEach((contract) => {
		const source = covers(contract) ? contract : flattenAddenda(contract).find(covers) ?? contract;
		const locations = Array.isArray(source.locations) ? source.locations : [];
		locations.forEach((location) => {
			const datacenter = asRecord(location) && pickDatacenter(location as UnknownRecord);
			if (datacenter && !byDatacenter.has(datacenter.datacenter))
				byDatacenter.set(datacenter.datacenter, datacenter);
		});
	});

	return Array.from(byDatacenter.values());
}

export function buildCollocationRow(datacenter: CollocationDatacenter): CollocationRow {
	return { ...datacenter, ipCount: null, bandwidthUsed: null, ampereUsed: null };
}

/** `current === null` یعنی انتخاب جدید: همه دیتاسنترهای قرارداد افزوده می‌شوند؛ در غیر این صورت ردیف‌های موجود فقط با قرارداد همگام می‌شوند. */
export function syncCollocationRows(current: CollocationRow[] | null, datacenters: CollocationDatacenter[]): CollocationRow[] {
	if (!current)
		return datacenters.map(buildCollocationRow);
	return current.filter(row => datacenters.some(item => item.datacenter === row.datacenter));
}

export function missingCollocationDatacenters(rows: CollocationRow[], datacenters: CollocationDatacenter[]) {
	return datacenters.filter(item => !rows.some(row => row.datacenter === item.datacenter));
}

export function buildCollocationRowsPayload(rows: CollocationRow[], partner: CollocationPartnerType) {
	return rows.map(row => ({
		datacenter: row.datacenter,
		collocation_mode: partner,
		ip_count: String(row.ipCount),
		bandwidth_used: String(row.bandwidthUsed),
		ampere_used: String(row.ampereUsed),
	}));
}

function globalPerformanceRows(rows: unknown[]) {
	return rows
		.map(asRecord)
		.filter((row): row is UnknownRecord => row != null && String(row.location ?? "").trim().toUpperCase() === "GLOBAL");
}

/** ردیف‌های مصرف دیتاسنتر یک عملکرد ثبت‌شده COLLOCATION (رکوردهای GLOBAL). */
export function buildCollocationRowsFromPerformances(rows: unknown[]): CollocationRow[] {
	const byDatacenter = new Map<number, CollocationRow>();
	globalPerformanceRows(rows).forEach((row) => {
		const datacenter = pickDatacenter(row);
		if (datacenter && !byDatacenter.has(datacenter.datacenter)) {
			byDatacenter.set(datacenter.datacenter, {
				...datacenter,
				ipCount: toNullableNumber(row.ip_count),
				bandwidthUsed: toNullableNumber(row.bandwidth_used),
				ampereUsed: toNullableNumber(row.ampere_used),
			});
		}
	});
	return Array.from(byDatacenter.values());
}

export function collocationModeFromPerformances(rows: unknown[]): CollocationPartnerType | null {
	const modes = globalPerformanceRows(rows).map(row => String(row.collocation_mode ?? "").trim().toUpperCase());
	return COLLOCATION_PARTNER_TYPES.find(partner => modes.includes(partner)) ?? null;
}
