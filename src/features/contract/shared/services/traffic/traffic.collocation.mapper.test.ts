import { describe, expect, it } from "vitest";
import { collocationModeToPartnerType, normalizeCollocationLocations } from "./traffic.collocation.mapper";

describe("normalizeCollocationLocations", () => {
	it("maps grouped datacenter items back to the form shape", () => {
		const result = normalizeCollocationLocations([{
			datacenter: { id: 3, name: "dc" },
			collocation_mode: "CP",
			items: {
				ip: { tiers: { rate_per_unit: "5" } },
				bandwidth: { tiers: { rate_per_unit: "6" } },
				ampere: { free_ampere_threshold: "16", tiers: { rate_per_unit: "7" } },
				port: { tiers: { port_items: [{ count: 2, speed: 10, price: "100" }] } },
				rack: { tiers: { rack_items: [{ rack_type: "full", count: 1, price: "9" }], tiers_persentage: [{ min_inclusive: "0", max_exclusive: "5", persentage_per_unit: "10" }] } },
			},
		}]);

		expect(result.isCost).toBe(false);
		expect(result.partnerType).toBe("CP");
		expect(result.datacenters[0]).toMatchObject({
			datacenter: "3",
			ipRate: 5,
			bandwidthUnitRate: 6,
			electricityAmpRate: 7,
			electricityExemptionThreshold: 16,
			portItems: [{ count: 2, speed: 10, unitPrice: 100 }],
			rackItems: [{ rackType: "full", count: 1, unitPrice: 9 }],
			rackDiscountTiers: [{ from: 0, to: 5, discountPercent: 10 }],
		});
	});

	it("reads the telecom rack cost row", () => {
		const result = normalizeCollocationLocations([{ location: "GLOBAL_COLLOCATION_COST", rack_count: "3", units_per_rack: 42, tiers: { cost_per_month: "100.00" } }]);
		expect(result).toMatchObject({ isCost: true, telecomRackCount: 3, telecomUnitsPerRack: 42, telecomMonthlyRackRent: 100, datacenters: [] });
	});

	it("maps the BE mode to the partner type", () => {
		expect(collocationModeToPartnerType("colo")).toBe("COLLOCATION");
		expect(collocationModeToPartnerType(null)).toBeNull();
	});
});
