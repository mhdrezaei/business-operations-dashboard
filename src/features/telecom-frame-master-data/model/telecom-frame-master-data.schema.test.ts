import { describe, expect, it } from "vitest";
import { MASTER_DATA_LEVELS, toMasterDataPayload } from "./telecom-frame-master-data.schema";

const values = { name: "نام", title: "سمت", company_types: ["A"], is_active: true };

describe("telecom frame master data payload", () => {
	it("sends name for organisational levels", () => {
		expect(toMasterDataPayload(values, false)).toEqual({ name: "نام", company_types: ["A"], is_active: true });
	});

	it("sends full_name and title for persons", () => {
		expect(toMasterDataPayload(values, true)).toEqual({ full_name: "نام", title: "سمت", company_types: ["A"], is_active: true });
	});

	it("scopes persons and general offices by their parent level", () => {
		expect(MASTER_DATA_LEVELS.generalOffice.parent?.field).toBe("department");
		expect(MASTER_DATA_LEVELS.boPerson.parent?.field).toBe("general_office");
		expect(MASTER_DATA_LEVELS.poPerson.parent?.field).toBe("division");
	});
});
