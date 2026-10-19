import type { BusinessApprovalCounts, SignApprovalCounts } from "#src/features/dashboard/api/dashboard.dto";
import type { DonutSegment } from "#src/features/dashboard/ui/charts/ApprovalDonut";
import { i18n } from "#src/locales";

export type ApprovalKind = "business" | "sign";
export type ApprovalState = "approved" | "pending" | "pending_business_approval";

export interface ApprovalSegment extends DonutSegment<ApprovalState> {
	/** Short text of the bar tooltip. */
	short: string
}

/** Stage label of each state per approval kind (`rejected` is always 0 in the backend and never shown). */
const STATE_LABEL_KEY: Record<ApprovalKind, Partial<Record<ApprovalState, string>>> = {
	business: { approved: "approved", pending: "pending_business_approval" },
	sign: { approved: "approved", pending: "pending_sign_approval", pending_business_approval: "pending_business_approval" },
};

export function approvalStateLabel(approval: ApprovalKind, state: ApprovalState) {
	return i18n.t(`dashboard.approval.stages.${STATE_LABEL_KEY[approval][state]}`);
}

export function businessSegments(bucket?: BusinessApprovalCounts): ApprovalSegment[] {
	return [
		{ key: "approved", tone: "ok", label: approvalStateLabel("business", "approved"), short: i18n.t("dashboard.widgets.approval.short.approved"), value: bucket?.approved || 0 },
		{ key: "pending", tone: "faint", label: approvalStateLabel("business", "pending"), short: approvalStateLabel("business", "pending"), value: bucket?.pending || 0 },
	];
}

export function signSegments(bucket?: SignApprovalCounts): ApprovalSegment[] {
	return [
		{ key: "approved", tone: "ok", label: approvalStateLabel("sign", "approved"), short: i18n.t("dashboard.widgets.approval.short.approved"), value: bucket?.approved || 0 },
		{ key: "pending", tone: "warn", label: approvalStateLabel("sign", "pending"), short: i18n.t("dashboard.widgets.approval.short.pendingSign"), value: bucket?.pending || 0 },
		{ key: "pending_business_approval", tone: "faint", label: approvalStateLabel("sign", "pending_business_approval"), short: approvalStateLabel("sign", "pending_business_approval"), value: bucket?.pending_business_approval || 0 },
	];
}

export function segmentsTotal(segments: ApprovalSegment[]) {
	return segments.reduce((sum, s) => sum + s.value, 0);
}
