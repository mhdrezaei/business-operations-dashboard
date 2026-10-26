import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import { divideDecimalStringByTen, formatCollocationUsage, formatDecimal, formatSummaryNumber } from "./predictions-summary-format";

describe("divideDecimalStringByTen", () => {
	it("moves the decimal point without float errors", () => {
		expect(divideDecimalStringByTen("123456789012345678")).toBe("12345678901234567.8");
		expect(divideDecimalStringByTen("120")).toBe("12");
		expect(divideDecimalStringByTen("5")).toBe("0.5");
		expect(divideDecimalStringByTen("0.05")).toBe("0.005");
		expect(divideDecimalStringByTen("-1234.50")).toBe("-123.45");
		expect(divideDecimalStringByTen("0")).toBe("0");
	});
});

describe("formatDecimal", () => {
	it("groups digits and keeps all decimals", () => {
		expect(formatDecimal("1234567.1234567")).toBe("۱٬۲۳۴٬۵۶۷٫۱۲۳۴۵۶۷");
		expect(formatDecimal(null)).toBe("-");
		expect(formatDecimal("")).toBe("-");
	});
});

describe("formatSummaryNumber", () => {
	it("converts only financial metrics to toman", () => {
		expect(formatSummaryNumber("1000005", "income", false)).toBe("۱۰۰٬۰۰۰٫۵");
		expect(formatSummaryNumber("1000005", "new_customer_income", false)).toBe("۱۰۰٬۰۰۰٫۵");
		expect(formatSummaryNumber("1000005", "value", false)).toBe("۱٬۰۰۰٬۰۰۵");
		expect(formatSummaryNumber("1000005", "income", true)).toBe("۱٬۰۰۰٬۰۰۵");
	});
});

const COLLOCATION_LABELS: Record<string, string> = {
	"performance.predictionsSummary.collocation.rackFull": "رک کامل",
	"performance.predictionsSummary.collocation.rackQuarter": "ربع‌رک",
	"performance.predictionsSummary.collocation.ip": "IP",
	"performance.predictionsSummary.collocation.port": "پورت",
	"performance.predictionsSummary.collocation.bandwidth": "BW",
	"performance.columns.ampereUsed": "آمپر",
};
const t = ((key: string) => COLLOCATION_LABELS[key] ?? key) as TFunction;

describe("formatCollocationUsage", () => {
	it("lists present rack counts then resources", () => {
		expect(formatCollocationUsage({ rack_full_count: "2", rack_quarter_count: 1, ip_count: 4, port_count: 3 }, t))
			.toBe("رک کامل: ۲ | ربع‌رک: ۱ | IP: ۴ | پورت: ۳ | BW: - | آمپر: -");
	});
});
