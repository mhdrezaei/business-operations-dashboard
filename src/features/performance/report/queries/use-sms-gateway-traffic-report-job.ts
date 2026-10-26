import type { SmsGatewayJobStatus, SmsGatewayTrafficReportFilters, SmsGatewayTrafficReportResult } from "#src/features/performance/api/performances.api";
import { createSmsGatewayTrafficReport, fetchSmsGatewayTrafficReport, fetchSmsGatewayTrafficReportStatus } from "#src/features/performance/api/performances.api";
import { canSubmitTrafficJob, initialTrafficJobState, isTrafficJobLocked, trafficJobReducer } from "#src/features/performance/report/model/sms-gateway-traffic-job";
import { getRequestErrorMessage } from "#src/features/performance/report/queries/sms-gateway-request-error";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const POLL_INTERVAL_MS = 3500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 20;

const isActive = (status: SmsGatewayJobStatus) => status === "PENDING" || status === "RUNNING";
const getResponseStatus = (error: unknown) => (error as { response?: Response })?.response?.status;

export function useSmsGatewayTrafficReportJob() {
	const { t } = useTranslation();
	const [state, dispatch] = useReducer(trafficJobReducer, initialTrafficJobState);
	const [page, setPageState] = useState(1);
	const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
	const pollTimer = useRef<number | null>(null);
	const pollStartedAt = useRef(0);
	const pagination = useRef({ page, pageSize });
	pagination.current = { page, pageSize };
	const messages = useRef({ failed: "", request: "", timeout: "" });
	messages.current = { failed: t("performance.smsGatewayReport.jobFailed"), request: t("performance.smsGatewayReport.requestFailed"), timeout: t("performance.smsGatewayImport.pollTimeout") };

	const stopPolling = useCallback(() => {
		if (pollTimer.current != null)
			window.clearTimeout(pollTimer.current);
		pollTimer.current = null;
	}, []);
	useEffect(() => stopPolling, [stopPolling]);

	const applyResult = useCallback((data: SmsGatewayTrafficReportResult) => dispatch({ type: "JOB_RESULT", data, failedMessage: messages.current.failed }), []);

	const poll = useCallback(async (jobId: number) => {
		try {
			const data = await fetchSmsGatewayTrafficReportStatus(jobId, pagination.current);
			applyResult(data);
			if (!isActive(data.status))
				return;
			if (Date.now() - pollStartedAt.current > POLL_TIMEOUT_MS) {
				dispatch({ type: "POLL_TIMEOUT", message: messages.current.timeout });
				return;
			}
			pollTimer.current = window.setTimeout(() => void poll(jobId), POLL_INTERVAL_MS);
		}
		catch (error) {
			dispatch({ type: "CHECK_ERROR", message: await getRequestErrorMessage(error, messages.current.request) });
		}
	}, [applyResult]);

	const follow = useCallback((jobId: number) => {
		stopPolling();
		pollStartedAt.current = Date.now();
		void poll(jobId);
	}, [poll, stopPolling]);

	// The page state always hydrates from the user's latest job (404 = no job yet).
	useEffect(() => {
		let alive = true;
		dispatch({ type: "CHECK_START" });
		fetchSmsGatewayTrafficReport(pagination.current)
			.then((data) => {
				if (!alive)
					return;
				applyResult(data);
				if (isActive(data.status))
					follow(data.job_id);
			})
			.catch(async (error) => {
				if (!alive)
					return;
				if (getResponseStatus(error) === 404)
					dispatch({ type: "CHECK_NOT_FOUND" });
				else
					dispatch({ type: "CHECK_ERROR", message: await getRequestErrorMessage(error, messages.current.request) });
			});
		return () => {
			alive = false;
		};
	}, [applyResult, follow]);

	const submit = useCallback(async (filters: SmsGatewayTrafficReportFilters) => {
		if (!canSubmitTrafficJob(state))
			return;
		dispatch({ type: "SUBMIT_START" });
		setPageState(1);
		pagination.current = { page: 1, pageSize };
		try {
			const data = await createSmsGatewayTrafficReport(filters);
			dispatch({ type: "SUBMIT_ACCEPTED", jobId: data.job_id, status: data.status, filters });
			follow(data.job_id);
		}
		catch (error) {
			const response = (error as { response?: Response })?.response;
			// 409: a previous job is still open — follow that job instead of failing.
			const conflict = response?.status === 409 ? await response.clone().json().catch(() => null) as { job_id?: number, status?: SmsGatewayJobStatus } | null : null;
			if (conflict?.job_id != null) {
				dispatch({ type: "SUBMIT_CONFLICT", jobId: conflict.job_id, status: conflict.status });
				follow(conflict.job_id);
				return;
			}
			dispatch({ type: "SUBMIT_REJECTED", message: await getRequestErrorMessage(error, messages.current.request) });
		}
	}, [follow, pageSize, state]);

	// Changing page/size re-reads the finished job; it is not a new submit.
	const repaginate = useCallback(async (nextPage: number, nextPageSize: number) => {
		setPageState(nextPage);
		setPageSizeState(nextPageSize);
		if (state.activeJobId == null || state.jobStatus !== "SUCCESS")
			return;
		try {
			applyResult(await fetchSmsGatewayTrafficReportStatus(state.activeJobId, { page: nextPage, pageSize: nextPageSize }));
		}
		catch (error) {
			dispatch({ type: "CHECK_ERROR", message: await getRequestErrorMessage(error, messages.current.request) });
		}
	}, [applyResult, state.activeJobId, state.jobStatus]);

	return {
		state,
		isLocked: isTrafficJobLocked(state),
		canSubmit: canSubmitTrafficJob(state),
		page,
		pageSize,
		submit,
		changePage: repaginate,
	};
}
