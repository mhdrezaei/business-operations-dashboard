import { shareholderFormToPayload } from "./shareholders.mappers";
import { shareholderSchema } from "./shareholders.schema";

const meta = { service: 1, company: 2 };
const values = { full_name: "سهامدار", national_id: "", ownership_percent: "", note: "" };

describe("shareholder ownership percent", () => {
	it("sends null when empty and a number otherwise", () => {
		expect(shareholderFormToPayload(values, meta).ownership_percent).toBeNull();
		expect(shareholderFormToPayload({ ...values, ownership_percent: "۲۵.5" }, meta).ownership_percent).toBe(25.5);
	});

	it("accepts empty or numeric values only", () => {
		expect(shareholderSchema.safeParse(values).success).toBe(true);
		expect(shareholderSchema.safeParse({ ...values, ownership_percent: "12.5" }).success).toBe(true);
		expect(shareholderSchema.safeParse({ ...values, ownership_percent: "abc" }).success).toBe(false);
	});
});
