import { describe, expect, it } from "vitest";
import { formatReportMoney, formatReportNumber, toExcelHtml } from "./report-number-format";

describe("report number format", () => {
	it("groups with Persian digits and keeps decimals exact", () => {
		expect(formatReportNumber(1234567.5)).toBe("۱٬۲۳۴٬۵۶۷٫۵");
		expect(formatReportNumber(null)).toBe("-");
	});

	it("converts rial to toman without float error", () => {
		expect(formatReportMoney("1234567891234567", false)).toBe("۱۲۳٬۴۵۶٬۷۸۹٬۱۲۳٬۴۵۶٫۷");
		expect(formatReportMoney(10, false)).toBe("۱");
		expect(formatReportMoney(1000, true)).toBe("۱٬۰۰۰");
	});
});

describe("toExcelHtml", () => {
	it("turns formatted numbers into plain Latin numbers", () => {
		expect(toExcelHtml("<td style=\"w\">۱۱٬۸۰۰٫۶۲</td><td>-۱٬۰۰۰</td><td>۰</td>")).toBe("<td style=\"w\">11800.62</td><td>-1000</td><td>0</td>");
	});

	it("keeps text cells but uses Latin digits everywhere", () => {
		expect(toExcelHtml("<td>فروردین</td><td>تاریخ: ۱۴۰۵/۸/۲۳</td><th>سال ۱۴۰۵</th>")).toBe("<td>فروردین</td><td>تاریخ: 1405/8/23</td><th>سال 1405</th>");
	});

	it("leaves non-numeric placeholders untouched", () => {
		expect(toExcelHtml("<td>-</td><td></td>")).toBe("<td>-</td><td></td>");
	});
});
