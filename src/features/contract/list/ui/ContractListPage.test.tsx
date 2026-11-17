import type { ReactNode } from "react";
import type { ContractListItemType } from "../model/contracts.list.types";
import { useAccess } from "#src/hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App, ConfigProvider, theme } from "antd";
import { ThemeProvider } from "react-jss";
import { MemoryRouter, useNavigate } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchContractsList, fetchDeleteContract } from "../../api/contracts.api";
import ContractListPage from "./ContractListPage";
import "#src/locales";

vi.mock("#src/router/routes", () => ({
	whiteRouteNames: ["/login"],
	accessRoutes: [],
	baseRoutes: [],
}));

vi.mock("#src/utils/request/error-response", () => ({
	isServerErrorHandled: vi.fn().mockReturnValue(false),
	getRequestErrorMessage: vi.fn(),
}));

vi.mock("react-router", async () => {
	const actual = await vi.importActual<any>("react-router");
	return {
		...actual,
		useNavigate: vi.fn(),
	};
});

vi.mock("#src/hooks", () => ({
	useAccess: vi.fn(),
}));

vi.mock("../../api/contracts.api", () => ({
	fetchContractsList: vi.fn(),
	fetchDeleteContract: vi.fn(),
	fetchContractDetail: vi.fn(),
	fetchContractPrintData: vi.fn(),
	fetchSignFlowPreview: vi.fn(),
	checkOfficialPdfStatus: vi.fn(),
}));

vi.mock("#src/features/contract/shared/queries/contract.queries", () => ({
	servicesQuery: () => ({
		queryKey: ["services"],
		queryFn: () => Promise.resolve({
			results: [
				{ id: 1, name: "سرویس اوپن‌ای‌پی‌آی", code: "openapi" },
				{ id: 2, name: "سرویس پیامک", code: "sms" },
				{ id: 3, name: "سرویس ترافیک", code: "traffic" },
			],
		}),
	}),
	companiesByServiceQuery: () => ({
		queryKey: ["companies"],
		queryFn: () => Promise.resolve({
			results: [
				{ id: 101, name: "همراه اول", type: "OPERATOR" },
				{ id: 102, name: "ایرانسل", type: "OPERATOR" },
			],
		}),
	}),
}));

let mockContractsData: ContractListItemType[] = [];

// Mock BasicTable to directly render toolbars, actions and records with high fidelity
vi.mock("#src/components", async (importOriginal) => {
	const actual = await importOriginal<any>();
	return {
		...actual,
		BasicTable: ({ columns, toolBarRender, headerTitle }: any) => {
			const toolBarItems = toolBarRender ? toolBarRender() : [];

			return (
				<div data-testid="basic-table">
					<div data-testid="header-title">{headerTitle}</div>
					<div data-testid="toolbar-items">{toolBarItems}</div>
					<table>
						<thead>
							<tr>
								{columns?.map((c: any) => (
									<th key={c.key || c.dataIndex || c.title}>{c.title}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{mockContractsData.map((record: any) => (
								<tr key={record.id} data-testid={`row-${record.id}`}>
									{columns?.map((c: any) => (
										<td key={c.key || c.dataIndex || c.title}>
											{c.render ? c.render(record[c.dataIndex], record, 0, {}) : record[c.dataIndex]}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			);
		},
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

describe("contractListPage", () => {
	let queryClient: QueryClient;
	const mockNavigate = vi.fn();

	mockContractsData = [
		{
			id: 10,
			contract_number: "CTR-2026-001",
			service_id: 1,
			service_name: "سرویس اوپن‌ای‌پی‌آی",
			company_id: 101,
			company_name: "شرکت تست اول",
			is_official: true,
			is_business_approved: true,
			is_signed: true,
			real_signed_at: null,
			addenda_count: 0,
			start_date: "2026-03-21",
			end_date: "2027-03-20",
			start_jy: 1405,
			start_jm: 1,
			end_jy: 1405,
			end_jm: 12,
		},
		{
			id: 20,
			contract_number: "CTR-2026-002",
			service_id: 2,
			service_name: "سرویس پیامک",
			company_id: 102,
			company_name: "شرکت تست دوم",
			is_official: false,
			is_business_approved: false,
			is_signed: false,
			real_signed_at: null,
			addenda_count: 2,
			start_date: "2026-03-21",
			end_date: "2026-09-22",
			start_jy: 1405,
			start_jm: 1,
			end_jy: 1405,
			end_jm: 6,
		},
	];

	const createWrapper = () => {
		return function Wrapper({ children }: { children: ReactNode }) {
			return (
				<MemoryRouter>
					<ConfigProvider>
						<App>
							<JssThemeBridge>
								<QueryClientProvider client={queryClient}>
									{children}
								</QueryClientProvider>
							</JssThemeBridge>
						</App>
					</ConfigProvider>
				</MemoryRouter>
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

		vi.mocked(useNavigate).mockReturnValue(mockNavigate);

		vi.mocked(useAccess).mockReturnValue({
			hasDomainPermission: vi.fn().mockReturnValue(true),
			hasDomainPermissionByServiceId: vi.fn().mockReturnValue(true),
			getPermittedCompanyTypes: vi.fn().mockReturnValue([
				{ key: "OPERATOR", value: "اپراتور" },
			]),
			getPermittedServiceIds: vi.fn().mockReturnValue([1, 2, 3]),
		} as any);

		vi.mocked(fetchContractsList).mockResolvedValue({
			results: mockContractsData,
			count: 2,
		} as any);
	});

	it("renders page header and action button when user has create permission", async () => {
		render(<ContractListPage />, { wrapper: createWrapper() });

		await waitFor(() => {
			expect(screen.getByText("لیست قراردادها")).toBeInTheDocument();
			expect(screen.getByText("ایجاد قرارداد جدید")).toBeInTheDocument();
		});
	});

	it("navigates to /contracts/new on clicking new contract button", async () => {
		const user = userEvent.setup();
		render(<ContractListPage />, { wrapper: createWrapper() });

		const newBtn = await screen.findByText("ایجاد قرارداد جدید");
		await user.click(newBtn);

		expect(mockNavigate).toHaveBeenCalledWith("/contracts/new");
	});

	it("renders contracts list fetched from API in table rows", async () => {
		render(<ContractListPage />, { wrapper: createWrapper() });

		await waitFor(() => {
			expect(screen.getByText("CTR-۲۰۲۶-۰۰۱")).toBeInTheDocument();
			expect(screen.getByText("CTR-۲۰۲۶-۰۰۲")).toBeInTheDocument();
			expect(screen.getByText("شرکت تست اول")).toBeInTheDocument();
			expect(screen.getByText("شرکت تست دوم")).toBeInTheDocument();
		});
	});

	it("navigates to edit path on clicking edit row action", async () => {
		const user = userEvent.setup();
		render(<ContractListPage />, { wrapper: createWrapper() });

		await waitFor(() => {
			expect(screen.getByText("CTR-۲۰۲۶-۰۰۱")).toBeInTheDocument();
		});

		const editButtons = screen.getAllByTitle("ویرایش قرارداد");
		expect(editButtons.length).toBeGreaterThan(0);
		await user.click(editButtons[0]);

		expect(mockNavigate).toHaveBeenCalledWith("/contracts/edit?contractId=10&service=openapi&serviceId=1&companyType=");
	});

	it("navigates to preview path on clicking preview row action", async () => {
		const user = userEvent.setup();
		render(<ContractListPage />, { wrapper: createWrapper() });

		await waitFor(() => {
			expect(screen.getByText("CTR-۲۰۲۶-۰۰۱")).toBeInTheDocument();
		});

		const previewButtons = screen.getAllByTitle("پیش‌نمایش قرارداد");
		expect(previewButtons.length).toBeGreaterThan(0);
		await user.click(previewButtons[0]);

		expect(mockNavigate).toHaveBeenCalledWith("/contracts/10/preview?service=openapi&serviceId=1&companyType=");
	});

	it("shows delete confirmation with warnings and deletes contract on confirm", async () => {
		const user = userEvent.setup();
		vi.mocked(fetchDeleteContract).mockResolvedValueOnce({} as any);

		render(<ContractListPage />, { wrapper: createWrapper() });

		await waitFor(() => {
			expect(screen.getByText("CTR-۲۰۲۶-۰۰۱")).toBeInTheDocument();
		});

		const deleteButtons = screen.getAllByTitle("حذف قرارداد");
		await user.click(deleteButtons[0]);

		// Popconfirm opens with confirmation message
		await waitFor(() => {
			expect(screen.getByText("آیا از حذف مطمئن هستید؟")).toBeInTheDocument();
		});

		const confirmBtn = screen.getByRole("button", { name: "تأیید" });
		await user.click(confirmBtn);

		await waitFor(() => {
			expect(fetchDeleteContract).toHaveBeenCalledWith("openapi", 10);
		});
	});
});
