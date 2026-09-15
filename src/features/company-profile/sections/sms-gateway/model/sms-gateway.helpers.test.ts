import type { SmsGatewayCustomerDto } from "./sms-gateway.types";
import { describe, expect, it } from "vitest";
import { getOtherGatewayCustomerNames } from "./sms-gateway.helpers";

const customers: SmsGatewayCustomerDto[] = [
	{ id: 71, value: "یکتا ارتباط آسان پرداز", is_mapped: true, mapped_company_id: 122, mapped_company_name: "منطقه تهران" },
	{ id: 119, value: "معاونت ارتباطات و هماهنگی", is_mapped: true, mapped_company_id: 122, mapped_company_name: "منطقه تهران" },
	{ id: 5, value: "امین دیبا شبکه", is_mapped: true, mapped_company_id: 115, mapped_company_name: "test sms" },
	{ id: 48, value: "نواتل", is_mapped: true, mapped_company_id: 100, mapped_company_name: "نواتل" },
	{ id: 2, value: "آبادیس سلامت امروز", is_mapped: false, mapped_company_id: null, mapped_company_name: null },
];

describe("getOtherGatewayCustomerNames", () => {
	it("returns only gateway customers mapped to the selected company", () => {
		expect(getOtherGatewayCustomerNames(customers, 122, null)).toEqual([
			"یکتا ارتباط آسان پرداز",
			"معاونت ارتباطات و هماهنگی",
		]);
	});

	it("excludes the currently selected gateway customer", () => {
		expect(getOtherGatewayCustomerNames(customers, 122, 71)).toEqual([
			"معاونت ارتباطات و هماهنگی",
		]);
	});
});
