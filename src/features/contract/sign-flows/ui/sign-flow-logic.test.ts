import type { SignFlowDetail, SignFlowStep } from "#src/features/contract/api/contracts.api";
import { dayjs } from "#src/shared/lib/dayjs-jalali";
import { describe, expect, it } from "vitest";
import { SIGN_FLOW_STEP_STATE_KEYS } from "./constants";

/**
 * Pure helper and logic functions mirroring the exact business rules inside SignFlowDetail
 * without altering or touching the source component.
 */

function formatDate(dateString?: string | null): string {
	if (!dateString)
		return "-";
	return dayjs(dateString).format("YYYY/MM/DD HH:mm");
}

function checkIsCreator(
	user: { id?: string | number | null, username?: string | null },
	detail?: Pick<SignFlowDetail, "created_by" | "created_by_username"> | null,
): boolean {
	return Boolean(
		detail
		&& (
			(detail.created_by != null && Number(user.id) === Number(detail.created_by))
			|| (Boolean(detail.created_by_username) && user.username === detail.created_by_username)
		),
	);
}

function checkCanCancel(
	isFullAdmin: boolean,
	isCreator: boolean,
	state?: string,
): boolean {
	return (isFullAdmin || isCreator) && state === "in_progress";
}

function checkCanRevoke(
	isFullAdmin: boolean,
	state?: string,
): boolean {
	return isFullAdmin && state === "approved";
}

function checkIsStepApprover(
	user: { id?: string | number | null, username?: string | null },
	detail?: Pick<SignFlowDetail, "is_waiting_for_me" | "current_step_order" | "steps"> | null,
): boolean {
	const currentActiveStep = detail?.steps?.find(s => s.order === detail?.current_step_order);
	return Boolean(
		detail?.is_waiting_for_me
		|| currentActiveStep?.recipients?.some(r => Number(r.user_id) === Number(user.id) || r.username === user.username)
		|| currentActiveStep?.assignments?.some(a => Number(a.user_id) === Number(user.id) || a.username === user.username),
	);
}

function checkCanDecide(
	state?: string,
	isStepApprover?: boolean,
): boolean {
	return state === "in_progress" && Boolean(isStepApprover);
}

function mapStepStatus(stepState: string): "wait" | "process" | "finish" | "error" {
	if (stepState === "active")
		return "process";
	if (stepState === "approved")
		return "finish";
	if (stepState === "rejected")
		return "error";
	return "wait";
}

describe("sign-flow logic - formatDate", () => {
	it("returns dash for null, undefined or empty strings", () => {
		expect(formatDate(null)).toBe("-");
		expect(formatDate(undefined)).toBe("-");
		expect(formatDate("")).toBe("-");
	});

	it("formats an ISO timestamp into a Jalali date string", () => {
		const result = formatDate("2026-03-21T08:30:00Z");
		expect(result).toMatch(/^1405\/01\/01/);
	});
});

describe("sign-flow logic - checkIsCreator", () => {
	const user = { id: 42, username: "ali_developer" };

	it("identifies creator when user.id matches created_by (number or string)", () => {
		expect(checkIsCreator(user, { created_by: 42, created_by_username: "other" })).toBe(true);
		expect(checkIsCreator({ id: "42", username: "diff" }, { created_by: 42, created_by_username: "other" })).toBe(true);
	});

	it("identifies creator when username matches created_by_username", () => {
		expect(checkIsCreator({ id: 99, username: "ali_developer" }, { created_by: 42, created_by_username: "ali_developer" })).toBe(true);
	});

	it("returns false when neither user.id nor username matches", () => {
		expect(checkIsCreator(user, { created_by: 99, created_by_username: "someone_else" })).toBe(false);
	});

	it("returns false when detail is null or undefined", () => {
		expect(checkIsCreator(user, null)).toBe(false);
		expect(checkIsCreator(user, undefined)).toBe(false);
	});
});

describe("sign-flow logic - checkCanCancel", () => {
	it("allows cancellation only when in_progress AND (full admin OR creator)", () => {
		expect(checkCanCancel(true, false, "in_progress")).toBe(true);
		expect(checkCanCancel(false, true, "in_progress")).toBe(true);
		expect(checkCanCancel(true, true, "in_progress")).toBe(true);

		// Non-admin and non-creator cannot cancel
		expect(checkCanCancel(false, false, "in_progress")).toBe(false);

		// Other states cannot be cancelled
		expect(checkCanCancel(true, true, "approved")).toBe(false);
		expect(checkCanCancel(true, true, "rejected")).toBe(false);
		expect(checkCanCancel(true, true, "cancelled")).toBe(false);
		expect(checkCanCancel(true, true, "revoked")).toBe(false);
	});
});

describe("sign-flow logic - checkCanRevoke", () => {
	it("allows revocation only when approved AND user is full admin", () => {
		expect(checkCanRevoke(true, "approved")).toBe(true);

		// Non-admin cannot revoke even if approved
		expect(checkCanRevoke(false, "approved")).toBe(false);

		// Cannot revoke flows in other states (in_progress, rejected, cancelled, revoked)
		expect(checkCanRevoke(true, "in_progress")).toBe(false);
		expect(checkCanRevoke(true, "rejected")).toBe(false);
		expect(checkCanRevoke(true, "cancelled")).toBe(false);
		expect(checkCanRevoke(true, "revoked")).toBe(false);
	});
});

describe("sign-flow logic - checkIsStepApprover", () => {
	const user = { id: 10, username: "signer_user" };

	const detailMock: Pick<SignFlowDetail, "is_waiting_for_me" | "current_step_order" | "steps"> = {
		is_waiting_for_me: false,
		current_step_order: 2,
		steps: [
			{
				order: 1,
				name: "گام اول",
				state: "approved",
				activated_at: null,
				decided_at: null,
				recipients: [{ target_type: "user", user_id: 5, username: "first_approver", role_id: null, role_name: null }],
				assignments: [],
				decision: "approve",
			},
			{
				order: 2,
				name: "گام دوم",
				state: "active",
				activated_at: null,
				decided_at: null,
				recipients: [{ target_type: "user", user_id: 10, username: "signer_user", role_id: null, role_name: null }],
				assignments: [],
				decision: null,
			},
			{
				order: 3,
				name: "گام سوم",
				state: "pending",
				activated_at: null,
				decided_at: null,
				recipients: [{ target_type: "user", user_id: 20, username: "ceo", role_id: null, role_name: null }],
				assignments: [],
				decision: null,
			},
		] as SignFlowStep[],
	};

	it("returns true if is_waiting_for_me flag is true", () => {
		expect(checkIsStepApprover(user, { ...detailMock, is_waiting_for_me: true })).toBe(true);
	});

	it("identifies user in active step recipients by id or username", () => {
		expect(checkIsStepApprover(user, detailMock)).toBe(true);
		expect(checkIsStepApprover({ id: "10", username: "other" }, detailMock)).toBe(true);
		expect(checkIsStepApprover({ id: 99, username: "signer_user" }, detailMock)).toBe(true);
	});

	it("identifies user in active step assignments", () => {
		const detailWithAssignment = {
			...detailMock,
			steps: [
				detailMock.steps[0],
				{
					...detailMock.steps[1],
					recipients: [],
					assignments: [{ user_id: 15, username: "assigned_user", source_target_type: "role", source_role_id: 1 }],
				},
				detailMock.steps[2],
			],
		};

		expect(checkIsStepApprover({ id: 15, username: "assigned_user" }, detailWithAssignment)).toBe(true);
	});

	it("returns false if user is only in non-active steps", () => {
		expect(checkIsStepApprover({ id: 20, username: "ceo" }, detailMock)).toBe(false);
	});

	it("returns false if detail or steps is missing", () => {
		expect(checkIsStepApprover(user, null)).toBe(false);
		expect(checkIsStepApprover(user, { is_waiting_for_me: false, current_step_order: 99, steps: [] })).toBe(false);
	});
});

describe("sign-flow logic - checkCanDecide", () => {
	it("returns true only when state is in_progress AND user is step approver", () => {
		expect(checkCanDecide("in_progress", true)).toBe(true);
		expect(checkCanDecide("in_progress", false)).toBe(false);
		expect(checkCanDecide("approved", true)).toBe(false);
		expect(checkCanDecide("rejected", true)).toBe(false);
		expect(checkCanDecide("cancelled", true)).toBe(false);
	});
});

describe("sign-flow logic - step status & description mapping", () => {
	it("maps step states to Ant Design Steps status correctly", () => {
		expect(mapStepStatus("active")).toBe("process");
		expect(mapStepStatus("approved")).toBe("finish");
		expect(mapStepStatus("rejected")).toBe("error");
		expect(mapStepStatus("pending")).toBe("wait");
		expect(mapStepStatus("unknown")).toBe("wait");
	});

	it("maps step state to appropriate translation key with fallback to pending", () => {
		const getStepKey = (state: string) => SIGN_FLOW_STEP_STATE_KEYS[state] ?? SIGN_FLOW_STEP_STATE_KEYS.pending;

		expect(getStepKey("active")).toBe("contract.signFlow.stepState.active");
		expect(getStepKey("approved")).toBe("contract.signFlow.stepState.approved");
		expect(getStepKey("rejected")).toBe("contract.signFlow.stepState.rejected");
		expect(getStepKey("cancelled")).toBe("contract.signFlow.stepState.cancelled");
		expect(getStepKey("pending")).toBe("contract.signFlow.stepState.pending");
		expect(getStepKey("unrecognized")).toBe("contract.signFlow.stepState.pending");
	});
});
