import { describe, expect, it } from "vitest";
import { formatReportMoney, formatReportNumber } from "./report-number-format";

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
