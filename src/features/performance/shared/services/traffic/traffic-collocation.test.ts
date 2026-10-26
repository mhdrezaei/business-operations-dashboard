import type { PerformanceContractListItem } from "#src/features/performance/api/performances.api";
import { describe, expect, it } from "vitest";
import {
	buildCollocationRowsFromPerformances,
	buildCollocationRowsPayload,
	collocationModeFromPerformances,
	collocationPartnerCompanyType,
	extractContractDatacenters,
	missingCollocationDatacenters,
	syncCollocationRows,
} from "./traffic-collocation";
import { trafficPerformanceSchema } from "./traffic.schema";

const base = { id: 1, company: 1, service: 1, start_jy: 1404, start_jm: 1, end_jy: 1404, end_jm: 12 };

function contract(extra: Partial<PerformanceContractListItem>): PerformanceContractListItem {
	return { ...base, ...extra };
}

describe("collocation datacenters", () => {
	it("maps the partner type to the company type filter", () => {
		expect(collocationPartnerCompanyType("COLO")).toBe("COLLOCATION");
		expect(collocationPartnerCompanyType("CP")).toBe("CP");
		expect(collocationPartnerCompanyType(null)).toBeNull();
	});

	it("reads grouped and flat locations of contracts active in the period and dedupes", () => {
		const result = extractContractDatacenters([
			contract({ locations: [{ datacenter: { id: 3, name: "A" }, items: {} }, { datacenter: 4, datacenter_name: "B" }] }),
			contract({ id: 2, locations: [{ datacenter: 3, datacenter_name: "dup" }] }),
			contract({ id: 3, start_jy: 1403, end_jy: 1403, locations: [{ datacenter: 9, datacenter_name: "old" }] }),
		], 1404, 5);
		expect(result).toEqual([{ datacenter: 3, datacenterName: "A" }, { datacenter: 4, datacenterName: "B" }]);
	});

	it("uses the addendum that covers the period when the base contract does not", () => {
		const result = extractContractDatacenters([
			contract({
				end_jm: 3,
				locations: [{ datacenter: 1, datacenter_name: "base" }],
				addenda: [{ ...base, id: 5, start_jm: 4, locations: [{ datacenter: 2, datacenter_name: "addendum" }] }],
			}),
		], 1404, 6);
		expect(result).toEqual([{ datacenter: 2, datacenterName: "addendum" }]);
	});

	it("selects every contract datacenter on a new selection and keeps entered values afterwards", () => {
		const datacenters = [{ datacenter: 1, datacenterName: "A" }, { datacenter: 2, datacenterName: "B" }];
		const fresh = syncCollocationRows(null, datacenters);
		expect(fresh.map(row => row.datacenter)).toEqual([1, 2]);

		const edited = [{ ...fresh[0], ipCount: 4 }];
		expect(syncCollocationRows(edited, [datacenters[0]])).toEqual(edited);
		expect(syncCollocationRows(edited, [datacenters[1]])).toEqual([]);
		expect(missingCollocationDatacenters(edited, datacenters)).toEqual([datacenters[1]]);
	});

	it("builds the backend rows payload", () => {
		expect(buildCollocationRowsPayload([{ datacenter: 1, datacenterName: "A", ipCount: 4, bandwidthUsed: 100, ampereUsed: 30.5 }], "CP")).toEqual([
			{ datacenter: 1, collocation_mode: "CP", ip_count: "4", bandwidth_used: "100", ampere_used: "30.5" },
		]);
	});
});

describe("collocation schema", () => {
	const row = { datacenter: 1, datacenterName: "A", ipCount: 4, bandwidthUsed: 100, ampereUsed: 30 };
	const paths = (input: unknown) => {
		const parsed = trafficPerformanceSchema.safeParse(input);
		return parsed.success ? [] : parsed.error.issues.map(issue => issue.path.join("."));
	};

	it("requires at least one row and every metric, without Tehran/county fields", () => {
		expect(paths({ submitMode: "single", collocationMode: "COLO", collocationRows: [row] })).toEqual([]);
		expect(paths({ submitMode: "single", collocationMode: "COLO", collocationRows: [] })).toEqual(["collocationRows"]);
		expect(paths({ submitMode: "single", collocationMode: "CP", collocationRows: [{ ...row, ampereUsed: null }] })).toEqual(["collocationRows.0.ampereUsed"]);
	});
});

describe("registered collocation performance", () => {
	const rows = [
		{ location: "GLOBAL", datacenter: 3, datacenter_name: "A", ip_count: "4", bandwidth_used: "10.5", ampere_used: "2", collocation_mode: "CP" },
		{ location: "GLOBAL", datacenter: 3, datacenter_name: "dup", ip_count: "9" },
		{ location: "TEHRAN", value: 1 },
	];

	it("rebuilds the datacenter rows from GLOBAL records only", () => {
		expect(buildCollocationRowsFromPerformances(rows)).toEqual([
			{ datacenter: 3, datacenterName: "A", ipCount: 4, bandwidthUsed: 10.5, ampereUsed: 2 },
		]);
	});

	it("reads the partner type from the saved rows", () => {
		expect(collocationModeFromPerformances(rows)).toBe("CP");
		expect(collocationModeFromPerformances([{ location: "TEHRAN" }])).toBeNull();
	});
});
