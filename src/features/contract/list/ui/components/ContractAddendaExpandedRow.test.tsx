import type { ReactNode } from "react";
import type { ContractListItemType } from "../../model/contracts.list.types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { ConfigProvider, theme } from "antd";
import React from "react";
import { ThemeProvider } from "react-jss";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchContractApprovalHistory, fetchContractDetail } from "../../../api/contracts.api";
import { ContractAddendaExpandedRow } from "./ContractAddendaExpandedRow";

vi.mock("../../../api/contracts.api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../../api/contracts.api")>();
	return {
		...actual,
		fetchContractDetail: vi.fn(),
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

describe("contractAddendaExpandedRow", () => {
	let queryClient: QueryClient;

	const mockContract: ContractListItemType = {
		id: 50,
		company_id: 1,
		company_name: "شرکت تست",
		service_id: 2,
		service_name: "سرویس پیامک",
		contract_number: "CTR-50",
		start_date: "2026-03-21",
		end_date: "2027-03-20",
		start_jy: 1405,
		start_jm: 1,
		end_jy: 1405,
		end_jm: 12,
		is_official: true,
		is_business_approved: true,
		is_signed: true,
		real_signed_at: null,
		addenda_count: 1,
	};

	const createWrapper = () => {
		return function QueryWrapper({ children }: { children: ReactNode }) {
			return (
				<ConfigProvider>
					<JssThemeBridge>
						<QueryClientProvider client={queryClient}>
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

		vi.mocked(fetchContractApprovalHistory).mockResolvedValue({
			id: 50,
			is_business_approved: true,
			is_signed: true,
			sign_approval_history: [],
			addenda: [],
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
		queryClient.clear();
	});

	it("shows loading spinner while queries are pending", () => {
		vi.mocked(fetchContractDetail).mockReturnValue(new Promise(() => {}));

		const { container } = render(
			<ContractAddendaExpandedRow contract={mockContract} service="openapi" />,
			{ wrapper: createWrapper() },
		);

		expect(container.querySelector(".ant-spin-spinning")).toBeInTheDocument();
	});

	it("shows error alert when contract detail fetch fails", async () => {
		vi.mocked(fetchContractDetail).mockRejectedValueOnce(new Error("Network Error"));

		render(
			<ContractAddendaExpandedRow contract={mockContract} service="openapi" />,
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(screen.getByText("دریافت فهرست الحاقیه‌ها ناموفق بود.")).toBeInTheDocument();
		});
	});

	it("renders empty state message when contract has no addenda", async () => {
		queryClient.setQueryData(["contracts", "detail", "openapi", 50], {
			id: 50,
			addenda: [],
		});

		render(
			<ContractAddendaExpandedRow contract={mockContract} service="openapi" />,
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(screen.getByText("الحاقیه‌ای برای این قرارداد ثبت نشده است.")).toBeInTheDocument();
		});
	});

	it("renders tree table with columns and addenda items when addenda exist", async () => {
		queryClient.setQueryData(["contracts", "detail", "openapi", 50], {
			id: 50,
			addenda: [
				{
					id: 501,
					display_addendum_number: "1",
					contract_number: "ADD-501",
					start_jy: 1405,
					start_jm: 1,
					end_jy: 1405,
					end_jm: 6,
					children: [
						{
							id: 502,
							parent_addendum_id: 501,
							display_addendum_number: "1.1",
							contract_number: "ADD-502",
							start_jy: 1405,
							start_jm: 7,
							end_jy: 1405,
							end_jm: 12,
						},
					],
				},
			],
		});

		render(
			<ContractAddendaExpandedRow contract={mockContract} service="openapi" />,
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(screen.getAllByText("شماره").length).toBeGreaterThanOrEqual(1);
			expect(screen.getAllByText("الحاقیه").length).toBeGreaterThanOrEqual(1);
			expect(screen.getAllByText("الحاقیه روی الحاقیه").length).toBeGreaterThanOrEqual(1);
			expect(screen.getByText("الحاقیه ۱")).toBeInTheDocument();
			expect(screen.getByText("قرارداد اصلی")).toBeInTheDocument();
		});
	});
});
