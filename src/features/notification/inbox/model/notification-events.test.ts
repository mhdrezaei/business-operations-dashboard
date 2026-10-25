import type { NotificationItem } from "#src/api/notifications/types";
import { describe, expect, it } from "vitest";
import { getCompactNotificationBody, hasNotificationRule, isPendingAggregateRuleCode, resolveNotificationCategoryId, resolveRuleCode } from "./notification-events";
import { buildNotificationContractEditPath, buildNotificationPerformanceNewTarget, buildNotificationSignFlowPath } from "./notification-targets";

function notification(overrides: Partial<NotificationItem> & { data?: Record<string, unknown> }): NotificationItem {
	const { data, ...rest } = overrides;
	return { id: 1, title: "t", message: "m", isRead: false, createdAt: "", type: null, avatar: null, raw: { data }, ...rest };
}

describe("notification event helpers", () => {
	it("maps categories to backend rule codes", () => {
		expect(resolveRuleCode("all")).toBeUndefined();
		expect(resolveRuleCode("sign_pending")).toBe("SIGN_PENDING");
		expect(isPendingAggregateRuleCode("BUSINESS_APPROVAL_PENDING")).toBe(true);
		expect(isPendingAggregateRuleCode("CONTRACT_EXPIRY")).toBe(false);
	});

	it("detects the rule from event_type or data.rule_code", () => {
		expect(hasNotificationRule(notification({ type: "real_sign_flow_started" }), "REAL_SIGN_FLOW")).toBe(true);
		expect(hasNotificationRule(notification({ data: { rule_code: "SIGN_PENDING" } }), "SIGN_PENDING")).toBe(true);
		expect(resolveNotificationCategoryId(notification({ data: { rule_code: "CONTRACT_EXPIRY" } }))).toBe("contract_expiry");
		expect(resolveNotificationCategoryId(notification({}))).toBe("all");
	});

	it("rewrites the month phrase and cuts missing-performance bodies", () => {
		expect(getCompactNotificationBody(notification({ message: "برای ماه ۱۴۰۴/۰۵ عملکرد" }))).toBe("در مرداد ماه سال 1404 عملکرد");
		const missing = notification({ type: "PERFORMANCE_MISSING_PREV_MONTH", message: "عملکرد ثبت نشده است. لطفا ثبت کنید" });
		expect(getCompactNotificationBody(missing)).toBe("عملکرد ثبت نشده است");
	});
});

describe("notification targets", () => {
	const serviceCodeById = new Map([[4, "traffic"], [5, "sms"]]);

	it("builds the contract edit path from the service id", () => {
		const path = buildNotificationContractEditPath({ data: { service_id: 4 }, serviceCodeById }, { contract_id: 9, company_type: "CP" });
		expect(path).toBe("/contracts/edit?contractId=9&service=traffic&serviceId=4&companyType=CP");
	});

	it("routes SMS vendor rows to the vendor contract", () => {
		const path = buildNotificationContractEditPath({ data: { service_id: 5 }, serviceCodeById }, { contract_id: 3, company_name: "SMS_VENDOR" });
		expect(path).toContain("service=sms%2Fvendor");
	});

	it("returns null when the service cannot be resolved", () => {
		expect(buildNotificationContractEditPath({ data: { service_id: 99 }, serviceCodeById }, { contract_id: 1 })).toBeNull();
	});

	it("prefills the performance form for the notification period", () => {
		const path = buildNotificationPerformanceNewTarget({ data: { service_id: 4, target_sh_year: 1404, target_sh_month: 5 }, serviceCodeById }, { company_id: 7, company_type: "CP" });
		expect(path).toContain("/performances/new?source=unregistered");
		expect(path).toContain("sh_year=1404");
		expect(path).toContain("company_id=7");
	});

	it("opens the sign flow by id", () => {
		expect(buildNotificationSignFlowPath({ flow_id: 12 })).toBe("/contracts/sign-flows/12");
		expect(buildNotificationSignFlowPath({})).toBeNull();
	});
});
