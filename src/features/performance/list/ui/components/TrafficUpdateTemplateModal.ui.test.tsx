import type { PerformanceGapsResponse, TrafficExcelUpdateResponse } from "#src/features/performance/api/performances.api";
import type { ReactNode } from "react";
import {
	downloadTrafficUpdateTemplate,
	updateTrafficExcelImport,
} from "#src/features/performance/api/performances.api";
import { performanceGapsQuery } from "#src/features/performance/shared/queries/performance.queries";
import { MONTH_OPTIONS } from "#src/features/performance/shared/ui/form/constants/jalali-date-options";
import { downloadBlob } from "#src/utils/download-blob";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrafficUpdateTemplateModal } from "./TrafficUpdateTemplateModal";
import "#src/locales";

vi.mock("#src/features/performance/api/performances.api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("#src/features/performance/api/performances.api")>();
	return {
		...actual,
		downloadTrafficUpdateTemplate: vi.fn(),
		updateTrafficExcelImport: vi.fn(),
	};
});

vi.mock("#src/features/performance/shared/queries/performance.queries", async (importOriginal) => {
	const actual = await importOriginal<typeof import("#src/features/performance/shared/queries/performance.queries")>();
	return {
		...actual,
		performanceGapsQuery: vi.fn(),
	};
});

vi.mock("#src/utils/download-blob", () => ({
	downloadBlob: vi.fn(),
}));

vi.mock("#src/utils/request/error-response", () => ({
	getRequestErrorMessage: vi.fn(() => Promise.resolve("خطای تستی در آپلود")),
}));

describe("trafficUpdateTemplateModal - Phase 5 UI Tests", () => {
	let queryClient: QueryClient;

	const mockCompanyTypes = [
		{ label: "اپراتور اول", value: "operator_a" },
		{ label: "اپراتور دوم", value: "operator_b" },
	];

	const mockGapsResponse: Partial<PerformanceGapsResponse> = {
		performance_months_by_year: {
			1403: [1, 2, 3],
			1404: [4, 5],
		} as any,
	};

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

	async function selectOption(selectElement: Element, optionText: string) {
		fireEvent.mouseDown(selectElement);
		const matches = await screen.findAllByText(optionText);
		const option = matches.find(el => el.classList.contains("ant-select-item-option-content")) ?? matches[matches.length - 1];
		fireEvent.click(option.closest(".ant-select-item-option") ?? option);
	}

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

		vi.mocked(performanceGapsQuery).mockImplementation(({ serviceId, companyType }: any) => ({
			queryKey: ["performances", "gaps", { serviceId, companyType }],
			queryFn: () => Promise.resolve(mockGapsResponse as PerformanceGapsResponse),
			enabled: !!serviceId && !!companyType,
		}) as any);
	});

	afterEach(() => {
		vi.clearAllMocks();
		queryClient.clear();
	});

	it("1. populates year and month options dynamically based on gaps response", async () => {
		render(
			<TrafficUpdateTemplateModal
				open={true}
				serviceId={10}
				companyTypeOptions={mockCompanyTypes}
				onClose={vi.fn()}
			/>,
			{ wrapper: createWrapper() },
		);

		await screen.findByText("ویرایش تمپلیت عملکرد ترافیک");

		const selects = document.querySelectorAll(".traffic-update-template-period .ant-select-selector");
		expect(selects.length).toBe(3);

		// Year and month should initially be disabled
		expect(document.querySelectorAll(".traffic-update-template-period .ant-select-disabled").length).toBeGreaterThanOrEqual(1);

		// 1. Select company type (Operator A)
		await selectOption(selects[0], "اپراتور اول");

		// Gaps query should be triggered with selected companyType
		await waitFor(() => {
			expect(performanceGapsQuery).toHaveBeenCalledWith(
				expect.objectContaining({
					serviceId: 10,
					companyType: "operator_a",
				}),
			);
		});

		// 2. Open Year dropdown and verify years from mockGapsResponse (1403, 1404)
		await selectOption(selects[1], "1403");

		// 3. Open Month dropdown and verify months (1, 2, 3 correspond to Farvardin, Ordibehesht, Khordad)
		const month1Label = MONTH_OPTIONS.find(m => m.value === 1)?.label ?? "فروردین";
		const month2Label = MONTH_OPTIONS.find(m => m.value === 2)?.label ?? "اردیبهشت";
		const month3Label = MONTH_OPTIONS.find(m => m.value === 3)?.label ?? "خرداد";

		fireEvent.mouseDown(selects[2]);
		expect((await screen.findAllByText(month1Label)).length).toBeGreaterThan(0);
		expect((await screen.findAllByText(month2Label)).length).toBeGreaterThan(0);
		expect((await screen.findAllByText(month3Label)).length).toBeGreaterThan(0);

		// Month 4 should not be in the list for 1403
		const month4Label = MONTH_OPTIONS.find(m => m.value === 4)?.label ?? "تیر";
		expect(screen.queryByText(month4Label)).not.toBeInTheDocument();

		// Select month 1
		await selectOption(selects[2], month1Label);
	});

	it("2. validates download button state and triggers downloadTrafficUpdateTemplate", async () => {
		const mockBlob = new Blob(["test-content"], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
		vi.mocked(downloadTrafficUpdateTemplate).mockResolvedValue(mockBlob);

		render(
			<TrafficUpdateTemplateModal
				open={true}
				serviceId={15}
				companyTypeOptions={mockCompanyTypes}
				onClose={vi.fn()}
			/>,
			{ wrapper: createWrapper() },
		);

		await screen.findByText("ویرایش تمپلیت عملکرد ترافیک");

		const downloadBtn = screen.getByRole("button", { name: /دانلود/ });
		// Initially disabled because companyType, year, month are not selected
		expect(downloadBtn).toBeDisabled();

		const selects = document.querySelectorAll(".traffic-update-template-period .ant-select-selector");

		// Select company type
		await selectOption(selects[0], "اپراتور دوم");

		await waitFor(() => {
			expect(performanceGapsQuery).toHaveBeenCalledWith(
				expect.objectContaining({
					companyType: "operator_b",
				}),
			);
		});

		// Select year 1404
		await selectOption(selects[1], "1404");

		// Select month 4
		const month4Label = MONTH_OPTIONS.find(m => m.value === 4)?.label ?? "تیر";
		await selectOption(selects[2], month4Label);

		// Now download button should be enabled
		await waitFor(() => {
			expect(downloadBtn).toBeEnabled();
		});

		// Click download
		fireEvent.click(downloadBtn);

		await waitFor(() => {
			expect(downloadTrafficUpdateTemplate).toHaveBeenCalledWith({
				serviceId: 15,
				sh_year: 1404,
				sh_month: 4,
				company_type: "operator_b",
			});
			expect(downloadBlob).toHaveBeenCalledWith(
				mockBlob,
				"traffic_update_template_operator_b_1404_4.xlsx",
			);
		});
	});

	it("3. handles excel file upload (updateTrafficExcelImport) and displays result stats", async () => {
		const onUploaded = vi.fn();
		const mockUploadResult: TrafficExcelUpdateResponse = {
			total_rows_in_file: 150,
			filled_rows: 140,
			updated: 135,
			skipped_empty: 5,
			rejected: 10,
			rejected_by_reason: {},
			rejected_items: [],
		};

		vi.mocked(updateTrafficExcelImport).mockResolvedValue(mockUploadResult);

		render(
			<TrafficUpdateTemplateModal
				open={true}
				serviceId={20}
				companyTypeOptions={mockCompanyTypes}
				onClose={vi.fn()}
				onUploaded={onUploaded}
			/>,
			{ wrapper: createWrapper() },
		);

		await screen.findByText("ویرایش تمپلیت عملکرد ترافیک");

		const uploadBtn = screen.getByRole("button", { name: /آپلود/ });
		expect(uploadBtn).toBeDisabled();

		const selects = document.querySelectorAll(".traffic-update-template-period .ant-select-selector");

		// 1. Select company type, year, month
		await selectOption(selects[0], "اپراتور اول");

		await waitFor(() => {
			expect(performanceGapsQuery).toHaveBeenCalledWith(
				expect.objectContaining({
					companyType: "operator_a",
				}),
			);
		});

		await selectOption(selects[1], "1403");

		const month2Label = MONTH_OPTIONS.find(m => m.value === 2)?.label ?? "اردیبهشت";
		await selectOption(selects[2], month2Label);

		// 2. Select file in Upload.Dragger
		const fileInput = document.querySelector("input[type=\"file\"]") as HTMLInputElement;
		expect(fileInput).toBeInTheDocument();

		const dummyFile = new File(["dummy excel content"], "traffic_data.xlsx", {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		});

		fireEvent.change(fileInput, {
			target: { files: [dummyFile] },
		});

		// 3. Upload button should now be enabled
		await waitFor(() => {
			expect(uploadBtn).toBeEnabled();
		});

		// 4. Click upload
		fireEvent.click(uploadBtn);

		await waitFor(() => {
			expect(updateTrafficExcelImport).toHaveBeenCalledWith(
				expect.objectContaining({
					serviceId: 20,
					file: dummyFile,
					searchParams: {
						sh_year: 1403,
						sh_month: 2,
						company_type: "operator_a",
					},
					suppressErrorNotification: true,
				}),
			);
			expect(onUploaded).toHaveBeenCalledTimes(1);
		});

		// 5. Verify result stats view is rendered with formatted numbers
		await waitFor(() => {
			expect(screen.getByText("نتیجه آپلود فایل ترافیک")).toBeInTheDocument();
			expect(screen.getByText((150).toLocaleString("fa-IR"))).toBeInTheDocument(); // total_rows_in_file: ۱۵۰
			expect(screen.getByText((140).toLocaleString("fa-IR"))).toBeInTheDocument(); // filled_rows: ۱۴۰
			expect(screen.getByText((135).toLocaleString("fa-IR"))).toBeInTheDocument(); // updated: ۱۳۵
			expect(screen.getByText((10).toLocaleString("fa-IR"))).toBeInTheDocument(); // rejected: ۱۰
		});
	});

	it("4. displays error message when updateTrafficExcelImport fails", async () => {
		vi.mocked(updateTrafficExcelImport).mockRejectedValue(new Error("Network Failure"));

		render(
			<TrafficUpdateTemplateModal
				open={true}
				serviceId={25}
				companyTypeOptions={mockCompanyTypes}
				onClose={vi.fn()}
			/>,
			{ wrapper: createWrapper() },
		);

		await screen.findByText("ویرایش تمپلیت عملکرد ترافیک");

		const selects = document.querySelectorAll(".traffic-update-template-period .ant-select-selector");

		await selectOption(selects[0], "اپراتور دوم");

		await waitFor(() => {
			expect(performanceGapsQuery).toHaveBeenCalledWith(
				expect.objectContaining({
					companyType: "operator_b",
				}),
			);
		});

		await selectOption(selects[1], "1404");

		const month5Label = MONTH_OPTIONS.find(m => m.value === 5)?.label ?? "مرداد";
		await selectOption(selects[2], month5Label);

		const fileInput = document.querySelector("input[type=\"file\"]") as HTMLInputElement;
		const dummyFile = new File(["dummy"], "test.xlsx", {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		});
		fireEvent.change(fileInput, { target: { files: [dummyFile] } });

		const uploadBtn = screen.getByRole("button", { name: /آپلود/ });
		await waitFor(() => {
			expect(uploadBtn).toBeEnabled();
		});

		fireEvent.click(uploadBtn);

		await waitFor(() => {
			expect(window.$message?.error).toHaveBeenCalledWith("خطای تستی در آپلود");
		});
	});

	it("5. calls onClose and resets internal state when modal close button is clicked", async () => {
		const onClose = vi.fn();
		render(
			<TrafficUpdateTemplateModal
				open={true}
				serviceId={30}
				companyTypeOptions={mockCompanyTypes}
				onClose={onClose}
			/>,
			{ wrapper: createWrapper() },
		);

		await screen.findByText("ویرایش تمپلیت عملکرد ترافیک");

		const selects = document.querySelectorAll(".traffic-update-template-period .ant-select-selector");

		await selectOption(selects[0], "اپراتور اول");

		await waitFor(() => {
			expect(performanceGapsQuery).toHaveBeenCalledWith(
				expect.objectContaining({
					companyType: "operator_a",
				}),
			);
		});

		// Click close button in modal header
		const closeBtn = document.querySelector(".ant-modal-close") as HTMLButtonElement;
		expect(closeBtn).toBeInTheDocument();
		fireEvent.click(closeBtn);

		expect(onClose).toHaveBeenCalledTimes(1);

		// Year select should be disabled again because resetState() set companyType to null
		await waitFor(() => {
			const reloadedSelects = document.querySelectorAll(".traffic-update-template-period .ant-select");
			expect(reloadedSelects[1].className).toContain("ant-select-disabled");
		});
	});
});
