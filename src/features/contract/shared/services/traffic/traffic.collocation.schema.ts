import type { z } from "zod";
import type { Row } from "../../utils/value-coercion";
import { i18n } from "#src/locales";
import { asRows, isBlankValue, toNumberOrNull } from "../../utils/value-coercion";
import { DEFAULT_TELECOM_UNITS_PER_RACK } from "./traffic.collocation";

type IssuePath = Array<string | number>;

function addIssue(ctx: z.RefinementCtx, path: IssuePath, messageKey: string) {
	ctx.addIssue({ code: "custom", path, message: i18n.t(`contract.collocation.validation.${messageKey}`) });
}

function validateRequired(ctx: z.RefinementCtx, row: Row, path: IssuePath, fields: Record<string, string>) {
	Object.entries(fields).forEach(([field, messageKey]) => {
		if (isBlankValue(row[field]))
			addIssue(ctx, [...path, field], messageKey);
	});
}

/** هر دیتاسنتر حداقل یک آیتم پورت و یک آیتم رک معتبر لازم دارد (مثل old). */
function validateDatacenterItems(ctx: z.RefinementCtx, datacenter: Row, path: IssuePath) {
	const portItems = asRows(datacenter.portItems);
	const rackItems = asRows(datacenter.rackItems);
	if (portItems.length === 0)
		addIssue(ctx, [...path, "portItems"], "portItemsRequired");
	if (rackItems.length === 0)
		addIssue(ctx, [...path, "rackItems"], "rackItemsRequired");

	portItems.forEach((item, index) => {
		validateRequired(ctx, item, [...path, "portItems", index], { count: "count", speed: "speed", unitPrice: "unitPrice" });
		const count = toNumberOrNull(item.count);
		if (count != null && (!Number.isInteger(count) || count <= 0))
			addIssue(ctx, [...path, "portItems", index, "count"], "countPositive");
		const speed = toNumberOrNull(item.speed);
		if (speed != null && speed <= 0)
			addIssue(ctx, [...path, "portItems", index, "speed"], "speedPositive");
	});
	rackItems.forEach((item, index) => {
		validateRequired(ctx, item, [...path, "rackItems", index], { rackType: "rackType", count: "count", unitPrice: "unitPrice" });
		const count = toNumberOrNull(item.count);
		if (count != null && (!Number.isInteger(count) || count <= 0))
			addIssue(ctx, [...path, "rackItems", index, "count"], "countPositive");
	});
}

function validateRackDiscountTiers(ctx: z.RefinementCtx, datacenter: Row, path: IssuePath) {
	const tiers = asRows(datacenter.rackDiscountTiers);
	tiers.forEach((tier, index) => {
		const tierPath = [...path, "rackDiscountTiers", index];
		validateRequired(ctx, tier, tierPath, { from: "tierFrom", discountPercent: "tierPercent" });
		if (index < tiers.length - 1 && isBlankValue(tier.to))
			addIssue(ctx, [...tierPath, "to"], "tierTo");
		const discountPercent = toNumberOrNull(tier.discountPercent);
		if (!isBlankValue(tier.discountPercent) && (discountPercent == null || discountPercent < 0 || discountPercent > 100))
			addIssue(ctx, [...tierPath, "discountPercent"], "tierPercentRange");
	});
}

/** اعتبارسنجی یک دیتاسنتر کولوکیشن شرکای تجاری (قرارداد اصلی یا الحاقیه): نرخ‌ها، آیتم‌های پورت/رک و پلکان تخفیف CP. */
export function validateCollocationDatacenter(
	datacenter: Row,
	path: IssuePath,
	ctx: z.RefinementCtx,
	partnerType: unknown,
) {
	validateRequired(ctx, datacenter, path, {
		bandwidthUnitRate: "bandwidthRate",
		ipRate: "ipRate",
		electricityAmpRate: "ampRate",
		electricityExemptionThreshold: "ampThreshold",
	});
	validateDatacenterItems(ctx, datacenter, path);
	// پلکان فقط برای دیتاسنتر بهشتی ردیف دارد (دیتاسنتر بارگذاری‌شده از BE برچسب سیستمی ندارد)
	if (partnerType === "CP")
		validateRackDiscountTiers(ctx, datacenter, path);
}

interface CollocationAddendaContext {
	partnerType: unknown
	isTelecom: boolean
	baseDatacenterIds: Set<string>
}

/** الحاقیه‌های کولوکیشن: هزینه رک مخابرات یا دیتاسنترها + SLA (مثل old؛ دیتاسنتر جدید باید هر ۵ دسته را کامل داشته باشد). */
export function validateCollocationAddenda(
	addenda: unknown,
	path: IssuePath,
	ctx: z.RefinementCtx,
	options: CollocationAddendaContext,
) {
	asRows(addenda).forEach((addendum, index) => {
		const addendumPath = [...path, index];

		if (options.isTelecom) {
			const rackCount = toNumberOrNull(addendum.telecomRackCount);
			const unitsPerRack = toNumberOrNull(addendum.telecomUnitsPerRack) ?? DEFAULT_TELECOM_UNITS_PER_RACK;
			const monthlyRent = toNumberOrNull(addendum.telecomMonthlyRackRent);
			if (rackCount == null || rackCount <= 0)
				addIssue(ctx, [...addendumPath, "telecomRackCount"], "addendumRackCount");
			if (unitsPerRack <= 0)
				addIssue(ctx, [...addendumPath, "telecomUnitsPerRack"], "addendumUnitsPerRack");
			if (monthlyRent == null || monthlyRent < 0)
				addIssue(ctx, [...addendumPath, "telecomMonthlyRackRent"], "addendumMonthlyRent");
		}
		else {
			const datacenters = asRows(addendum.datacenters);
			if (datacenters.length === 0)
				addIssue(ctx, [...addendumPath, "datacenter"], "addendumDatacenters");
			if (isBlankValue(addendum.sla))
				addIssue(ctx, [...addendumPath, "sla"], "addendumSla");

			datacenters.forEach((datacenter, datacenterIndex) => {
				if (!options.baseDatacenterIds.has(String(datacenter.datacenter)))
					validateCollocationDatacenter(datacenter, [...addendumPath, "datacenters", datacenterIndex], ctx, options.partnerType);
			});
		}

		validateCollocationAddenda(addendum.children, [...addendumPath, "children"], ctx, options);
	});
}
