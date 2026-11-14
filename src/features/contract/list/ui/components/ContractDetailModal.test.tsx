import type { ReactNode } from "react";
import type { ContractServicePath } from "../../../api/contracts.api";
import { listContractDocuments } from "#src/features/contract/api/contract-documents.api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { ConfigProvider, theme } from "antd";
import React from "react";
import { ThemeProvider } from "react-jss";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchContractApprovalHistory, fetchContractDetail } from "../../../api/contracts.api";
import { ContractEditForm } from "./ContractDetailModal";

vi.mock("#src/features/contract/api/contract-documents.api", () => ({
	listContractDocuments: vi.fn(),
}));

vi.mock("../../../api/contracts.api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../../api/contracts.api")>();
	return {
		...actual,
		fetchContractDetail: vi.fn(),
		fetchContractApprovalHistory: vi.fn(),
		fetchDeleteContract: vi.fn(),
		fetchUpdateContract: vi.fn(),
		resolveSalesAgencyExpenseTitleNames: vi.fn().mockResolvedValue({}),
	};
});

vi.mock("#src/hooks", () => ({
	useAccess: vi.fn(() => ({
		hasDomainPermissionByServiceId: () => true,
	})),
}));

vi.mock("#src/features/contract/additional-info", () => ({
	ContractAdditionalInfoPanel: () => <div data-testid="additional-info-panel">اطلاعات تکمیلی</div>,
}));

vi.mock("../../../shared/ui/ScopedCompanyContractsPanel", () => ({
	ScopedCompanyContractsPanel: () => <div data-testid="scoped-contracts-panel">پنل شرکت</div>,
}));

// Mock ContractReadOnlyDetails to keep test isolated
vi.mock("#src/features/contract/preview/ui/ContractReadOnlyDetails", () => ({
	ContractReadOnlyDetails: () => <div data-testid="read-only-details">اطلاعات قرارداد</div>,
}));

// Mock ContractForm
vi.mock("#src/features/contract/shared/ui/form/ContractForm", () => ({
	ContractForm: () => <div data-testid="contract-form">فرم ویرایش قرارداد</div>,
}));

function JssThemeBridge({ children }: { children: ReactNode }) {
	const { token } = theme.useToken();
	return (
		<ThemeProvider theme={{ prefixCls: "ant", token }}>
			{children}
		</ThemeProvider>
	);
}

describe("contractDetailModal (ContractEditForm)", () => {
	let queryClient: QueryClient;
	const contractId = 88;
	const service: ContractServicePath = "openapi";

	const mockDetail = {
		id: contractId,
		service_id: 1,
		company_id: 2,
		contract_number: "CTR-88",
		service: { id: 1, name: "سرویس اوپن‌ای‌پی‌آی", code: "openapi" },
		company: { id: 2, name: "شرکت تست" },
		start_jy: 1405,
		start_jm: 1,
		end_jy: 1405,
		end_jm: 12,
		is_official: true,
		addenda: [],
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

		vi.mocked(listContractDocuments).mockResolvedValue({ results: [], count: 0 } as any);
		vi.mocked(fetchContractApprovalHistory).mockResolvedValue({
			id: contractId,
			is_business_approved: false,
			is_signed: false,
			sign_approval_history: [],
			addenda: [],
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
		queryClient.clear();
	});

	it("shows loading spinner while contract detail is fetching", () => {
		vi.mocked(fetchContractDetail).mockReturnValue(new Promise(() => {}));

		const { container } = render(
			<ContractEditForm contractId={contractId} service={service} />,
			{ wrapper: createWrapper() },
		);

		expect(container.querySelector(".ant-spin-spinning")).toBeInTheDocument();
	});

	it("shows error alert when contract detail fetch fails", async () => {
		vi.mocked(fetchContractDetail).mockRejectedValueOnce(new Error("Failed"));

		render(
			<ContractEditForm contractId={contractId} service={service} />,
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(screen.getByText("اطلاعات قرارداد یافت نشد")).toBeInTheDocument();
		});
	});

	it("renders readOnly contract details, documents panel, and approval panel when readOnly is true", async () => {
		vi.mocked(fetchContractDetail).mockResolvedValueOnce(mockDetail);

		render(
			<ContractEditForm
				contractId={contractId}
				service={service}
				readOnly={true}
				readOnlyHeader={<div>هدر اختصاصی</div>}
			/>,
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(screen.getByTestId("read-only-details")).toBeInTheDocument();
			expect(screen.getByText("هدر اختصاصی")).toBeInTheDocument();
			expect(screen.getByText("فایل‌های پیوست")).toBeInTheDocument();
			expect(screen.getByText("وضعیت تأیید و تاریخچه")).toBeInTheDocument();
		});
	});

	it("renders editable contract form when readOnly is false", async () => {
		vi.mocked(fetchContractDetail).mockResolvedValueOnce(mockDetail);

		render(
			<ContractEditForm
				contractId={contractId}
				service={service}
				readOnly={false}
			/>,
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(screen.getByTestId("contract-form")).toBeInTheDocument();
		});
	});
});
