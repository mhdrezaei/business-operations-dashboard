import type { SmsGatewayTrafficReportResult } from "#src/features/performance/api/performances.api";
import { describe, expect, it } from "vitest";
import { canSubmitTrafficJob, initialTrafficJobState, isTrafficJobLocked, trafficJobReducer } from "./sms-gateway-traffic-job";

const job = (status: SmsGatewayTrafficReportResult["status"], extra: Partial<SmsGatewayTrafficReportResult> = {}) => ({ job_id: 7, status, ...extra });

describe("trafficJobReducer", () => {
	it("locks while the job is running and unlocks on SUCCESS", () => {
		const running = trafficJobReducer(initialTrafficJobState, { type: "JOB_RESULT", data: job("RUNNING"), failedMessage: "x" });
		expect(isTrafficJobLocked(running)).toBe(true);
		const done = trafficJobReducer(running, { type: "JOB_RESULT", data: job("SUCCESS", { count: 1 }), failedMessage: "x" });
		expect(canSubmitTrafficJob(done)).toBe(true);
		expect(done.result?.count).toBe(1);
	});

	it("shows the backend error on FAILED and falls back to the default message", () => {
		const withError = trafficJobReducer(initialTrafficJobState, { type: "JOB_RESULT", data: job("FAILED", { error: "boom" }), failedMessage: "fallback" });
		expect(withError.lastError).toBe("boom");
		const noError = trafficJobReducer(initialTrafficJobState, { type: "JOB_RESULT", data: job("FAILED"), failedMessage: "fallback" });
		expect(noError.lastError).toBe("fallback");
		expect(noError.phase).toBe("ready");
	});

	it("follows the existing job on 409 instead of failing", () => {
		const state = trafficJobReducer({ ...initialTrafficJobState, phase: "ready" }, { type: "SUBMIT_CONFLICT", jobId: 3, status: "PENDING" });
		expect(state).toMatchObject({ phase: "locked", activeJobId: 3, jobStatus: "PENDING", lastError: null });
	});

	it("treats 404 on latest as no previous job", () => {
		expect(trafficJobReducer(initialTrafficJobState, { type: "CHECK_NOT_FOUND" })).toMatchObject({ phase: "ready", activeJobId: null });
	});
});
