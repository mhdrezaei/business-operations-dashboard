import type { NotificationItem } from "#src/api/notifications/types";
import { describe, expect, it } from "vitest";
import { pickRecentNotificationsByRule } from "./home-notifications";

const item = (id: number, ruleCode: string): NotificationItem => ({ id, title: "", message: "", isRead: false, createdAt: "", type: null, avatar: null, raw: { data: { rule_code: ruleCode } } });

describe("pickRecentNotificationsByRule", () => {
	it("keeps the newest notification per rule and at most three", () => {
		const picked = pickRecentNotificationsByRule([item(1, "A"), item(2, "A"), item(3, "B"), item(4, "C"), item(5, "D")]);
		expect(picked.map(entry => entry.id)).toEqual([1, 3, 4]);
	});
});
