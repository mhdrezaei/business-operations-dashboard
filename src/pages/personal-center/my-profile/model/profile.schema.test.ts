import { describe, expect, it } from "vitest";
import { buildProfileUpdatePayload, hasNonMobileProfileChanges, myProfileUpsertSchema } from "./profile.schema";

const profile = { username: "ali_01", first_name: "", last_name: "", email: "", mobile: "09123456789", national_code: "", password: "", newPassword: "", ConfirmNewPassword: "" };

describe("profile password change", () => {
	it("requires both the current and the new password", () => {
		expect(myProfileUpsertSchema.safeParse({ ...profile, newPassword: "x1", ConfirmNewPassword: "x1" }).success).toBe(false);
		expect(myProfileUpsertSchema.safeParse({ ...profile, password: "old", newPassword: "x1", ConfirmNewPassword: "x1" }).success).toBe(true);
	});

	it("rejects Persian characters in username and passwords", () => {
		expect(myProfileUpsertSchema.safeParse({ ...profile, username: "علی" }).success).toBe(false);
	});

	it("sends the backend password keys only when both fields are filled", () => {
		const parsed = myProfileUpsertSchema.parse({ ...profile, password: "old", newPassword: "new1", ConfirmNewPassword: "new1" });
		expect(buildProfileUpdatePayload(parsed)).toMatchObject({ current_password: "old", new_password: "new1" });
		expect(buildProfileUpdatePayload(parsed)).not.toHaveProperty("password");
		expect(buildProfileUpdatePayload(myProfileUpsertSchema.parse(profile))).not.toHaveProperty("current_password");
	});

	it("turns empty optional values into null", () => {
		expect(buildProfileUpdatePayload(myProfileUpsertSchema.parse(profile))).toMatchObject({ first_name: null, last_name: null, email: null, national_code: null });
	});

	it("detects changes other than the mobile number", () => {
		const initial = myProfileUpsertSchema.parse(profile);
		expect(hasNonMobileProfileChanges(initial, { ...initial, mobile: "09120000000" })).toBe(false);
		expect(hasNonMobileProfileChanges(initial, { ...initial, first_name: "علی" })).toBe(true);
	});

	it("requires a 4-16 character username", () => {
		expect(myProfileUpsertSchema.safeParse({ ...profile, username: "abc" }).success).toBe(false);
		expect(myProfileUpsertSchema.safeParse({ ...profile, username: "a".repeat(17) }).success).toBe(false);
	});
});
