import { describe, expect, it } from "vitest";
import { adminUserUpsertSchema } from "./admin-user-upsert.schema";

const base = { username: "ali_01", email: "a@b.co", first_name: "", last_name: "", mobile: "", national_code: "", is_active: true, is_staff: false };

describe("admin user upsert schema", () => {
	it("needs only username, email and a matching password on create", () => {
		const schema = adminUserUpsertSchema("create");
		expect(schema.safeParse({ ...base, password: "abc12345", confirmPassword: "abc12345" }).success).toBe(true);
		expect(schema.safeParse({ ...base, password: "", confirmPassword: "" }).success).toBe(false);
		expect(schema.safeParse({ ...base, password: "abc12345", confirmPassword: "other" }).success).toBe(false);
	});

	it("rejects Persian username or password characters", () => {
		const schema = adminUserUpsertSchema("create");
		expect(schema.safeParse({ ...base, username: "علی", password: "abc12345", confirmPassword: "abc12345" }).success).toBe(false);
		expect(schema.safeParse({ ...base, password: "رمز1234", confirmPassword: "رمز1234" }).success).toBe(false);
	});

	it("keeps the password optional on edit and mobile in 09 format", () => {
		const schema = adminUserUpsertSchema("edit");
		expect(schema.safeParse({ ...base, mobile: "09123456789" }).success).toBe(true);
		expect(schema.safeParse({ ...base, mobile: "98912345678" }).success).toBe(false);
	});

	it("requires a 4-16 character username of letters, digits, _ or -", () => {
		const schema = adminUserUpsertSchema("create");
		const password = { password: "abc12345", confirmPassword: "abc12345" };
		expect(schema.safeParse({ ...base, username: "abc", ...password }).success).toBe(false);
		expect(schema.safeParse({ ...base, username: "a".repeat(17), ...password }).success).toBe(false);
		expect(schema.safeParse({ ...base, username: "ali kh", ...password }).success).toBe(false);
		expect(schema.safeParse({ ...base, username: "ali-kh_1", ...password }).success).toBe(true);
	});
});
