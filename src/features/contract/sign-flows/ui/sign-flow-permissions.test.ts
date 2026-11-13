import type { SignFlowDetail, SignFlowStep } from "#src/features/contract/api/contracts.api";
import { describe, expect, it } from "vitest";

/**
 * Business logic and permission guard definitions mirroring the exact rules
 * implemented in SignFlowDetail.tsx without modifying the source code.
 */

interface UserIdentity {
	id?: string | number | null
	username?: string | null
}

function checkIsCreator(
	user: UserIdentity,
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
	user: UserIdentity,
	detail?: Pick<SignFlowDetail, "is_waiting_for_me" | "current_step_order" | "steps"> | null,
): boolean {
	if (!detail)
		return false;

	if (detail.is_waiting_for_me)
		return true;

	const currentActiveStep = detail.steps?.find(s => s.order === detail.current_step_order);
	if (!currentActiveStep)
		return false;

	const inRecipients = currentActiveStep.recipients?.some(
		r => Number(r.user_id) === Number(user.id) || r.username === user.username,
	);
	const inAssignments = currentActiveStep.assignments?.some(
		a => Number(a.user_id) === Number(user.id) || a.username === user.username,
	);

	return Boolean(inRecipients || inAssignments);
}

function checkCanDecide(
	state?: string,
	isStepApprover?: boolean,
): boolean {
	return state === "in_progress" && Boolean(isStepApprover);
}

function validateDecisionComment(action: "approve" | "reject", comment: string): boolean {
	const trimmed = comment.trim();
	if (action === "reject" && !trimmed)
		return false;
	return true;
}

function validateReasonText(reason: string): boolean {
	return Boolean(reason.trim());
}

describe("permission guard - checkIsCreator", () => {
	const user = { id: 105, username: "farhad_dev" };

	it("returns true when user.id matches created_by as integer", () => {
		expect(checkIsCreator(user, { created_by: 105, created_by_username: "other" })).toBe(true);
	});

	it("returns true when user.id is string and created_by is number", () => {
		expect(checkIsCreator({ id: "105", username: "diff" }, { created_by: 105, created_by_username: "other" })).toBe(true);
	});

	it("returns true when username matches created_by_username", () => {
		expect(checkIsCreator({ id: 999, username: "farhad_dev" }, { created_by: 105, created_by_username: "farhad_dev" })).toBe(true);
	});

	it("returns false when user id and username differ from creator info", () => {
		expect(checkIsCreator(user, { created_by: 200, created_by_username: "someone_else" })).toBe(false);
	});

	it("returns false when detail is null or undefined", () => {
		expect(checkIsCreator(user, null)).toBe(false);
		expect(checkIsCreator(user, undefined)).toBe(false);
	});
});

describe("permission guard - checkCanCancel (Cancellation Rule)", () => {
	it("allows cancellation when state is in_progress and user is full admin", () => {
		expect(checkCanCancel(true, false, "in_progress")).toBe(true);
	});

	it("allows cancellation when state is in_progress and user is the creator", () => {
		expect(checkCanCancel(false, true, "in_progress")).toBe(true);
	});

	it("allows cancellation when user is both admin and creator", () => {
		expect(checkCanCancel(true, true, "in_progress")).toBe(true);
	});

	it("denies cancellation for regular non-creator users even when flow is in_progress", () => {
		expect(checkCanCancel(false, false, "in_progress")).toBe(false);
	});

	it("denies cancellation for all users once flow is approved", () => {
		expect(checkCanCancel(true, true, "approved")).toBe(false);
		expect(checkCanCancel(true, false, "approved")).toBe(false);
		expect(checkCanCancel(false, true, "approved")).toBe(false);
	});

	it("denies cancellation for rejected, cancelled, or revoked flows", () => {
		expect(checkCanCancel(true, true, "rejected")).toBe(false);
		expect(checkCanCancel(true, true, "cancelled")).toBe(false);
		expect(checkCanCancel(true, true, "revoked")).toBe(false);
	});

	it("denies cancellation when state is missing or unknown", () => {
		expect(checkCanCancel(true, true, undefined)).toBe(false);
		expect(checkCanCancel(true, true, "unknown_state")).toBe(false);
	});
});

describe("permission guard - checkCanRevoke (Revocation Rule)", () => {
	it("allows revocation only when state is approved and user is full admin", () => {
		expect(checkCanRevoke(true, "approved")).toBe(true);
	});

	it("denies revocation for creator if creator is not a full admin", () => {
		// Only superuser/staff (full admin) may revoke an approved flow
		expect(checkCanRevoke(false, "approved")).toBe(false);
	});

	it("denies revocation for regular non-admin users", () => {
		expect(checkCanRevoke(false, "approved")).toBe(false);
	});

	it("denies revocation when flow is still in_progress", () => {
		expect(checkCanRevoke(true, "in_progress")).toBe(false);
	});

	it("denies revocation for already rejected, cancelled, or revoked flows", () => {
		expect(checkCanRevoke(true, "rejected")).toBe(false);
		expect(checkCanRevoke(true, "cancelled")).toBe(false);
		expect(checkCanRevoke(true, "revoked")).toBe(false);
	});
});

describe("permission guard - checkIsStepApprover (Step Assignment Rule)", () => {
	const currentUser = { id: 25, username: "reviewer_agent" };

	const sampleSteps: SignFlowStep[] = [
		{
			order: 1,
			name: "بررسی اولیه",
			state: "approved",
			activated_at: "2026-03-20T10:00:00Z",
			decided_at: "2026-03-21T10:00:00Z",
			recipients: [{ target_type: "user", user_id: 10, username: "first_checker", role_id: null, role_name: null }],
			assignments: [],
			decision: "approve",
		},
		{
			order: 2,
			name: "تایید مالی",
			state: "active",
			activated_at: "2026-03-21T10:00:00Z",
			decided_at: null,
			recipients: [{ target_type: "user", user_id: 25, username: "reviewer_agent", role_id: null, role_name: null }],
			assignments: [],
			decision: null,
		},
		{
			order: 3,
			name: "امضای مدیرعامل",
			state: "pending",
			activated_at: null,
			decided_at: null,
			recipients: [{ target_type: "user", user_id: 88, username: "ceo_user", role_id: null, role_name: null }],
			assignments: [],
			decision: null,
		},
	];

	it("returns true immediately if is_waiting_for_me server flag is true", () => {
		expect(checkIsStepApprover(currentUser, { is_waiting_for_me: true, current_step_order: 2, steps: sampleSteps })).toBe(true);
	});

	it("identifies user in active step recipients by user_id", () => {
		const detail = { is_waiting_for_me: false, current_step_order: 2, steps: sampleSteps };
		expect(checkIsStepApprover({ id: 25, username: "diff_name" }, detail)).toBe(true);
		expect(checkIsStepApprover({ id: "25", username: "diff_name" }, detail)).toBe(true);
	});

	it("identifies user in active step recipients by username", () => {
		const detail = { is_waiting_for_me: false, current_step_order: 2, steps: sampleSteps };
		expect(checkIsStepApprover({ id: 999, username: "reviewer_agent" }, detail)).toBe(true);
	});

	it("identifies user in active step assignments", () => {
		const detailWithAssignment = {
			is_waiting_for_me: false,
			current_step_order: 2,
			steps: [
				sampleSteps[0],
				{
					...sampleSteps[1],
					recipients: [],
					assignments: [{ user_id: 30, username: "finance_delegate", source_target_type: "role", source_role_id: 2 }],
				},
				sampleSteps[2],
			],
		};

		expect(checkIsStepApprover({ id: 30, username: "finance_delegate" }, detailWithAssignment)).toBe(true);
	});

	it("denies access if user is assigned to a past or future step but not the active step", () => {
		const detail = { is_waiting_for_me: false, current_step_order: 2, steps: sampleSteps };

		// user 10 is only in step 1 (approved step)
		expect(checkIsStepApprover({ id: 10, username: "first_checker" }, detail)).toBe(false);

		// user 88 is only in step 3 (pending step)
		expect(checkIsStepApprover({ id: 88, username: "ceo_user" }, detail)).toBe(false);
	});

	it("denies access if current_step_order does not match any existing step", () => {
		const detail = { is_waiting_for_me: false, current_step_order: 99, steps: sampleSteps };
		expect(checkIsStepApprover(currentUser, detail)).toBe(false);
	});

	it("denies access if detail or steps array is empty", () => {
		expect(checkIsStepApprover(currentUser, null)).toBe(false);
		expect(checkIsStepApprover(currentUser, { is_waiting_for_me: false, current_step_order: 1, steps: [] })).toBe(false);
	});
});

describe("permission guard - checkCanDecide (Decision Action Guard)", () => {
	it("allows decide only when flow is in_progress AND user is step approver", () => {
		expect(checkCanDecide("in_progress", true)).toBe(true);
	});

	it("denies decide if user is not step approver even if in_progress", () => {
		expect(checkCanDecide("in_progress", false)).toBe(false);
	});

	it("denies decide once flow is approved, even if user was an approver", () => {
		expect(checkCanDecide("approved", true)).toBe(false);
	});

	it("denies decide once flow is rejected, cancelled, or revoked", () => {
		expect(checkCanDecide("rejected", true)).toBe(false);
		expect(checkCanDecide("cancelled", true)).toBe(false);
		expect(checkCanDecide("revoked", true)).toBe(false);
	});
});

describe("permission guard - validation rules for decision and reason submission", () => {
	it("requires non-empty comment when action is reject", () => {
		expect(validateDecisionComment("reject", "")).toBe(false);
		expect(validateDecisionComment("reject", "   ")).toBe(false);
		expect(validateDecisionComment("reject", "بند مالی مورد توافق نیست")).toBe(true);
	});

	it("allows approve decision with optional or blank comment", () => {
		expect(validateDecisionComment("approve", "")).toBe(true);
		expect(validateDecisionComment("approve", "   ")).toBe(true);
		expect(validateDecisionComment("approve", "بررسی و تایید شد")).toBe(true);
	});

	it("requires non-empty reason when cancelling or revoking sign flow", () => {
		expect(validateReasonText("")).toBe(false);
		expect(validateReasonText("    ")).toBe(false);
		expect(validateReasonText("تغییر شرایط قرارداد با طرف مقابل")).toBe(true);
	});
});
