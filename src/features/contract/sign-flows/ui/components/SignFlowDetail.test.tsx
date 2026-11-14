import type { SignFlowDetail as SignFlowDetailType, SignFlowHistoryItem } from "#src/features/contract/api/contracts.api";
import { cancelSignFlow, decideSignFlow, fetchSignFlowDetail, fetchSignFlowHistory, fetchSignFlowOfficialPdf } from "#src/features/contract/api/contracts.api";
import { renderWithProviders, screen, waitFor } from "#tests/test-utils";
import userEvent from "@testing-library/user-event";
import { message } from "antd";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignFlowDetail } from "./SignFlowDetail";

let mockUser = { id: 10, username: "creator_user" };
let mockIsFullAdmin = false;

vi.mock("#src/store", () => ({
	useUserStore: vi.fn(() => mockUser),
}));

vi.mock("#src/hooks", () => ({
	useAccess: vi.fn(() => ({ isFullAdmin: mockIsFullAdmin })),
}));

vi.mock("#src/features/contract/api/contracts.api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("#src/features/contract/api/contracts.api")>();
	return {
		...actual,
		fetchSignFlowDetail: vi.fn(),
		fetchSignFlowHistory: vi.fn(),
		decideSignFlow: vi.fn(),
		cancelSignFlow: vi.fn(),
		revokeSignFlow: vi.fn(),
		fetchSignFlowOfficialPdf: vi.fn(),
	};
});

const baseDetail: SignFlowDetailType = {
	id: 555,
	state: "in_progress",
	service: "sms",
	service_name: "سرویس پیامک",
	company_type: null,
	contract_id: 888,
	contract_number: "CTR-2026-888",
	company_name: "شرکت سپهر",
	addendum_group_id: null,
	record_type: "contract",
	template_id: 1,
	template_name: "قالب عمومی",
	rule_config_id: 1,
	current_step_order: 2,
	current_step_name: "مرحله مالی",
	total_steps: 4,
	contract_start_date: "1405/01/01",
	contract_end_date: "1405/12/29",
	is_waiting_for_me: true,
	started_at: "2026-03-21T10:00:00Z",
	finished_at: null,
	cancel_reason: "",
	created_by: 10,
	created_by_username: "creator_user",
	created_at: "2026-03-21T10:00:00Z",
	steps: [
		{
			order: 1,
			name: "بررسی حقوقی",
			state: "approved",
			activated_at: "2026-03-21T10:00:00Z",
			decided_at: "2026-03-21T11:00:00Z",
			recipients: [{ target_type: "user", user_id: 1, username: "legal_user", role_id: null, role_name: null }],
			assignments: [],
			decision: "approve",
		},
		{
			order: 2,
			name: "مرحله مالی",
			state: "active",
			activated_at: "2026-03-21T11:00:00Z",
			decided_at: null,
			recipients: [{ target_type: "user", user_id: 10, username: "creator_user", role_id: null, role_name: null }],
			assignments: [],
			decision: null,
		},
		{
			order: 3,
			name: "بررسی فنی",
			state: "rejected",
			activated_at: null,
			decided_at: null,
			recipients: [{ target_type: "user", user_id: 3, username: "tech_user", role_id: null, role_name: null }],
			assignments: [],
			decision: null,
		},
		{
			order: 4,
			name: "امضای نهایی",
			state: "pending",
			activated_at: null,
			decided_at: null,
			recipients: [{ target_type: "user", user_id: 4, username: "boss_user", role_id: null, role_name: null }],
			assignments: [],
			decision: null,
		},
	],
	print_service_code: "sms",
	cancelled_by: null,
	revoked_at: null,
	revoked_by: null,
	revoked_by_username: null,
	revoke_reason: "",
};

const sampleHistory: SignFlowHistoryItem[] = [
	{
		id: 554,
		state: "rejected",
		started_at: "2026-03-10T10:00:00Z",
		finished_at: "2026-03-11T12:00:00Z",
		cancel_or_reject_reason: "عدم تایید ارقام مالی",
		revoked_at: null,
		revoke_reason: "",
	},
];

describe("signFlowDetail - graphical steps rendering", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUser = { id: 10, username: "creator_user" };
		mockIsFullAdmin = false;
		vi.mocked(fetchSignFlowDetail).mockResolvedValue(baseDetail);
		vi.mocked(fetchSignFlowHistory).mockResolvedValue([]);
	});

	it("renders all approval steps with appropriate status based on state", async () => {
		renderWithProviders(<SignFlowDetail id={555} />);

		// Verify main card content
		expect(await screen.findByRole("heading", { name: /گردش امضا #\s*555/ })).toBeInTheDocument();

		// Verify all step titles are rendered
		expect(screen.getByText(/مرحله1\s*—\s*بررسی حقوقی/)).toBeInTheDocument();
		expect(screen.getByText(/مرحله2\s*—\s*مرحله مالی/)).toBeInTheDocument();
		expect(screen.getByText(/مرحله3\s*—\s*بررسی فنی/)).toBeInTheDocument();
		expect(screen.getByText(/مرحله4\s*—\s*امضای نهایی/)).toBeInTheDocument();

		// Verify step recipients are rendered
		expect(screen.getByText("legal_user")).toBeInTheDocument();
		expect(screen.getByText("tech_user")).toBeInTheDocument();
		expect(screen.getByText("boss_user")).toBeInTheDocument();

		// Check Ant Design Steps status classes
		const stepNodes = document.querySelectorAll(".ant-steps-item");
		expect(stepNodes.length).toBe(4);

		// Order 1 (approved) -> status finish
		expect(stepNodes[0]).toHaveClass("ant-steps-item-finish");

		// Order 2 (active) -> status process
		expect(stepNodes[1]).toHaveClass("ant-steps-item-process");

		// Order 3 (rejected) -> status error
		expect(stepNodes[2]).toHaveClass("ant-steps-item-error");

		// Order 4 (pending) -> status wait
		expect(stepNodes[3]).toHaveClass("ant-steps-item-wait");
	});
});

describe("signFlowDetail - approve flow", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUser = { id: 10, username: "creator_user" };
		mockIsFullAdmin = false;
		vi.mocked(fetchSignFlowDetail).mockResolvedValue(baseDetail);
		vi.mocked(fetchSignFlowHistory).mockResolvedValue(sampleHistory);
	});

	it("opens approve modal with default text and invalidates queries on successful submission", async () => {
		const messageSuccessSpy = vi.spyOn(message, "success").mockImplementation(() => ({} as any));
		vi.mocked(decideSignFlow).mockResolvedValue({ ...baseDetail, state: "approved" });

		const { queryClient } = renderWithProviders(<SignFlowDetail id={555} />);
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

		expect(await screen.findByRole("heading", { name: /گردش امضا #\s*555/ })).toBeInTheDocument();

		// Click the green "تایید" button
		const approveBtn = screen.getByRole("button", { name: /تایید$/ });
		await userEvent.click(approveBtn);

		// Modal should open with title and pre-filled comment
		expect(screen.getByText("تایید مرحله گردش امضا")).toBeInTheDocument();
		const textarea = screen.getByPlaceholderText("توضیحات تایید را وارد کنید...");
		expect(textarea).toHaveValue("بررسی و تایید شد");

		// Click submit "تایید کن"
		const confirmBtn = screen.getByRole("button", { name: "تایید کن" });
		await userEvent.click(confirmBtn);

		// API decideSignFlow called with action: approve
		await waitFor(() => {
			expect(decideSignFlow).toHaveBeenCalledWith(555, {
				action: "approve",
				comment: "بررسی و تایید شد",
			});
		});

		// Success message displayed
		expect(messageSuccessSpy).toHaveBeenCalledWith("مرحله با موفقیت تایید شد");

		// TanStack Query caches invalidated
		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["signFlowDetail", 555] });
		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["signFlowHistory", 888] });

		messageSuccessSpy.mockRestore();
	});
});

describe("signFlowDetail - reject flow and field validation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUser = { id: 10, username: "creator_user" };
		mockIsFullAdmin = false;
		vi.mocked(fetchSignFlowDetail).mockResolvedValue(baseDetail);
		vi.mocked(fetchSignFlowHistory).mockResolvedValue(sampleHistory);
	});

	it("prevents submission with empty comment and succeeds once valid rejection reason is entered", async () => {
		const messageSuccessSpy = vi.spyOn(message, "success").mockImplementation(() => ({} as any));
		vi.mocked(decideSignFlow).mockResolvedValue({ ...baseDetail, state: "rejected" });

		renderWithProviders(<SignFlowDetail id={555} />);

		expect(await screen.findByRole("heading", { name: /گردش امضا #\s*555/ })).toBeInTheDocument();

		// Click the red "رد" button
		const rejectBtn = screen.getByRole("button", { name: /رد$/ });
		await userEvent.click(rejectBtn);

		// Modal should open with title
		expect(screen.getByText("رد مرحله گردش امضا")).toBeInTheDocument();
		const textarea = screen.getByPlaceholderText("دلیل رد را وارد کنید...");
		expect(textarea).toHaveValue("");

		// The confirm button should be disabled when empty
		const confirmRejectBtn = screen.getByRole("button", { name: "رد کن" });
		expect(confirmRejectBtn).toBeDisabled();

		// Entering only spaces still leaves it disabled or rejected by validation
		await userEvent.type(textarea, "   ");
		expect(confirmRejectBtn).toBeDisabled();
		expect(decideSignFlow).not.toHaveBeenCalled();

		// Enter valid rejection comment
		await userEvent.clear(textarea);
		await userEvent.type(textarea, "مغایرت بند ۳ با تعهدات شرکت");
		expect(confirmRejectBtn).not.toBeDisabled();

		await userEvent.click(confirmRejectBtn);

		await waitFor(() => {
			expect(decideSignFlow).toHaveBeenCalledWith(555, {
				action: "reject",
				comment: "مغایرت بند ۳ با تعهدات شرکت",
			});
		});

		expect(messageSuccessSpy).toHaveBeenCalledWith("گردش امضا با موفقیت رد شد");
		messageSuccessSpy.mockRestore();
	});
});

describe("signFlowDetail - cancel flow and validation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUser = { id: 10, username: "creator_user" };
		mockIsFullAdmin = false;
		vi.mocked(fetchSignFlowDetail).mockResolvedValue(baseDetail);
		vi.mocked(fetchSignFlowHistory).mockResolvedValue([]);
	});

	it("validates required cancellation reason before submitting cancelSignFlow", async () => {
		const messageWarningSpy = vi.spyOn(message, "warning").mockImplementation(() => ({} as any));
		const messageSuccessSpy = vi.spyOn(message, "success").mockImplementation(() => ({} as any));
		vi.mocked(cancelSignFlow).mockResolvedValue({ ...baseDetail, state: "cancelled" });

		renderWithProviders(<SignFlowDetail id={555} />);

		expect(await screen.findByRole("heading", { name: /گردش امضا #\s*555/ })).toBeInTheDocument();

		// Click "لغو گردش امضا" button
		const cancelBtn = screen.getByRole("button", { name: /لغو گردش امضا/ });
		await userEvent.click(cancelBtn);

		// Modal opens
		const reasonTextarea = screen.getByPlaceholderText("دلیل لغو را وارد کنید...");
		expect(reasonTextarea).toHaveValue("");

		// Click confirm without entering reason
		const confirmCancelBtn = screen.getByRole("button", { name: "لغو کن" });
		await userEvent.click(confirmCancelBtn);

		// Validation warning triggered, API not called
		expect(messageWarningSpy).toHaveBeenCalledWith("لطفاً دلیل لغو را وارد کنید");
		expect(cancelSignFlow).not.toHaveBeenCalled();

		// Type valid reason
		await userEvent.type(reasonTextarea, "انصراف طرف قرارداد از ادامه فرآیند");
		await userEvent.click(confirmCancelBtn);

		await waitFor(() => {
			expect(cancelSignFlow).toHaveBeenCalledWith(555, "انصراف طرف قرارداد از ادامه فرآیند");
		});

		expect(messageSuccessSpy).toHaveBeenCalledWith("گردش امضا با موفقیت لغو شد");

		messageWarningSpy.mockRestore();
		messageSuccessSpy.mockRestore();
	});
});

describe("signFlowDetail - history sidebar", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUser = { id: 10, username: "creator_user" };
		mockIsFullAdmin = false;
	});

	it("renders previous history cards and displays reason", async () => {
		vi.mocked(fetchSignFlowDetail).mockResolvedValue(baseDetail);
		vi.mocked(fetchSignFlowHistory).mockResolvedValue(sampleHistory);

		renderWithProviders(<SignFlowDetail id={555} />);

		expect(await screen.findByRole("heading", { name: /گردش امضا #\s*555/ })).toBeInTheDocument();

		// History card 554 should be rendered
		expect(screen.getByText(/گردش امضا #\s*554/)).toBeInTheDocument();
		expect(screen.getByText("عدم تایید ارقام مالی")).toBeInTheDocument();
	});

	it("renders empty state when history list is empty", async () => {
		vi.mocked(fetchSignFlowDetail).mockResolvedValue(baseDetail);
		vi.mocked(fetchSignFlowHistory).mockResolvedValue([]);

		renderWithProviders(<SignFlowDetail id={555} />);

		expect(await screen.findByRole("heading", { name: /گردش امضا #\s*555/ })).toBeInTheDocument();
		expect(screen.getByText("تاریخچه‌ای وجود ندارد")).toBeInTheDocument();
	});

	it("switches activeId to selected history item when clicking its view eye icon without page reload", async () => {
		vi.mocked(fetchSignFlowDetail).mockImplementation(async (activeId) => {
			if (String(activeId) === "554") {
				return {
					...baseDetail,
					id: 554,
					state: "rejected",
					cancel_reason: "عدم تایید ارقام مالی",
				};
			}
			return baseDetail;
		});
		vi.mocked(fetchSignFlowHistory).mockResolvedValue(sampleHistory);

		renderWithProviders(<SignFlowDetail id={555} />);

		expect(await screen.findByRole("heading", { name: /گردش امضا #\s*555/ })).toBeInTheDocument();

		// Find the eye icon inside the history sidebar card for 554
		const historyCard = screen.getByText(/گردش امضا #\s*554/).closest(".ant-card-small");
		expect(historyCard).toBeDefined();

		const viewHistoryBtn = historyCard?.querySelector("button");
		expect(viewHistoryBtn).toBeDefined();

		await userEvent.click(viewHistoryBtn as HTMLButtonElement);

		// Detail should switch to #554
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: /گردش امضا #\s*554/ })).toBeInTheDocument();
		});

		expect(fetchSignFlowDetail).toHaveBeenCalledWith(554);
	});

	it("resets historyId when input id prop changes from outside", async () => {
		vi.mocked(fetchSignFlowDetail).mockImplementation(async (activeId) => {
			return {
				...baseDetail,
				id: Number(activeId),
			};
		});
		vi.mocked(fetchSignFlowHistory).mockResolvedValue(sampleHistory);

		const { rerender } = renderWithProviders(<SignFlowDetail id={555} />);

		expect(await screen.findByRole("heading", { name: /گردش امضا #\s*555/ })).toBeInTheDocument();

		// Select history item 554
		const historyCard = screen.getByText(/گردش امضا #\s*554/).closest(".ant-card-small");
		expect(historyCard).toBeDefined();
		const viewHistoryBtn = historyCard?.querySelector("button");
		expect(viewHistoryBtn).toBeDefined();
		await userEvent.click(viewHistoryBtn as HTMLButtonElement);

		await waitFor(() => {
			expect(screen.getByRole("heading", { name: /گردش امضا #\s*554/ })).toBeInTheDocument();
		});

		// External prop change to id 777
		rerender(<SignFlowDetail id={777} />);

		// historyId is reset, activeId switches to 777
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: /گردش امضا #\s*777/ })).toBeInTheDocument();
		});
	});
});

describe("signFlowDetail - official pdf viewing (handleViewOfficialPdf)", () => {
	let mockTab: { close: () => void, location: { href: string } };

	beforeEach(() => {
		vi.clearAllMocks();
		mockUser = { id: 10, username: "creator_user" };
		mockIsFullAdmin = false;
		vi.mocked(fetchSignFlowDetail).mockResolvedValue(baseDetail);
		vi.mocked(fetchSignFlowHistory).mockResolvedValue([]);

		mockTab = {
			location: { href: "" },
			close: vi.fn(),
		};
		vi.spyOn(window, "open").mockReturnValue(mockTab as any);

		if (!window.URL.createObjectURL) {
			window.URL.createObjectURL = vi.fn();
		}
	});

	it("scenario 1: opens external URL in new tab when server response is JSON with url or pdf_url", async () => {
		const mockResponse = {
			headers: {
				get: (header: string) => header.toLowerCase() === "content-type" ? "application/json; charset=utf-8" : null,
			},
			json: vi.fn().mockResolvedValue({ url: "https://storage.example.com/contracts/555.pdf" }),
			blob: vi.fn(),
		};
		vi.mocked(fetchSignFlowOfficialPdf).mockResolvedValue(mockResponse as any);

		renderWithProviders(<SignFlowDetail id={555} />);
		expect(await screen.findByRole("heading", { name: /گردش امضا #\s*555/ })).toBeInTheDocument();

		const pdfBtn = screen.getByRole("button", { name: /مشاهده PDF رسمی/ });
		await userEvent.click(pdfBtn);

		await waitFor(() => {
			expect(fetchSignFlowOfficialPdf).toHaveBeenCalledWith(555);
			expect(mockTab.location.href).toBe("https://storage.example.com/contracts/555.pdf");
		});
		expect(mockTab.close).not.toHaveBeenCalled();
	});

	it("scenario 2: creates blob URL with URL.createObjectURL when server returns binary PDF stream", async () => {
		const createObjectURLSpy = vi.spyOn(window.URL, "createObjectURL").mockReturnValue("blob:http://localhost/contract-uuid-123");
		const mockBlob = new Blob(["%PDF-1.4 binary content"], { type: "application/pdf" });
		const mockResponse = {
			headers: {
				get: (header: string) => header.toLowerCase() === "content-type" ? "application/pdf" : null,
			},
			json: vi.fn(),
			blob: vi.fn().mockResolvedValue(mockBlob),
		};
		vi.mocked(fetchSignFlowOfficialPdf).mockResolvedValue(mockResponse as any);

		renderWithProviders(<SignFlowDetail id={555} />);
		expect(await screen.findByRole("heading", { name: /گردش امضا #\s*555/ })).toBeInTheDocument();

		const pdfBtn = screen.getByRole("button", { name: /مشاهده PDF رسمی/ });
		await userEvent.click(pdfBtn);

		await waitFor(() => {
			expect(fetchSignFlowOfficialPdf).toHaveBeenCalledWith(555);
			expect(createObjectURLSpy).toHaveBeenCalled();
			expect(mockTab.location.href).toBe("blob:http://localhost/contract-uuid-123");
		});
		expect(mockTab.close).not.toHaveBeenCalled();
		createObjectURLSpy.mockRestore();
	});

	it("scenario 3: closes new tab and displays error message when PDF download fails due to server or network error", async () => {
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const messageErrorSpy = vi.spyOn(message, "error").mockImplementation(() => ({} as any));
		vi.mocked(fetchSignFlowOfficialPdf).mockRejectedValue(new Error("Network connection lost"));

		renderWithProviders(<SignFlowDetail id={555} />);
		expect(await screen.findByRole("heading", { name: /گردش امضا #\s*555/ })).toBeInTheDocument();

		const pdfBtn = screen.getByRole("button", { name: /مشاهده PDF رسمی/ });
		await userEvent.click(pdfBtn);

		await waitFor(() => {
			expect(fetchSignFlowOfficialPdf).toHaveBeenCalledWith(555);
			expect(mockTab.close).toHaveBeenCalled();
			expect(messageErrorSpy).toHaveBeenCalledWith("خطا در دریافت یا باز کردن PDF رسمی");
		});

		consoleErrorSpy.mockRestore();
		messageErrorSpy.mockRestore();
	});
});

describe("signFlowDetail - empty state and 404 error handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUser = { id: 10, username: "creator_user" };
		mockIsFullAdmin = false;
	});

	it("renders empty state with 'اطلاعات گردش امضا یافت نشد' without crashing when detail is null", async () => {
		vi.mocked(fetchSignFlowDetail).mockResolvedValue(null as any);

		renderWithProviders(<SignFlowDetail id={999} />);

		expect(await screen.findByText("اطلاعات گردش امضا یافت نشد")).toBeInTheDocument();
		expect(screen.queryByRole("heading", { name: /گردش امضا #/ })).not.toBeInTheDocument();
	});

	it("renders back button in empty state when onBack callback is provided and triggers it on click", async () => {
		vi.mocked(fetchSignFlowDetail).mockResolvedValue(null as any);
		const onBackMock = vi.fn();

		renderWithProviders(<SignFlowDetail id={999} onBack={onBackMock} />);

		expect(await screen.findByText("اطلاعات گردش امضا یافت نشد")).toBeInTheDocument();

		const backBtn = screen.getByRole("button", { name: "بازگشت" });
		expect(backBtn).toBeInTheDocument();

		await userEvent.click(backBtn);
		expect(onBackMock).toHaveBeenCalledTimes(1);
	});
});

describe("signFlowDetail - button loading states and double-click prevention", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUser = { id: 10, username: "creator_user" };
		mockIsFullAdmin = false;
		vi.mocked(fetchSignFlowDetail).mockResolvedValue(baseDetail);
		vi.mocked(fetchSignFlowHistory).mockResolvedValue([]);
	});

	it("shows loading state on PDF button while request is pending to prevent duplicate clicks", async () => {
		let resolvePdf!: (val: any) => void;
		const pdfPromise = new Promise((resolve) => {
			resolvePdf = resolve;
		});
		vi.mocked(fetchSignFlowOfficialPdf).mockReturnValue(pdfPromise as any);
		vi.spyOn(window, "open").mockReturnValue({ close: vi.fn(), location: { href: "" } } as any);

		renderWithProviders(<SignFlowDetail id={555} />);
		expect(await screen.findByRole("heading", { name: /گردش امضا #\s*555/ })).toBeInTheDocument();

		const pdfBtn = screen.getByRole("button", { name: /مشاهده PDF رسمی/ });
		expect(pdfBtn).not.toHaveClass("ant-btn-loading");

		await userEvent.click(pdfBtn);
		expect(pdfBtn).toHaveClass("ant-btn-loading");

		// Duplicate click prevention
		await userEvent.click(pdfBtn);
		expect(fetchSignFlowOfficialPdf).toHaveBeenCalledTimes(1);

		resolvePdf({
			headers: { get: () => "application/json" },
			json: vi.fn().mockResolvedValue({ url: "https://example.com/test.pdf" }),
		});

		await waitFor(() => {
			expect(pdfBtn).not.toHaveClass("ant-btn-loading");
		});
	});

	it("shows loading state on approve submit button and prevents duplicate submissions while decision is pending", async () => {
		const messageSuccessSpy = vi.spyOn(message, "success").mockImplementation(() => ({} as any));
		let resolveDecision!: (val: any) => void;
		const decisionPromise = new Promise((resolve) => {
			resolveDecision = resolve;
		});
		vi.mocked(decideSignFlow).mockReturnValue(decisionPromise as any);

		renderWithProviders(<SignFlowDetail id={555} />);
		expect(await screen.findByRole("heading", { name: /گردش امضا #\s*555/ })).toBeInTheDocument();

		// Open approve modal
		const approveBtn = screen.getByRole("button", { name: /تایید$/ });
		await userEvent.click(approveBtn);

		const confirmBtn = screen.getByRole("button", { name: "تایید کن" });
		expect(confirmBtn).not.toHaveClass("ant-btn-loading");

		await userEvent.click(confirmBtn);
		expect(confirmBtn).toHaveClass("ant-btn-loading");

		// Duplicate click prevention
		await userEvent.click(confirmBtn);
		expect(decideSignFlow).toHaveBeenCalledTimes(1);

		resolveDecision({ ...baseDetail, state: "approved" });

		await waitFor(() => {
			expect(messageSuccessSpy).toHaveBeenCalledWith("مرحله با موفقیت تایید شد");
		});
		expect(decideSignFlow).toHaveBeenCalledTimes(1);
		messageSuccessSpy.mockRestore();
	});

	it("shows loading state on reject submit button and prevents duplicate submissions while rejection is pending", async () => {
		const messageSuccessSpy = vi.spyOn(message, "success").mockImplementation(() => ({} as any));
		let resolveDecision!: (val: any) => void;
		const decisionPromise = new Promise((resolve) => {
			resolveDecision = resolve;
		});
		vi.mocked(decideSignFlow).mockReturnValue(decisionPromise as any);

		renderWithProviders(<SignFlowDetail id={555} />);
		expect(await screen.findByRole("heading", { name: /گردش امضا #\s*555/ })).toBeInTheDocument();

		// Open reject modal
		const rejectBtn = screen.getByRole("button", { name: /رد$/ });
		await userEvent.click(rejectBtn);

		const reasonInput = screen.getByPlaceholderText("دلیل رد را وارد کنید...");
		await userEvent.type(reasonInput, "عدم انطباق شرایط قرارداد");

		const confirmRejectBtn = screen.getByRole("button", { name: "رد کن" });
		expect(confirmRejectBtn).not.toHaveClass("ant-btn-loading");

		await userEvent.click(confirmRejectBtn);
		expect(confirmRejectBtn).toHaveClass("ant-btn-loading");

		// Duplicate click prevention
		await userEvent.click(confirmRejectBtn);
		expect(decideSignFlow).toHaveBeenCalledTimes(1);

		resolveDecision({ ...baseDetail, state: "rejected" });

		await waitFor(() => {
			expect(messageSuccessSpy).toHaveBeenCalledWith("گردش امضا با موفقیت رد شد");
		});
		expect(decideSignFlow).toHaveBeenCalledTimes(1);
		messageSuccessSpy.mockRestore();
	});

	it("shows loading state on cancel submit button and prevents duplicate submissions while cancellation is pending", async () => {
		const messageSuccessSpy = vi.spyOn(message, "success").mockImplementation(() => ({} as any));
		let resolveCancel!: (val: any) => void;
		const cancelPromise = new Promise((resolve) => {
			resolveCancel = resolve;
		});
		vi.mocked(cancelSignFlow).mockReturnValue(cancelPromise as any);

		renderWithProviders(<SignFlowDetail id={555} />);
		expect(await screen.findByRole("heading", { name: /گردش امضا #\s*555/ })).toBeInTheDocument();

		const cancelBtn = screen.getByRole("button", { name: /لغو گردش امضا/ });
		await userEvent.click(cancelBtn);

		const reasonInput = screen.getByPlaceholderText("دلیل لغو را وارد کنید...");
		await userEvent.type(reasonInput, "انصراف مشتری");

		const confirmCancelBtn = screen.getByRole("button", { name: "لغو کن" });
		expect(confirmCancelBtn).not.toHaveClass("ant-btn-loading");

		await userEvent.click(confirmCancelBtn);
		expect(confirmCancelBtn).toHaveClass("ant-btn-loading");

		// Duplicate click prevention
		await userEvent.click(confirmCancelBtn);
		expect(cancelSignFlow).toHaveBeenCalledTimes(1);

		resolveCancel({ ...baseDetail, state: "cancelled" });

		await waitFor(() => {
			expect(messageSuccessSpy).toHaveBeenCalledWith("گردش امضا با موفقیت لغو شد");
		});
		expect(cancelSignFlow).toHaveBeenCalledTimes(1);
		messageSuccessSpy.mockRestore();
	});
});
