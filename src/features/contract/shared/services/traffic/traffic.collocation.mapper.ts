import type { Row } from "../../utils/value-coercion";
import { asRecord, asRows, toNumberOrNull } from "../../utils/value-coercion";
import { DEFAULT_TELECOM_UNITS_PER_RACK } from "./traffic.collocation";

const PARTNER_TYPE_BY_MODE: Record<string, "COLLOCATION" | "CP"> = { COLO: "COLLOCATION", CP: "CP" };

/** collocation_mode در BE (COLO/CP) → نوع شریک فرم (COLLOCATION/CP). */
export function collocationModeToPartnerType(mode: unknown) {
	return PARTNER_TYPE_BY_MODE[String(mode ?? "").trim().toUpperCase()] ?? null;
}

function datacenterId(value: unknown) {
	const id = value != null && typeof value === "object" ? (value as Row).id : value;
	return id == null || id === "" ? null : String(id);
}

function mapDatacenterGroup(group: Row): Row {
	const items = asRecord(group.items);
	const tiersOf = (item: string) => asRecord(asRecord(items[item]).tiers);

	return {
		rowKey: crypto.randomUUID(),
		datacenter: datacenterId(group.datacenter),
		datacenterSystemTag: null,
		ipRate: toNumberOrNull(tiersOf("ip").rate_per_unit),
		bandwidthUnitRate: toNumberOrNull(tiersOf("bandwidth").rate_per_unit),
		electricityAmpRate: toNumberOrNull(tiersOf("ampere").rate_per_unit),
		// BE آستانه را فقط روی آیتم‌های رک برمی‌گرداند (فرم یک آستانه برای کل دیتاسنتر دارد)
		electricityExemptionThreshold: toNumberOrNull(asRecord(items.ampere).free_ampere_threshold ?? asRows(tiersOf("rack").rack_items)[0]?.free_ampere_threshold),
		portItems: asRows(tiersOf("port").port_items).map(item => ({
			rowKey: crypto.randomUUID(),
			count: toNumberOrNull(item.count),
			speed: toNumberOrNull(item.speed),
			unitPrice: toNumberOrNull(item.price),
		})),
		rackItems: asRows(tiersOf("rack").rack_items).map(item => ({
			rowKey: crypto.randomUUID(),
			rackType: String(item.rack_type ?? "").toLowerCase() || null,
			count: toNumberOrNull(item.count),
			unitPrice: toNumberOrNull(item.price),
		})),
		rackDiscountTiers: asRows(tiersOf("rack").tiers_persentage).map(row => ({
			from: toNumberOrNull(row.min_inclusive),
			to: toNumberOrNull(row.max_exclusive),
			discountPercent: toNumberOrNull(row.persentage_per_unit),
		})),
	};
}

/** لوکیشن‌های GET کولوکیشن (گروه‌بندی‌شده بر اساس دیتاسنتر + ردیف هزینه رک) → فیلدهای فرم قرارداد یا الحاقیه. */
export function normalizeCollocationLocations(locations: unknown) {
	const rows = asRows(locations);
	const cost = rows.find(row => String(row.location ?? "").toUpperCase() === "GLOBAL_COLLOCATION_COST");
	const groups = rows.filter(row => row.items != null);

	return {
		isCost: cost != null,
		partnerType: collocationModeToPartnerType(groups[0]?.collocation_mode),
		datacenters: groups.map(mapDatacenterGroup),
		telecomRackCount: toNumberOrNull(cost?.rack_count),
		telecomUnitsPerRack: cost != null ? toNumberOrNull(cost.units_per_rack) ?? DEFAULT_TELECOM_UNITS_PER_RACK : null,
		telecomMonthlyRackRent: toNumberOrNull(asRecord(cost?.tiers).cost_per_month),
	};
}
