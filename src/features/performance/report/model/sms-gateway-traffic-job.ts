import type { SmsGatewayJobStatus, SmsGatewayTrafficReportFilters, SmsGatewayTrafficReportResult } from "#src/features/performance/api/performances.api";

/**
 * One in-flight traffic-report job per user (backend rule): the form stays locked while the
 * last job is PENDING/RUNNING, and a 409 means "follow that job", not a failure.
 */
export type TrafficJobPhase = "checking" | "locked" | "ready";

export interface TrafficJobState {
	phase: TrafficJobPhase
	activeJobId: number | null
	jobStatus: SmsGatewayJobStatus | null
	result: SmsGatewayTrafficReportResult | null
	lastError: string | null
	submittedFilters: SmsGatewayTrafficReportFilters | null
	submitting: boolean
}

interface TrafficJobStatusHint { status?: SmsGatewayJobStatus }

export type TrafficJobAction = { type: "CHECK_START" | "CHECK_NOT_FOUND" | "SUBMIT_START" }
  | { type: "CHECK_ERROR" | "POLL_TIMEOUT" | "SUBMIT_REJECTED", message: string }
  | { type: "JOB_RESULT", data: SmsGatewayTrafficReportResult, failedMessage: string }
  | ({ type: "SUBMIT_ACCEPTED", jobId: number, filters: SmsGatewayTrafficReportFilters } & TrafficJobStatusHint)
  | ({ type: "SUBMIT_CONFLICT", jobId: number } & TrafficJobStatusHint);

export const initialTrafficJobState: TrafficJobState = {
	phase: "checking",
	activeJobId: null,
	jobStatus: null,
	result: null,
	lastError: null,
	submittedFilters: null,
	submitting: false,
};

export function trafficJobReducer(state: TrafficJobState, action: TrafficJobAction): TrafficJobState {
	switch (action.type) {
		case "CHECK_START":
			return { ...state, phase: "checking", lastError: null };
		case "CHECK_NOT_FOUND":
			return { ...state, phase: "ready", activeJobId: null, jobStatus: null, lastError: null };
		case "CHECK_ERROR":
			return { ...state, phase: "ready", lastError: action.message };
		case "JOB_RESULT": {
			const { data } = action;
			if (data.status === "SUCCESS")
				return { ...state, phase: "ready", activeJobId: data.job_id, jobStatus: "SUCCESS", result: data, lastError: null };
			if (data.status === "FAILED")
				return { ...state, phase: "ready", activeJobId: data.job_id, jobStatus: "FAILED", result: null, lastError: data.error || action.failedMessage };
			return { ...state, phase: "locked", activeJobId: data.job_id, jobStatus: data.status, lastError: null };
		}
		case "POLL_TIMEOUT":
			return { ...state, phase: "ready", lastError: action.message };
		case "SUBMIT_START":
			return { ...state, submitting: true, lastError: null };
		case "SUBMIT_ACCEPTED":
			return { ...state, submitting: false, phase: "locked", activeJobId: action.jobId, jobStatus: action.status ?? "PENDING", submittedFilters: action.filters, lastError: null };
		case "SUBMIT_CONFLICT":
			return { ...state, submitting: false, phase: "locked", activeJobId: action.jobId, jobStatus: action.status ?? "RUNNING", lastError: null };
		case "SUBMIT_REJECTED":
			return { ...state, submitting: false, lastError: action.message };
	}
}

export const isTrafficJobLocked = (state: TrafficJobState) => state.phase !== "ready";

export const canSubmitTrafficJob = (state: TrafficJobState) => state.phase === "ready" && !state.submitting;
