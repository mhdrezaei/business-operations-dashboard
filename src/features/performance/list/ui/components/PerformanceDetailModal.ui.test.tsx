import type { CompanyDto } from "#src/api/common/common.types";
import type { ReactNode } from "react";
import type { PerformanceListRow } from "../../model/performance.list.types";
import { fetchPerformanceContracts, fetchPerformanceDetail, fetchPerformanceList } from "#src/features/performance/api/performances.api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PerformanceDetailModal } from "./PerformanceDetailModal";
import "#src/locales";

vi.mock("#src/features/performance/api/performances.api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("#src/features/performance/api/performances.api")>();
	return {
		...actual,
		fetchPerformanceDetail: vi.fn(),
		fetchPerformanceContracts: vi.fn(),
		fetchPerformanceList: vi.fn(),
		fetchMonthlyContractStatus: vi.fn(),
		updatePerformanceById: vi.fn(),
		updatePerformanceByComposite: vi.fn(),
		upsertPerformance: vi.fn(),
	};
});

describe("performanceDetailModal - Phase 3 UI Tests", () => {
	let queryClient: QueryClient;

	const mockRecord: PerformanceListRow = {
		id: 101,
		key: "101",
		serviceId: 2,
		service: 2,
		serviceName: "پی اس پی",
		companyId: 5,
		company: 5,
		companyName: "شرکت تست",
		year: 1403,
		month: 6,
		sh_year: 1403,
		sh_month: 6,
		value: 1000,
		raw: {
			id: 101,
			service: 2,
			service_id: 2,
			company: 5,
			company_id: 5,
			sh_year: 1403,
			sh_month: 6,
			value: 1000,
		},
	};

	const mockCompanies: CompanyDto[] = [
		{ id: 5, name: "شرکت تست", code: "TST" } as any,
	];

	const createWrapper = () => {
		return function Wrapper({ children }: { children: ReactNode }) {
			return (
				<ConfigProvider>
					<App>
						<QueryClientProvider client={queryClient}>
							{children}
						</QueryClientProvider>
					</App>
				</ConfigProvider>
			);
		};
	};

	beforeEach(() => {
		window.$message = {
			destroy: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			loading: vi.fn(),
			open: vi.fn(),
			success: vi.fn(),
			warning: vi.fn(),
		} as any;

		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					gcTime: 0,
					retry: false,
					staleTime: Number.POSITIVE_INFINITY,
				},
			},
		});

		vi.mocked(fetchPerformanceDetail).mockResolvedValue({
			id: 101,
			service: 2,
			company: 5,
			sh_year: 1403,
			sh_month: 6,
			value: 1000,
		});
		vi.mocked(fetchPerformanceContracts).mockResolvedValue({ results: [] } as any);
		vi.mocked(fetchPerformanceList).mockResolvedValue({ results: [] } as any);
	});

	afterEach(() => {
		vi.clearAllMocks();
		queryClient.clear();
	});

	describe("access and Display States (canUpdate)", () => {
		it("hides edit and reset buttons when canUpdate is false", async () => {
			render(
				<PerformanceDetailModal
					open={true}
					service="psp"
					companies={mockCompanies}
					record={mockRecord}
					onClose={vi.fn()}
					canUpdate={false}
				/>,
				{ wrapper: createWrapper() },
			);

			await waitFor(() => {
				expect(screen.getByText("ویرایش عملکرد PSP")).toBeInTheDocument();
				expect(screen.getAllByRole("textbox")[0]).toHaveValue("1,000");
			});

			// Header edit button should not be rendered
			expect(screen.queryByRole("button", { name: /edit|ویرایش$/ })).not.toBeInTheDocument();
			// Footer edit button should not be rendered
			expect(screen.queryByRole("button", { name: "ویرایش عملکرد" })).not.toBeInTheDocument();
			// Reset button should not be rendered
			expect(screen.queryByRole("button", { name: /reload|بازنشانی/ })).not.toBeInTheDocument();
		});

		it("renders header edit button as disabled when canUpdate is true and no changes exist", async () => {
			render(
				<PerformanceDetailModal
					open={true}
					service="psp"
					companies={mockCompanies}
					record={mockRecord}
					onClose={vi.fn()}
					canUpdate={true}
				/>,
				{ wrapper: createWrapper() },
			);

			await waitFor(() => {
				expect(screen.getByText("ویرایش عملکرد PSP")).toBeInTheDocument();
				expect(screen.getAllByRole("textbox")[0]).toHaveValue("1,000");
			});

			// Header edit button should be rendered and disabled initially (no meaningful changes)
			const editButton = screen.getByRole("button", { name: /edit|ویرایش$/ });
			expect(editButton).toBeInTheDocument();
			expect(editButton).toBeDisabled();

			// Footer edit button should not be rendered because hasMeaningfulChanges is false
			expect(screen.queryByRole("button", { name: "ویرایش عملکرد" })).not.toBeInTheDocument();
			// Reset button should not be rendered
			expect(screen.queryByRole("button", { name: /reload|بازنشانی/ })).not.toBeInTheDocument();
		});

		it("enables header edit button and shows footer edit button when form values change", async () => {
			render(
				<PerformanceDetailModal
					open={true}
					service="psp"
					companies={mockCompanies}
					record={mockRecord}
					onClose={vi.fn()}
					canUpdate={true}
				/>,
				{ wrapper: createWrapper() },
			);

			await waitFor(() => {
				expect(screen.getByText("ویرایش عملکرد PSP")).toBeInTheDocument();
				expect(screen.getAllByRole("textbox")[0]).toHaveValue("1,000");
			});

			const inputs = screen.getAllByRole("textbox");
			const valueInput = inputs[0];

			// Change value to 2500
			fireEvent.change(valueInput, { target: { value: "2500" } });

			await waitFor(() => {
				const editButton = screen.getByRole("button", { name: /edit|ویرایش$/ });
				expect(editButton).toBeEnabled();
				expect(screen.getByRole("button", { name: "ویرایش عملکرد" })).toBeInTheDocument();
				expect(screen.getByRole("button", { name: /reload|بازنشانی/ })).toBeInTheDocument();
			});
		});
	});

	describe("reset Button (ReloadOutlined)", () => {
		it("reverts modified field values back to initial state and disables edit button", async () => {
			render(
				<PerformanceDetailModal
					open={true}
					service="psp"
					companies={mockCompanies}
					record={mockRecord}
					onClose={vi.fn()}
					canUpdate={true}
				/>,
				{ wrapper: createWrapper() },
			);

			await waitFor(() => {
				expect(screen.getByText("ویرایش عملکرد PSP")).toBeInTheDocument();
				expect(screen.getAllByRole("textbox")[0]).toHaveValue("1,000");
			});

			const valueInput = screen.getAllByRole("textbox")[0];

			// Modify value
			fireEvent.change(valueInput, { target: { value: "9999" } });

			// Wait for Reset button to appear
			await waitFor(() => {
				expect(screen.getByRole("button", { name: /reload|بازنشانی/ })).toBeInTheDocument();
			});

			// Click Reset button
			const resetButton = screen.getByRole("button", { name: /reload|بازنشانی/ });
			fireEvent.click(resetButton);

			// After reset, value reverts to initial value, meaningful changes become false
			await waitFor(() => {
				// Reset button disappears
				expect(screen.queryByRole("button", { name: /reload|بازنشانی/ })).not.toBeInTheDocument();
				// Footer edit button disappears
				expect(screen.queryByRole("button", { name: "ویرایش عملکرد" })).not.toBeInTheDocument();
				// Header edit button becomes disabled again
				expect(screen.getByRole("button", { name: /edit|ویرایش$/ })).toBeDisabled();
				// Input value reverted
				expect(valueInput).toHaveValue("1,000");
			});
		});
	});

	describe("delete Button and Popconfirm", () => {
		it("does not render delete button when onDelete prop is undefined", async () => {
			render(
				<PerformanceDetailModal
					open={true}
					service="psp"
					companies={mockCompanies}
					record={mockRecord}
					onClose={vi.fn()}
					onDelete={undefined}
				/>,
				{ wrapper: createWrapper() },
			);

			await waitFor(() => {
				expect(screen.getByText("ویرایش عملکرد PSP")).toBeInTheDocument();
			});

			expect(screen.queryByRole("button", { name: /delete|حذف/ })).not.toBeInTheDocument();
		});

		it("renders delete button when onDelete prop is provided", async () => {
			render(
				<PerformanceDetailModal
					open={true}
					service="psp"
					companies={mockCompanies}
					record={mockRecord}
					onClose={vi.fn()}
					onDelete={vi.fn()}
				/>,
				{ wrapper: createWrapper() },
			);

			await waitFor(() => {
				expect(screen.getByText("ویرایش عملکرد PSP")).toBeInTheDocument();
			});

			expect(screen.getByRole("button", { name: /delete|حذف/ })).toBeInTheDocument();
		});

		it("shows loading state on delete button when deleting is true", async () => {
			render(
				<PerformanceDetailModal
					open={true}
					service="psp"
					companies={mockCompanies}
					record={mockRecord}
					onClose={vi.fn()}
					onDelete={vi.fn()}
					deleting={true}
				/>,
				{ wrapper: createWrapper() },
			);

			await waitFor(() => {
				expect(screen.getByText("ویرایش عملکرد PSP")).toBeInTheDocument();
			});

			const deleteBtn = screen.getByRole("button", { name: /delete|حذف/ });
			expect(deleteBtn.className).toContain("ant-btn-loading");
		});

		it("opens Popconfirm on click and calls onDelete on confirm", async () => {
			const onDelete = vi.fn();
			render(
				<PerformanceDetailModal
					open={true}
					service="psp"
					companies={mockCompanies}
					record={mockRecord}
					onClose={vi.fn()}
					onDelete={onDelete}
				/>,
				{ wrapper: createWrapper() },
			);

			await waitFor(() => {
				expect(screen.getByText("ویرایش عملکرد PSP")).toBeInTheDocument();
			});

			const deleteBtn = screen.getByRole("button", { name: /delete|حذف/ });
			fireEvent.click(deleteBtn);

			// Popconfirm overlay should show
			await waitFor(() => {
				expect(screen.getByText("آیا از حذف مطمئن هستید؟")).toBeInTheDocument();
			});

			// Find Popconfirm popup container
			const popconfirm = document.querySelector(".ant-popconfirm") || document.querySelector(".ant-popover");
			expect(popconfirm).toBeInTheDocument();

			const confirmBtn = within(popconfirm as HTMLElement).getByRole("button", { name: "تأیید" });
			fireEvent.click(confirmBtn);

			expect(onDelete).toHaveBeenCalledTimes(1);
		});

		it("does not call onDelete when Popconfirm cancel is clicked", async () => {
			const onDelete = vi.fn();
			render(
				<PerformanceDetailModal
					open={true}
					service="psp"
					companies={mockCompanies}
					record={mockRecord}
					onClose={vi.fn()}
					onDelete={onDelete}
				/>,
				{ wrapper: createWrapper() },
			);

			await waitFor(() => {
				expect(screen.getByText("ویرایش عملکرد PSP")).toBeInTheDocument();
			});

			const deleteBtn = screen.getByRole("button", { name: /delete|حذف/ });
			fireEvent.click(deleteBtn);

			await waitFor(() => {
				expect(screen.getByText("آیا از حذف مطمئن هستید؟")).toBeInTheDocument();
			});

			const popconfirm = document.querySelector(".ant-popconfirm") || document.querySelector(".ant-popover");
			expect(popconfirm).toBeInTheDocument();

			const cancelBtn = within(popconfirm as HTMLElement).getByRole("button", { name: "انصراف" });
			fireEvent.click(cancelBtn);

			expect(onDelete).not.toHaveBeenCalled();
		});
	});
});
