import type { SmsOperatorInvoice } from "#src/features/performance/api/performances.api";
import { dayjs } from "#src/shared/lib/dayjs-jalali";
import { describe, expect, it } from "vitest";
import {
	buildTrafficReportPayload,
	formatInvoiceDifference,
	formatNullableNumber,
	getInvoiceDifference,
	getInvoiceYears,
	getNextFreeOperator,
	getTakenOperators,
	sortOperatorInvoices,
	trafficStatusColor,
} from "./sms-gateway-report";

const invoice = (id: number, sh_year: number, sh_month: number, operator: SmsOperatorInvoice["operator"]): SmsOperatorInvoice => ({ id, sh_year, sh_month, operator, fa_count: 0, en_count: 0, fa_cost: 0, en_cost: 0 });

describe("sms gateway report model", () => {
	it("classifies delivery statuses by substring", () => {
		expect(trafficStatusColor("DELIVRD")).toBe("success");
		expect(trafficStatusColor("DELIVERED")).toBe("success");
		expect(trafficStatusColor("UNDELIV")).toBe("error");
		expect(trafficStatusColor("UNDELIVERED")).toBe("error");
		expect(trafficStatusColor("Pending")).toBe("warning");
		expect(trafficStatusColor("whatever")).toBe("default");
	});

	it("builds the backend payload with Gregorian dates and numeric ids", () => {
		const payload = buildTrafficReportPayload({ dateFrom: dayjs(new Date(2026, 1, 1)), dateTo: null, companyId: 5, operator: "MCI", deliveryStatusId: 2 });
		expect(payload).toEqual({ date_from: "2026-02-01", date_to: undefined, company_id: 5, operator: "MCI", delivery_status_id: 2 });
	});

	it("lists years from 1404 to the current Jalali year + 5", () => {
		expect(getInvoiceYears(1405)).toEqual([1404, 1405, 1406, 1407, 1408, 1409, 1410]);
		const current = dayjs().year();
		expect(current).toBeGreaterThanOrEqual(1404);
		expect(current).toBeLessThan(1600);
	});

	it("keeps unregistered invoices as dashes without a fake difference", () => {
		const format = (value: number) => String(value);
		expect(formatNullableNumber(null, format)).toBe("—");
		expect(formatNullableNumber(0, format)).toBe("0");
		expect(getInvoiceDifference(null, 10)).toBeNull();
		expect(formatInvoiceDifference(getInvoiceDifference(null, 10), format)).toBe("—");
		expect(formatInvoiceDifference(getInvoiceDifference(5, 10), format)).toBe("−5");
		expect(formatInvoiceDifference(getInvoiceDifference(12, 10), format)).toBe("+2");
		expect(formatInvoiceDifference(0, format)).toBe("0");
	});

	it("finds taken and next free operators, ignoring the edited record", () => {
		const invoices = [invoice(1, 1405, 1, "MCI"), invoice(2, 1405, 1, "IRANCELL")];
		expect([...getTakenOperators(invoices, 1405, 1)]).toEqual(["MCI", "IRANCELL"]);
		expect([...getTakenOperators(invoices, 1405, 1, 1)]).toEqual(["IRANCELL"]);
		expect(getNextFreeOperator(getTakenOperators(invoices, 1405, 1))).toBe("RIGHTEL");
		expect(getNextFreeOperator(new Set(["MCI", "IRANCELL", "RIGHTEL"]))).toBeUndefined();
	});

	it("sorts year/month descending then operator by default, or by the chosen column", () => {
		const invoices = [invoice(1, 1404, 12, "MCI"), invoice(2, 1405, 1, "RIGHTEL"), invoice(3, 1405, 1, "IRANCELL")];
		expect(sortOperatorInvoices(invoices).map(item => item.id)).toEqual([3, 2, 1]);
		expect(sortOperatorInvoices(invoices, { sh_year: "ascend" }).map(item => item.id)).toEqual([1, 3, 2]);
		expect(sortOperatorInvoices(invoices, { operator: "descend" }).map(item => item.id)).toEqual([2, 1, 3]);
	});
});
