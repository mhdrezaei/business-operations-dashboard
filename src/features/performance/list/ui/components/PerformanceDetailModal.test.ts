import type { PerformanceListItem, PerformanceServicePath } from "#src/features/performance/api/performances.api";
import type { CollocationPartnerType, CollocationRow } from "#src/features/performance/shared/services/traffic/traffic-collocation";
import type { PerformanceListRow } from "../../model/performance.list.types";
import type { TrafficLocation } from "../../model/traffic-locations";
import type { EditableFieldConfig, EditFormValues, ServiceEditConfig } from "./PerformanceDetailModal";
import { toNullableNumber } from "#src/features/performance/shared/model/performance.helpers";
import { salesAgencyFieldsSchema } from "#src/features/performance/shared/services/sales-agency/sales-agency.schema";
import i18next from "i18next";
import { describe, expect, it } from "vitest";
import { isTrafficLocationRequired } from "../../model/traffic-locations";
import {
	applyOpenApiInitialValues,
	applyTrafficInitialValues,
	buildInitialValues,
	getTrafficFieldLocation,
	isEmptyValue,
	LEGACY_2_OPERATIONS,
	resolveOpenApiContractModel,
} from "./PerformanceDetailModal";

interface FormValidationError {
	field: string
	type: "required" | "validation"
	message: string
}

function applySmsInitialValues(
	initialValues: EditFormValues,
	smsBreakdownCards: Array<{ key: string, value: unknown }>,
	record?: Record<string, unknown> | null,
	isUnregisteredMode = false,
) {
	const lookup = new Map<string, unknown>();
	smsBreakdownCards.forEach((card) => {
		lookup.set(card.key, card.value);
	});
	initialValues.irancellFa = lookup.get("IRANCELL_FA") ?? null;
	initialValues.irancellEn = lookup.get("IRANCELL_EN") ?? null;
	initialValues.mciFa = lookup.get("MCI_FA") ?? null;
	initialValues.mciEn = lookup.get("MCI_EN") ?? null;
	initialValues.otherFa = lookup.get("OTHER_FA") ?? null;
	initialValues.otherEn = lookup.get("OTHER_EN") ?? null;

	if (isUnregisteredMode && record) {
		const operator = String((record as any)?.operator ?? "").trim().toUpperCase();
		const language = String((record as any)?.language ?? "").trim().toUpperCase();
		const value = (record as any)?.value;
		if (operator === "IRANCELL" && language === "FA")
			initialValues.irancellFa = value ?? initialValues.irancellFa;
		if (operator === "IRANCELL" && language === "EN")
			initialValues.irancellEn = value ?? initialValues.irancellEn;
		if (operator === "MCI" && language === "FA")
			initialValues.mciFa = value ?? initialValues.mciFa;
		if (operator === "MCI" && language === "EN")
			initialValues.mciEn = value ?? initialValues.mciEn;
		if (operator === "OTHER" && language === "FA")
			initialValues.otherFa = value ?? initialValues.otherFa;
		if (operator === "OTHER" && language === "EN")
			initialValues.otherEn = value ?? initialValues.otherEn;
	}
}

function validatePerformanceEditValues({
	values,
	visibleEditableFields,
	service,
	existingTrafficLocations,
	selectedCompanyType,
}: {
	values: Record<string, unknown>
	visibleEditableFields: EditableFieldConfig[]
	service: PerformanceServicePath | null
	existingTrafficLocations?: Set<TrafficLocation>
	selectedCompanyType?: string | null
}): { isValid: boolean, errors: FormValidationError[] } {
	const errors: FormValidationError[] = [];

	if (service === "sales-agency/outbound" || service === "sales-agency/rep-management") {
		const result = salesAgencyFieldsSchema(selectedCompanyType).safeParse(values);
		if (!result.success) {
			result.error.issues.forEach((issue) => {
				const fieldName = issue.path.join(".");
				if (fieldName) {
					errors.push({
						field: fieldName,
						type: "validation",
						message: issue.message,
					});
				}
			});
			return { isValid: false, errors };
		}
	}

	visibleEditableFields.forEach((field) => {
		if (!field.required)
			return;
		const trafficLocation = service === "traffic" ? getTrafficFieldLocation(field.key) : null;
		if (trafficLocation && existingTrafficLocations && !isTrafficLocationRequired(trafficLocation, existingTrafficLocations))
			return;
		if (!isEmptyValue(values[field.key]))
			return;
		errors.push({
			field: field.key,
			type: "required",
			message: i18next.t("performance.validation.requiredField"),
		});
	});

	visibleEditableFields.forEach((field) => {
		const numeric = toNullableNumber(values[field.key]);
		if (numeric == null || numeric >= 0)
			return;
		errors.push({
			field: field.key,
			type: "validation",
			message: i18next.t("performance.validation.base.negativeValue"),
		});
	});

	return { isValid: errors.length === 0, errors };
}

function validateCollocationRows(
	rows: CollocationRow[],
	collocationMode: CollocationPartnerType | null | undefined,
): { isValid: boolean, errorKey?: string } {
	if (!collocationMode || rows.length < 1 || rows.some(row => [row.ipCount, row.bandwidthUsed, row.ampereUsed].some(metric => metric == null))) {
		return { isValid: false, errorKey: "performance.validation.traffic.collocationFieldRequired" };
	}
	if (rows.some(row => [row.ipCount, row.bandwidthUsed, row.ampereUsed].some(metric => Number(metric) < 0))) {
		return { isValid: false, errorKey: "performance.validation.base.negativeValue" };
	}
	return { isValid: true };
}

function validateBasePerformanceIdentifiers({
	companyId,
	serviceId,
	year,
	month,
}: {
	companyId: number | null
	serviceId: number | null
	year: number | null
	month: number | null
}): boolean {
	return companyId != null && serviceId != null && year != null && month != null;
}

describe("resolveOpenApiContractModel", () => {
	describe("priority 1: direct contract_model on detail or record", () => {
		it("detects model directly from detail.contract_model", () => {
			const detail = { contract_model: "legacy_2" };
			expect(resolveOpenApiContractModel(detail, null, [])).toBe("legacy_2");
		});

		it("detects model directly from camelCase detail.contractModel", () => {
			const detail = { contractModel: "package" };
			expect(resolveOpenApiContractModel(detail, null, [])).toBe("package");
		});

		it("detects model directly from record.contract_model when detail has none", () => {
			const record = { contract_model: "legacy" } as unknown as PerformanceListRow;
			expect(resolveOpenApiContractModel(null, record, [])).toBe("legacy");
		});

		it("detects model directly from camelCase record.contractModel when detail has none", () => {
			const record = { contractModel: "legacy_2" } as unknown as PerformanceListRow;
			expect(resolveOpenApiContractModel(null, record, [])).toBe("legacy_2");
		});

		it("prioritizes detail.contract_model over record.contract_model", () => {
			const detail = { contract_model: "package" };
			const record = { contract_model: "legacy" } as unknown as PerformanceListRow;
			expect(resolveOpenApiContractModel(detail, record, [])).toBe("package");
		});

		it("normalizes case and surrounding whitespace in direct model", () => {
			expect(resolveOpenApiContractModel({ contract_model: "  LEGACY_2  " }, null, [])).toBe("legacy_2");
			expect(resolveOpenApiContractModel({ contract_model: "PACKAGE" }, null, [])).toBe("package");
			expect(resolveOpenApiContractModel({ contract_model: "Legacy" }, null, [])).toBe("legacy");
		});
	});

	describe("priority 2: nested contract_openapi_details.contract_model", () => {
		it("resolves model from detail.contract_openapi_details.contract_model", () => {
			const detail = {
				contract_openapi_details: {
					contract_model: "package",
				},
			};
			expect(resolveOpenApiContractModel(detail, null, [])).toBe("package");
		});

		it("resolves model from record.contract_openapi_details.contract_model", () => {
			const record = {
				contract_openapi_details: {
					contract_model: "legacy_2",
				},
			} as unknown as PerformanceListRow;
			expect(resolveOpenApiContractModel(null, record, [])).toBe("legacy_2");
		});

		it("prioritizes direct model over nested contract_openapi_details", () => {
			const detail = {
				contract_model: "legacy",
				contract_openapi_details: {
					contract_model: "package",
				},
			};
			expect(resolveOpenApiContractModel(detail, null, [])).toBe("legacy");
		});

		it("prioritizes detail nested model over record nested model", () => {
			const detail = {
				contract_openapi_details: { contract_model: "package" },
			};
			const record = {
				contract_openapi_details: { contract_model: "legacy_2" },
			} as unknown as PerformanceListRow;
			expect(resolveOpenApiContractModel(detail, record, [])).toBe("package");
		});
	});

	describe("priority 3: deduction from operation rows (operation_type)", () => {
		describe("deducing legacy_2", () => {
			it.each(LEGACY_2_OPERATIONS.map(op => op.type))(
				"detects legacy_2 when row has operation_type %s",
				(operationType) => {
					const rows = [{ operation_type: operationType }] as PerformanceListItem[];
					expect(resolveOpenApiContractModel(null, null, rows)).toBe("legacy_2");
				},
			);

			it("handles lowercase and whitespace in operation_type for legacy_2", () => {
				const rows = [{ operation_type: "  bill_inquiry_midterm  " }] as PerformanceListItem[];
				expect(resolveOpenApiContractModel(null, null, rows)).toBe("legacy_2");
			});
		});

		describe("deducing package", () => {
			const packageOperationTypes = [
				"TRAFFIC",
				"TRAFFIC_REVENUE",
				"TRAFFIC_PACKAGE_COUNT",
				"SMS_IRANCELL_FA",
				"SMS_IRANCELL_EN",
				"SMS_MCI_FA",
				"SMS_MCI_EN",
				"SMS_OTHER_FA",
				"SMS_OTHER_EN",
				"IRANCELL_FA",
				"IRANCELL_EN",
				"MCI_FA",
				"MCI_EN",
				"OTHER_FA",
				"OTHER_EN",
			];

			it.each(packageOperationTypes)(
				"detects package when row has operation_type %s",
				(operationType) => {
					const rows = [{ operation_type: operationType }] as PerformanceListItem[];
					expect(resolveOpenApiContractModel(null, null, rows)).toBe("package");
				},
			);

			it("handles lowercase and mixed casing in operation_type for package", () => {
				const rows = [
					{ operation_type: "sms_mci_fa" },
					{ operation_type: "traffic_revenue" },
				] as PerformanceListItem[];
				expect(resolveOpenApiContractModel(null, null, rows)).toBe("package");
			});
		});

		describe("deducing legacy", () => {
			const legacyOperationTypes = ["BILL_INQUIRY", "RECEIPT_REGISTER"];

			it.each(legacyOperationTypes)(
				"detects legacy when row has operation_type %s",
				(operationType) => {
					const rows = [{ operation_type: operationType }] as PerformanceListItem[];
					expect(resolveOpenApiContractModel(null, null, rows)).toBe("legacy");
				},
			);

			it("handles lowercase in operation_type for legacy", () => {
				const rows = [{ operation_type: "bill_inquiry" }] as PerformanceListItem[];
				expect(resolveOpenApiContractModel(null, null, rows)).toBe("legacy");
			});
		});

		describe("operation precedence in rows", () => {
			it("prioritizes legacy_2 over package and legacy when multiple operation types are present", () => {
				const rows = [
					{ operation_type: "BILL_INQUIRY" },
					{ operation_type: "TRAFFIC" },
					{ operation_type: "RECEIPT_REGISTER_CONNECTED" }, // legacy_2
				] as PerformanceListItem[];
				expect(resolveOpenApiContractModel(null, null, rows)).toBe("legacy_2");
			});

			it("prioritizes package over legacy when both are present without legacy_2", () => {
				const rows = [
					{ operation_type: "BILL_INQUIRY" }, // legacy
					{ operation_type: "SMS_MCI_FA" }, // package
				] as PerformanceListItem[];
				expect(resolveOpenApiContractModel(null, null, rows)).toBe("package");
			});
		});
	});

	describe("priority 4: fallback and unknown handling", () => {
		it("returns null when detail, record, and rows are empty/null", () => {
			expect(resolveOpenApiContractModel(null, null, [])).toBeNull();
			expect(resolveOpenApiContractModel({}, {} as PerformanceListRow, [])).toBeNull();
		});

		it("returns null when operation_type does not match any recognized OpenAPI category", () => {
			const rows = [
				{ operation_type: "UNKNOWN_OP" },
				{ operation_type: "CUSTOM_CALCULATION" },
			] as PerformanceListItem[];
			expect(resolveOpenApiContractModel(null, null, rows)).toBeNull();
		});

		it("ignores rows with empty, null, or undefined operation_type", () => {
			const rows = [
				{ operation_type: "" },
				{ operation_type: null },
				{ operation_type: undefined },
			] as unknown as PerformanceListItem[];
			expect(resolveOpenApiContractModel(null, null, rows)).toBeNull();
		});

		it("returns null when contract_model is an unrecognized string", () => {
			const detail = { contract_model: "some_unsupported_model" };
			expect(resolveOpenApiContractModel(detail, null, [])).toBeNull();
		});
	});
});

describe("initial values population", () => {
	describe("buildInitialValues", () => {
		const sampleConfig: ServiceEditConfig = {
			title: "Sample Service",
			readonlyKeys: ["company_type", "reference_code"],
			editableFields: [
				{ key: "value", label: "Value", type: "number", required: true },
				{ key: "income", label: "Income", type: "number", required: true },
			],
			payloadKeys: ["value", "income"],
		};

		it("populates base fields directly from detail when present", () => {
			const detail = {
				company: 10,
				service: 2,
				sh_year: 1404,
				sh_month: 6,
				value: 100,
				income: 200,
				company_type: "CP",
			};
			const fallback = {};
			const values = buildInitialValues(sampleConfig, "psp", detail, fallback);

			expect(values.company).toBe(10);
			expect(values.service).toBe(2);
			expect(values.sh_year).toBe(1404);
			expect(values.sh_month).toBe(6);
			expect(values.value).toBe(100);
			expect(values.income).toBe(200);
			expect(values.company_type).toBe("CP");
		});

		it("falls back to recordFallback for base fields when detail lacks them", () => {
			const detail = { value: 50 };
			const fallback = {
				company_id: 25,
				service_id: 4,
				sh_year: 1403,
				sh_month: 11,
				income: 90,
			};
			const values = buildInitialValues(sampleConfig, "psp", detail, fallback);

			expect(values.company).toBe(25);
			expect(values.service).toBe(4);
			expect(values.sh_year).toBe(1403);
			expect(values.sh_month).toBe(11);
			expect(values.value).toBe(50);
			expect(values.income).toBe(90);
		});

		it("populates sales_agent for sms-commission from record fallback", () => {
			const config: ServiceEditConfig = {
				title: "SMS Commission",
				readonlyKeys: ["sales_agent"],
				editableFields: [],
				payloadKeys: ["sales_agent"],
			};
			const detail = {};
			const fallback = { sales_agent_id: 88 };
			const values = buildInitialValues(config, "sms-commission", detail, fallback);

			expect(values.sales_agent).toBe(88);
		});

		it("populates new_customer_count for shahkar when camelCase newCustomerCount exists", () => {
			const config: ServiceEditConfig = {
				title: "Shahkar",
				readonlyKeys: [],
				editableFields: [{ key: "value", label: "Value", type: "number" }],
				payloadKeys: ["value", "new_customer_count"],
			};
			const detail = { newCustomerCount: 15 };
			const fallback = {};
			const values = buildInitialValues(config, "shahkar", detail, fallback);

			expect(values.new_customer_count).toBe(15);
		});
	});

	describe("applyOpenApiInitialValues", () => {
		it("populates legacy_2 operations and wallet_was_charged flag", () => {
			const initialValues: EditFormValues = {};
			const detail = {};
			const fallback = {};
			const rows: PerformanceListItem[] = [
				{ operation_type: "BILL_INQUIRY_MIDTERM", value: 10, wallet_was_charged: true } as unknown as PerformanceListItem,
				{ operation_type: "BILL_INQUIRY_ENDTERM", value: 20, wallet_was_charged: true } as unknown as PerformanceListItem,
				{ operation_type: "RECEIPT_REGISTER_CONNECTED", value: 30, wallet_was_charged: true } as unknown as PerformanceListItem,
				{ operation_type: "RECEIPT_REGISTER_DISCONNECTED", value: 40, wallet_was_charged: true } as unknown as PerformanceListItem,
			];

			applyOpenApiInitialValues(initialValues, detail, fallback, rows);

			expect(initialValues.bill_inquiry_midterm_value).toBe(10);
			expect(initialValues.bill_inquiry_endterm_value).toBe(20);
			expect(initialValues.receipt_register_connected_value).toBe(30);
			expect(initialValues.receipt_register_disconnected_value).toBe(40);
			expect(initialValues.wallet_was_charged).toBe(true);
		});

		it("populates legacy operations bill_inquiry_value and receipt_register_value", () => {
			const initialValues: EditFormValues = {};
			const detail = { bill_inquiry_value: 120 };
			const fallback = {};
			const rows: PerformanceListItem[] = [
				{ operation_type: "RECEIPT_REGISTER", value: 250 } as unknown as PerformanceListItem,
			];

			applyOpenApiInitialValues(initialValues, detail, fallback, rows);

			expect(initialValues.bill_inquiry_value).toBe(120);
			expect(initialValues.receipt_register_value).toBe(250);
		});

		it("populates package operations traffic and sms values", () => {
			const initialValues: EditFormValues = {};
			const detail = {};
			const fallback = {};
			const rows: PerformanceListItem[] = [
				{ operation_type: "TRAFFIC", income: 500, value: 1000 } as unknown as PerformanceListItem,
				{ operation_type: "SMS_IRANCELL_FA", value: 11 } as unknown as PerformanceListItem,
				{ operation_type: "SMS_IRANCELL_EN", value: 22 } as unknown as PerformanceListItem,
				{ operation_type: "SMS_MCI_FA", value: 33 } as unknown as PerformanceListItem,
				{ operation_type: "SMS_MCI_EN", value: 44 } as unknown as PerformanceListItem,
				{ operation_type: "SMS_OTHER_FA", value: 55 } as unknown as PerformanceListItem,
				{ operation_type: "SMS_OTHER_EN", value: 66 } as unknown as PerformanceListItem,
			];

			applyOpenApiInitialValues(initialValues, detail, fallback, rows);

			expect(initialValues.traffic_income).toBe(500);
			expect(initialValues.traffic_package_count).toBe(1000);
			expect(initialValues.sms_irancell_fa).toBe(11);
			expect(initialValues.sms_irancell_en).toBe(22);
			expect(initialValues.sms_mci_fa).toBe(33);
			expect(initialValues.sms_mci_en).toBe(44);
			expect(initialValues.sms_other_fa).toBe(55);
			expect(initialValues.sms_other_en).toBe(66);
		});

		it("prioritizes direct values in detail over rows", () => {
			const initialValues: EditFormValues = {};
			const detail = { sms_mci_fa: 999 };
			const fallback = {};
			const rows: PerformanceListItem[] = [
				{ operation_type: "SMS_MCI_FA", value: 111 } as unknown as PerformanceListItem,
			];

			applyOpenApiInitialValues(initialValues, detail, fallback, rows);

			expect(initialValues.sms_mci_fa).toBe(999);
		});
	});

	describe("applyTrafficInitialValues", () => {
		it("extracts and maps Tehran and County rows with conversion ratios", () => {
			const initialValues: EditFormValues = {};
			const detail = {
				traffic_locations: [
					{ location: "TEHRAN", value: 100, value_receive: 80, conversion_ratio: "1.2" },
					{ location: "COUNTY", value: 200, value_receive: 160, conversion_ratio: 0.8 },
				],
			};
			const fallback = {};

			applyTrafficInitialValues(initialValues, detail, fallback, []);

			expect(initialValues.tehranValue).toBe(100);
			expect(initialValues.tehranValueReceive).toBe(80);
			expect(initialValues.tehranConversionRatio).toBe(1.2);
			expect(initialValues.countyValue).toBe(200);
			expect(initialValues.countyValueReceive).toBe(160);
			expect(initialValues.countyConversionRatio).toBe(0.8);
		});

		it("sets null for missing location and null conversion ratio", () => {
			const initialValues: EditFormValues = {};
			const detail = {
				traffic_locations: [
					{ location: "TEHRAN", value: 50, value_receive: 40, conversion_ratio: null },
				],
			};

			applyTrafficInitialValues(initialValues, detail, {}, []);

			expect(initialValues.tehranValue).toBe(50);
			expect(initialValues.tehranValueReceive).toBe(40);
			expect(initialValues.tehranConversionRatio).toBeNull();
			expect(initialValues.countyValue).toBeNull();
			expect(initialValues.countyValueReceive).toBeNull();
			expect(initialValues.countyConversionRatio).toBeNull();
		});

		it("supports direct rows in rows array when traffic_locations is not nested", () => {
			const initialValues: EditFormValues = {};
			const rows: PerformanceListItem[] = [
				{ location: "TEHRAN", value: 300, value_receive: 250 } as unknown as PerformanceListItem,
				{ location: "COUNTY", value: 400, value_receive: 350 } as unknown as PerformanceListItem,
			];

			applyTrafficInitialValues(initialValues, {}, {}, rows);

			expect(initialValues.tehranValue).toBe(300);
			expect(initialValues.tehranValueReceive).toBe(250);
			expect(initialValues.countyValue).toBe(400);
			expect(initialValues.countyValueReceive).toBe(350);
		});
	});

	describe("applySmsInitialValues", () => {
		const breakdownCards = [
			{ key: "IRANCELL_FA", value: 100 },
			{ key: "IRANCELL_EN", value: 200 },
			{ key: "MCI_FA", value: 300 },
			{ key: "MCI_EN", value: 400 },
			{ key: "OTHER_FA", value: 500 },
			{ key: "OTHER_EN", value: 600 },
		];

		it("maps 6 breakdown cards to respective initial fields", () => {
			const initialValues: EditFormValues = {};
			applySmsInitialValues(initialValues, breakdownCards);

			expect(initialValues.irancellFa).toBe(100);
			expect(initialValues.irancellEn).toBe(200);
			expect(initialValues.mciFa).toBe(300);
			expect(initialValues.mciEn).toBe(400);
			expect(initialValues.otherFa).toBe(500);
			expect(initialValues.otherEn).toBe(600);
		});

		it("assigns null for missing cards", () => {
			const initialValues: EditFormValues = {};
			applySmsInitialValues(initialValues, [{ key: "MCI_FA", value: 777 }]);

			expect(initialValues.mciFa).toBe(777);
			expect(initialValues.irancellFa).toBeNull();
			expect(initialValues.irancellEn).toBeNull();
			expect(initialValues.mciEn).toBeNull();
			expect(initialValues.otherFa).toBeNull();
			expect(initialValues.otherEn).toBeNull();
		});

		it("in unregistered mode, updates the specific operator and language from record", () => {
			const initialValues: EditFormValues = {};
			const record = { operator: "IRANCELL", language: "FA", value: 999 };

			applySmsInitialValues(initialValues, breakdownCards, record, true);

			// IRANCELL_FA should be overwritten by record.value
			expect(initialValues.irancellFa).toBe(999);
			// Others remain from cards
			expect(initialValues.irancellEn).toBe(200);
			expect(initialValues.mciFa).toBe(300);
		});

		it("in unregistered mode, handles case-insensitive operator and language", () => {
			const initialValues: EditFormValues = {};
			const record = { operator: "mci", language: "en", value: 888 };

			applySmsInitialValues(initialValues, breakdownCards, record, true);

			expect(initialValues.mciEn).toBe(888);
			expect(initialValues.mciFa).toBe(300);
		});
	});
});

describe("form validation helpers", () => {
	describe("isEmptyValue", () => {
		it("returns true for null or undefined", () => {
			expect(isEmptyValue(null)).toBe(true);
			expect(isEmptyValue(undefined)).toBe(true);
		});

		it("returns true for empty string or whitespace-only string", () => {
			expect(isEmptyValue("")).toBe(true);
			expect(isEmptyValue("   ")).toBe(true);
			expect(isEmptyValue("\t\n")).toBe(true);
		});

		it("returns false for non-empty string", () => {
			expect(isEmptyValue("0")).toBe(false);
			expect(isEmptyValue("hello")).toBe(false);
		});

		it("returns false for numbers including 0", () => {
			expect(isEmptyValue(0)).toBe(false);
			expect(isEmptyValue(100)).toBe(false);
			expect(isEmptyValue(-5)).toBe(false);
		});

		it("returns false for booleans", () => {
			expect(isEmptyValue(false)).toBe(false);
			expect(isEmptyValue(true)).toBe(false);
		});
	});

	describe("getTrafficFieldLocation", () => {
		it("identifies TEHRAN fields correctly", () => {
			expect(getTrafficFieldLocation("tehranValue")).toBe("TEHRAN");
			expect(getTrafficFieldLocation("tehranValueReceive")).toBe("TEHRAN");
			expect(getTrafficFieldLocation("tehranConversionRatio")).toBe("TEHRAN");
		});

		it("identifies COUNTY fields correctly", () => {
			expect(getTrafficFieldLocation("countyValue")).toBe("COUNTY");
			expect(getTrafficFieldLocation("countyValueReceive")).toBe("COUNTY");
			expect(getTrafficFieldLocation("countyConversionRatio")).toBe("COUNTY");
		});

		it("returns null for non-traffic fields", () => {
			expect(getTrafficFieldLocation("value")).toBeNull();
			expect(getTrafficFieldLocation("income")).toBeNull();
			expect(getTrafficFieldLocation("company_type")).toBeNull();
		});
	});

	describe("validatePerformanceEditValues", () => {
		const sampleFields: EditableFieldConfig[] = [
			{ key: "value", label: "Value", type: "number", required: true },
			{ key: "income", label: "Income", type: "number", required: true },
			{ key: "description", label: "Description", type: "text", required: false },
		];

		it("passes when all required fields have valid non-negative values", () => {
			const result = validatePerformanceEditValues({
				values: { value: 100, income: 50, description: "" },
				visibleEditableFields: sampleFields,
				service: "psp",
			});
			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it("allows value of 0 for required fields", () => {
			const result = validatePerformanceEditValues({
				values: { value: 0, income: 0 },
				visibleEditableFields: sampleFields,
				service: "psp",
			});
			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it("flags required error when a required field is empty or missing", () => {
			const result = validatePerformanceEditValues({
				values: { value: null, income: "   " },
				visibleEditableFields: sampleFields,
				service: "psp",
			});
			expect(result.isValid).toBe(false);
			expect(result.errors).toHaveLength(2);
			expect(result.errors[0]?.field).toBe("value");
			expect(result.errors[0]?.type).toBe("required");
			expect(result.errors[1]?.field).toBe("income");
			expect(result.errors[1]?.type).toBe("required");
		});

		it("flags validation error when a numeric field is negative", () => {
			const result = validatePerformanceEditValues({
				values: { value: -10, income: 50 },
				visibleEditableFields: sampleFields,
				service: "psp",
			});
			expect(result.isValid).toBe(false);
			const negativeError = result.errors.find((e: FormValidationError) => e.field === "value" && e.type === "validation");
			expect(negativeError).toBeDefined();
		});

		describe("traffic location-based requirements", () => {
			const trafficFields: EditableFieldConfig[] = [
				{ key: "tehranValue", label: "Tehran Value", type: "number", required: true },
				{ key: "tehranValueReceive", label: "Tehran Receive", type: "number", required: true },
				{ key: "countyValue", label: "County Value", type: "number", required: true },
				{ key: "countyValueReceive", label: "County Receive", type: "number", required: true },
			];

			it("does NOT require County fields when existingTrafficLocations only contains TEHRAN", () => {
				const result = validatePerformanceEditValues({
					values: {
						tehranValue: 100,
						tehranValueReceive: 200,
						countyValue: null,
						countyValueReceive: null,
					},
					visibleEditableFields: trafficFields,
					service: "traffic",
					existingTrafficLocations: new Set(["TEHRAN"]),
				});
				expect(result.isValid).toBe(true);
				expect(result.errors).toEqual([]);
			});

			it("requires County fields when existingTrafficLocations contains COUNTY", () => {
				const result = validatePerformanceEditValues({
					values: {
						tehranValue: 100,
						tehranValueReceive: 200,
						countyValue: null,
						countyValueReceive: null,
					},
					visibleEditableFields: trafficFields,
					service: "traffic",
					existingTrafficLocations: new Set(["TEHRAN", "COUNTY"]),
				});
				expect(result.isValid).toBe(false);
				expect(result.errors.some((e: FormValidationError) => e.field === "countyValue")).toBe(true);
				expect(result.errors.some((e: FormValidationError) => e.field === "countyValueReceive")).toBe(true);
			});

			it("requires Tehran fields even when existingTrafficLocations is empty", () => {
				const result = validatePerformanceEditValues({
					values: {
						tehranValue: null,
						tehranValueReceive: null,
						countyValue: null,
						countyValueReceive: null,
					},
					visibleEditableFields: trafficFields,
					service: "traffic",
					existingTrafficLocations: new Set(),
				});
				expect(result.isValid).toBe(false);
				expect(result.errors.some((e: FormValidationError) => e.field === "tehranValue")).toBe(true);
				expect(result.errors.some((e: FormValidationError) => e.field === "tehranValueReceive")).toBe(true);
				// County should not be required when existing is empty
				expect(result.errors.some((e: FormValidationError) => e.field === "countyValue")).toBe(false);
			});
		});

		describe("sales-agency zod validation", () => {
			it("validates outbound service with valid total_sales", () => {
				const result = validatePerformanceEditValues({
					values: { total_sales: 500000 },
					visibleEditableFields: [{ key: "total_sales", label: "Total", type: "number", required: true }],
					service: "sales-agency/outbound",
					selectedCompanyType: "OUTBOUND",
				});
				expect(result.isValid).toBe(true);
			});

			it("rejects outbound service with negative total_sales via schema", () => {
				const result = validatePerformanceEditValues({
					values: { total_sales: -100 },
					visibleEditableFields: [{ key: "total_sales", label: "Total", type: "number", required: true }],
					service: "sales-agency/outbound",
					selectedCompanyType: "OUTBOUND",
				});
				expect(result.isValid).toBe(false);
				expect(result.errors.some((e: FormValidationError) => e.field === "total_sales")).toBe(true);
			});

			it("validates rep-management service with valid credit_total, income, and cost_items", () => {
				const result = validatePerformanceEditValues({
					values: {
						credit_total: 10000,
						income: 20000,
						cost_items: [{ cost_title: "Marketing", amount: 5000 }],
					},
					visibleEditableFields: [
						{ key: "credit_total", label: "Credit", type: "number", required: true },
						{ key: "income", label: "Income", type: "number", required: true },
					],
					service: "sales-agency/rep-management",
					selectedCompanyType: "SALES_REP_MANAGEMENT",
				});
				expect(result.isValid).toBe(true);
			});

			it("rejects rep-management service when cost_items is empty", () => {
				const result = validatePerformanceEditValues({
					values: {
						credit_total: 10000,
						income: 20000,
						cost_items: [],
					},
					visibleEditableFields: [],
					service: "sales-agency/rep-management",
					selectedCompanyType: "SALES_REP_MANAGEMENT",
				});
				expect(result.isValid).toBe(false);
				expect(result.errors.some((e: FormValidationError) => e.field === "cost_items")).toBe(true);
			});
		});
	});

	describe("validateCollocationRows", () => {
		const validRow: CollocationRow = {
			datacenter: 1,
			datacenterName: "Datacenter 1",
			ipCount: 5,
			bandwidthUsed: 100,
			ampereUsed: 20,
		};

		it("passes when collocationMode is provided and all rows have valid non-negative metrics", () => {
			const result = validateCollocationRows([validRow], "COLO");
			expect(result.isValid).toBe(true);
		});

		it("fails when collocationMode is null or undefined", () => {
			const result = validateCollocationRows([validRow], null);
			expect(result.isValid).toBe(false);
			expect(result.errorKey).toBe("performance.validation.traffic.collocationFieldRequired");
		});

		it("fails when rows array is empty", () => {
			const result = validateCollocationRows([], "CP");
			expect(result.isValid).toBe(false);
			expect(result.errorKey).toBe("performance.validation.traffic.collocationFieldRequired");
		});

		it("fails when any metric in a row is null or undefined", () => {
			const result = validateCollocationRows([{ ...validRow, ipCount: null }], "COLO");
			expect(result.isValid).toBe(false);
			expect(result.errorKey).toBe("performance.validation.traffic.collocationFieldRequired");
		});

		it("fails when any metric in a row is negative", () => {
			const result = validateCollocationRows([{ ...validRow, ampereUsed: -2 }], "COLO");
			expect(result.isValid).toBe(false);
			expect(result.errorKey).toBe("performance.validation.base.negativeValue");
		});
	});

	describe("validateBasePerformanceIdentifiers", () => {
		it("returns true when all base identifiers are valid numbers", () => {
			expect(validateBasePerformanceIdentifiers({
				companyId: 10,
				serviceId: 2,
				year: 1404,
				month: 5,
			})).toBe(true);
		});

		it("returns false if any base identifier is null", () => {
			expect(validateBasePerformanceIdentifiers({ companyId: null, serviceId: 2, year: 1404, month: 5 })).toBe(false);
			expect(validateBasePerformanceIdentifiers({ companyId: 10, serviceId: null, year: 1404, month: 5 })).toBe(false);
			expect(validateBasePerformanceIdentifiers({ companyId: 10, serviceId: 2, year: null, month: 5 })).toBe(false);
			expect(validateBasePerformanceIdentifiers({ companyId: 10, serviceId: 2, year: 1404, month: null })).toBe(false);
		});
	});
});
