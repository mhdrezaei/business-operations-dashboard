import type { SignFlowListItem } from "#src/features/contract/api/contracts.api";
import type { ProFormInstance } from "@ant-design/pro-components";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import {
	getSignFlowColumns,
	RECORD_TYPE_MAP,
	SIGN_FLOW_STATE_MAP,
	SIGN_FLOW_STEP_STATE_KEYS,
} from "./constants";

describe("constants - maps and translation keys", () => {
	it("maps flow states with proper Persian labels and tag colors", () => {
		expect(SIGN_FLOW_STATE_MAP.in_progress).toEqual({ label: "در حال بررسی", color: "blue" });
		expect(SIGN_FLOW_STATE_MAP.approved).toEqual({ label: "تایید شده", color: "success" });
		expect(SIGN_FLOW_STATE_MAP.rejected).toEqual({ label: "رد شده", color: "error" });
		expect(SIGN_FLOW_STATE_MAP.cancelled).toEqual({ label: "لغو شده", color: "default" });
		expect(SIGN_FLOW_STATE_MAP.revoked).toEqual({ label: "ابطال شده", color: "warning" });
	});

	it("contains valid i18n keys for all per-step states", () => {
		expect(SIGN_FLOW_STEP_STATE_KEYS).toEqual({
			pending: "contract.signFlow.stepState.pending",
			active: "contract.signFlow.stepState.active",
			approved: "contract.signFlow.stepState.approved",
			rejected: "contract.signFlow.stepState.rejected",
			cancelled: "contract.signFlow.stepState.cancelled",
		});
	});

	it("maps record types to Persian translations", () => {
		expect(RECORD_TYPE_MAP.contract).toBe("قرارداد پایه");
		expect(RECORD_TYPE_MAP.addendum).toBe("الحاقیه");
	});
});

describe("constants - getSignFlowColumns", () => {
	const mockSubmit = vi.fn();
	const mockFormRef = {
		current: {
			submit: mockSubmit,
		} as unknown as ProFormInstance,
	};
	const mockOnView = vi.fn();
	const serviceOptions = [
		{ label: "سرویس پیامک", value: "sms" },
		{ label: "سرویس شاهکار", value: "shahkar" },
	];

	const baseRow: SignFlowListItem = {
		id: 101,
		state: "in_progress",
		service: "sms",
		service_name: "سرویس پیامک",
		company_type: null,
		contract_id: 201,
		contract_number: "CTR-2026-001",
		company_name: "شرکت داده پرداز",
		addendum_group_id: null,
		record_type: "contract",
		template_id: 1,
		template_name: "قالب استاندارد",
		rule_config_id: 1,
		current_step_order: 2,
		current_step_name: "تایید مالی",
		total_steps: 4,
		contract_start_date: "1405/01/01",
		contract_end_date: "1405/12/29",
		is_waiting_for_me: true,
		started_at: "2026-03-21T10:00:00Z",
		finished_at: null,
		cancel_reason: "",
		created_by: 10,
		created_by_username: "ali_rezaei",
		created_at: "2026-03-21T10:00:00Z",
	};

	it("triggers form submit when filter select values change", () => {
		const columns = getSignFlowColumns(serviceOptions, mockFormRef, mockOnView);

		const mineCol = columns.find(c => c.dataIndex === "mine");
		const serviceCol = columns.find(c => c.dataIndex === "service");
		const stateCol = columns.find(c => c.dataIndex === "state");
		const recordTypeCol = columns.find(c => c.dataIndex === "record_type");

		mineCol?.fieldProps?.onChange?.();
		expect(mockSubmit).toHaveBeenCalledTimes(1);

		serviceCol?.fieldProps?.onChange?.();
		expect(mockSubmit).toHaveBeenCalledTimes(2);

		stateCol?.fieldProps?.onChange?.();
		expect(mockSubmit).toHaveBeenCalledTimes(3);

		recordTypeCol?.fieldProps?.onChange?.();
		expect(mockSubmit).toHaveBeenCalledTimes(4);
	});

	it("renders service name or fallback to dash", () => {
		const columns = getSignFlowColumns(serviceOptions, mockFormRef, mockOnView);
		const col = columns.find(c => c.dataIndex === "service")!;

		expect((col.render as any)(null, baseRow)).toBe("سرویس پیامک");
		expect((col.render as any)(null, { ...baseRow, service_name: "" })).toBe("-");
	});

	it("renders translated record_type or fallback to raw value", () => {
		const columns = getSignFlowColumns(serviceOptions, mockFormRef, mockOnView);
		const col = columns.find(c => c.dataIndex === "record_type")!;

		expect((col.render as any)(null, baseRow)).toBe("قرارداد پایه");
		expect((col.render as any)(null, { ...baseRow, record_type: "addendum" })).toBe("الحاقیه");
		expect((col.render as any)(null, { ...baseRow, record_type: "other" })).toBe("other");
	});

	it("renders contract_number or fallback to dash", () => {
		const columns = getSignFlowColumns(serviceOptions, mockFormRef, mockOnView);
		const col = columns.find(c => c.dataIndex === "contract_number")!;

		expect((col.render as any)(null, baseRow)).toBe("CTR-2026-001");
		expect((col.render as any)(null, { ...baseRow, contract_number: "" })).toBe("-");
	});

	it("renders current step with step number and total count", () => {
		const columns = getSignFlowColumns(serviceOptions, mockFormRef, mockOnView);
		const col = columns.find(c => c.dataIndex === "current_step_name")!;

		expect((col.render as any)(null, baseRow)).toBe("تایید مالی (2/4)");
		expect((col.render as any)(null, { ...baseRow, current_step_name: "" })).toBe("-");
	});

	it("renders finished_at and cancel_reason properly", () => {
		const columns = getSignFlowColumns(serviceOptions, mockFormRef, mockOnView);

		const finishedCol = columns.find(c => c.dataIndex === "finished_at")!;
		expect((finishedCol.render as any)("1405/02/01", baseRow)).toBe("-");
		expect((finishedCol.render as any)("1405/02/01", { ...baseRow, finished_at: "2026-04-20" })).toBe("1405/02/01");

		const cancelCol = columns.find(c => c.dataIndex === "cancel_reason")!;
		expect((cancelCol.render as any)(null, baseRow)).toBe("-");
		expect((cancelCol.render as any)(null, { ...baseRow, cancel_reason: "عدم تایید بودجه" })).toBe("عدم تایید بودجه");
	});

	it("renders state tag with color or raw state string if unknown", () => {
		const columns = getSignFlowColumns(serviceOptions, mockFormRef, mockOnView);
		const col = columns.find(c => c.dataIndex === "state")!;

		const { container } = render((col.render as any)(null, baseRow));
		expect(container.textContent).toBe("در حال بررسی");

		// Unknown state fallback
		expect((col.render as any)(null, { ...baseRow, state: "custom_status" })).toBe("custom_status");
	});

	it("renders action button and triggers onView with record id on click", async () => {
		const columns = getSignFlowColumns(serviceOptions, mockFormRef, mockOnView);
		const col = columns.find(c => c.dataIndex === "action")!;

		const ActionButton = () => (col.render as any)(null, baseRow);
		render(<ActionButton />);

		const button = screen.getByRole("button");
		await userEvent.click(button);

		expect(mockOnView).toHaveBeenCalledWith(101);
	});
});
