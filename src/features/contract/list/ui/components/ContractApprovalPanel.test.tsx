import type { ReactNode } from "react";
import type { ContractApprovalHistoryResponse, ContractServicePath } from "../../../api/contracts.api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider, theme } from "antd";
import React from "react";
import { ThemeProvider } from "react-jss";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchContractApprovalHistory, updateContractApproval } from "../../../api/contracts.api";
import { contractApprovalQuery } from "../../../shared/queries/contract.queries";
import { ContractApprovalPanel } from "./ContractApprovalPanel";

const mockHasDomainPermission = vi.fn();

vi.mock("#src/hooks", () => ({
	useAccess: vi.fn(() => ({
		hasDomainPermissionByServiceId: (...args: unknown[]) => mockHasDomainPermission(...args),
	})),
}));

vi.mock("../../../api/contracts.api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../../api/contracts.api")>();
	return {
		...actual,
		updateContractApproval: vi.fn(),
		fetchContractApprovalHistory: vi.fn(),
	};
});

function JssThemeBridge({ children }: { children: ReactNode }) {
	const { token } = theme.useToken();
	return (
		<ThemeProvider theme={{ prefixCls: "ant", token }}>
			{children}
		</ThemeProvider>
	);
}

describe("contractApprovalPanel", () => {
	let queryClient: QueryClient;
	const contractId = 100;
	const service: ContractServicePath = "openapi";

	const mockApprovalData: ContractApprovalHistoryResponse = {
		id: contractId,
		is_business_approved: false,
		is_signed: false,
		sign_approval_history: [],
		addenda: [
			{
				id: 201,
				display_addendum_number: "1",
				is_business_approved: false,
				is_signed: false,
				sign_approval_history: [],
			},
		],
	};

	const createWrapper = (client = queryClient) => {
		return function QueryWrapper({ children }: { children: ReactNode }) {
			return (
				<ConfigProvider>
					<JssThemeBridge>
						<QueryClientProvider client={client}>
							{children}
						</QueryClientProvider>
					</JssThemeBridge>
				</ConfigProvider>
			);
		};
	};

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
					gcTime: 0,
					staleTime: Number.POSITIVE_INFINITY,
				},
			},
		});

		mockHasDomainPermission.mockReturnValue(true);
		vi.mocked(fetchContractApprovalHistory).mockResolvedValue(mockApprovalData);
		window.$message = {
			success: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			warning: vi.fn(),
			loading: vi.fn(),
		} as any;
	});

	afterEach(() => {
		vi.clearAllMocks();
		queryClient.clear();
	});

	it("shows loading state when approval query is pending", () => {
		vi.mocked(fetchContractApprovalHistory).mockReturnValue(new Promise(() => {}));

		const { container } = render(
			<ContractApprovalPanel contractId={contractId} service={service} detail={null} />,
			{
				wrapper: createWrapper(),
			},
		);

		expect(container.querySelector(".ant-spin-spinning")).toBeInTheDocument();
	});

	it("shows error alert when query fails", async () => {
		vi.mocked(fetchContractApprovalHistory).mockRejectedValueOnce(new Error("Failed"));

		render(
			<ContractApprovalPanel contractId={contractId} service={service} detail={null} />,
			{
				wrapper: createWrapper(),
			},
		);

		await waitFor(() => {
			expect(screen.getByText("دریافت وضعیت تأیید ناموفق بود")).toBeInTheDocument();
		});
	});

	it("renders main contract and addenda subjects with status tags", () => {
		const query = contractApprovalQuery(service, contractId);
		queryClient.setQueryData(query.queryKey, mockApprovalData);

		render(
			<ContractApprovalPanel contractId={contractId} service={service} detail={{ is_official: true }} />,
			{ wrapper: createWrapper() },
		);

		expect(screen.getByText("وضعیت تأیید و تاریخچه")).toBeInTheDocument();
		expect(screen.getByText("قرارداد اصلی")).toBeInTheDocument();
		expect(screen.getByText("الحاقیه ۱")).toBeInTheDocument();
	});

	it("renders info alert when unofficial contract is blocked", () => {
		const query = contractApprovalQuery("sms/client", contractId);
		queryClient.setQueryData(query.queryKey, mockApprovalData);

		render(
			<ContractApprovalPanel
				contractId={contractId}
				service="sms/client"
				detail={{ is_official: false }}
			/>,
			{ wrapper: createWrapper() },
		);

		expect(
			screen.getByText("این قرارداد غیررسمی است و تأیید برای آن مجاز نیست."),
		).toBeInTheDocument();
	});

	it("hides decision buttons when user lacks domain permission", async () => {
		mockHasDomainPermission.mockReturnValue(false);
		const query = contractApprovalQuery(service, contractId);
		queryClient.setQueryData(query.queryKey, mockApprovalData);

		render(
			<ContractApprovalPanel contractId={contractId} service={service} detail={{ is_official: true }} />,
			{ wrapper: createWrapper() },
		);

		// Expand main contract collapse panel
		fireEvent.click(screen.getByText("قرارداد اصلی"));

		await waitFor(() => {
			expect(screen.getByText(/تأیید تجاری/)).toBeInTheDocument();
		});

		// Buttons should not exist because canDecideField returns false
		expect(screen.queryByRole("button", { name: "تأیید" })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "رد" })).not.toBeInTheDocument();
	});

	it("renders decision buttons and disables sign button if business is not approved", async () => {
		mockHasDomainPermission.mockReturnValue(true);
		const query = contractApprovalQuery(service, contractId);
		queryClient.setQueryData(query.queryKey, mockApprovalData);

		render(
			<ContractApprovalPanel contractId={contractId} service={service} detail={{ is_official: true }} />,
			{ wrapper: createWrapper() },
		);

		// Expand main contract
		fireEvent.click(screen.getByText("قرارداد اصلی"));

		await waitFor(() => {
			expect(screen.getByText(/تأیید تجاری/)).toBeInTheDocument();
		});

		const confirmButtons = screen.getAllByRole("button", { name: "تأیید" });
		expect(confirmButtons.length).toBeGreaterThanOrEqual(2);

		// Business confirm is enabled (since business_approved is false)
		const businessConfirmBtn = confirmButtons[0];
		expect(businessConfirmBtn).not.toBeDisabled();

		// Contract sign confirm is disabled (because business is not approved yet)
		const contractSignConfirmBtn = confirmButtons[1];
		expect(contractSignConfirmBtn).toBeDisabled();
	});

	it("disables buttons when contract is locked with real signature", async () => {
		mockHasDomainPermission.mockReturnValue(true);
		const query = contractApprovalQuery(service, contractId);
		queryClient.setQueryData(query.queryKey, mockApprovalData);

		render(
			<ContractApprovalPanel
				contractId={contractId}
				service={service}
				detail={{ is_official: true, real_signed_at: "2026-10-10" }}
			/>,
			{ wrapper: createWrapper() },
		);

		// Expand main contract
		fireEvent.click(screen.getByText("قرارداد اصلی"));

		await waitFor(() => {
			expect(screen.getByText(/تأیید تجاری/)).toBeInTheDocument();
		});

		const confirmButtons = screen.getAllByRole("button", { name: "تأیید" });
		expect(confirmButtons[0]).toBeDisabled();
		expect(confirmButtons[1]).toBeDisabled();
	});

	it("opens modal on clicking confirm, allows entering comment and submits approval mutation", async () => {
		const user = userEvent.setup();
		mockHasDomainPermission.mockReturnValue(true);
		const query = contractApprovalQuery(service, contractId);
		queryClient.setQueryData(query.queryKey, mockApprovalData);

		const updatedResponse = {
			...mockApprovalData,
			is_business_approved: true,
		};
		vi.mocked(updateContractApproval).mockResolvedValueOnce(updatedResponse);

		render(
			<ContractApprovalPanel contractId={contractId} service={service} detail={{ is_official: true }} />,
			{ wrapper: createWrapper() },
		);

		// Expand main contract
		fireEvent.click(screen.getByText("قرارداد اصلی"));

		await waitFor(() => {
			expect(screen.getByText(/تأیید تجاری/)).toBeInTheDocument();
		});

		const confirmButtons = screen.getAllByRole("button", { name: "تأیید" });
		await user.click(confirmButtons[0]);

		// Modal should open
		await waitFor(() => {
			expect(screen.getByPlaceholderText("توضیحات (اختیاری)")).toBeInTheDocument();
		});

		// Type comment
		const textarea = screen.getByPlaceholderText("توضیحات (اختیاری)");
		await user.type(textarea, "تأیید شد توسط واحد بازرگانی");

		// Submit modal
		const submitButton = screen.getByRole("button", { name: "ثبت" });
		await user.click(submitButton);

		expect(updateContractApproval).toHaveBeenCalledWith("openapi", 100, {
			is_business_approved: true,
			comment: "تأیید شد توسط واحد بازرگانی",
		});

		await waitFor(() => {
			expect(window.$message?.success).toHaveBeenCalledWith("وضعیت تأیید با موفقیت ثبت شد");
		});
	}, 15000);
});
