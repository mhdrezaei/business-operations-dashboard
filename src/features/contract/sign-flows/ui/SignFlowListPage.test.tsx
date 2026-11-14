import type { SignFlowListItem } from "#src/features/contract/api/contracts.api";
import { fetchSignFlowsList } from "#src/features/contract/api/contracts.api";
import { renderWithProviders, screen, waitFor } from "#tests/test-utils";
import userEvent from "@testing-library/user-event";
import { message } from "antd";
import React from "react";
import { Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SignFlowListPage from "./SignFlowListPage";

// Capture props passed to BasicTable for deep assertion
let capturedTableProps: any = null;

vi.mock("#src/components", async (importOriginal) => {
	const actual = await importOriginal<typeof import("#src/components")>();
	return {
		...actual,
		BasicTable: (props: any) => {
			capturedTableProps = props;
			return (
				<div data-testid="basic-table">
					<div data-testid="filter-title">{props.filterTitle}</div>
					<div data-testid="filter-subtitle">{props.filterSubtitle}</div>
					<div data-testid="table-subtitle">{props.tableSubtitle}</div>
				</div>
			);
		},
	};
});

vi.mock("./components/SignFlowDetail", () => ({
	SignFlowDetail: ({ id, onBack }: { id: number, onBack?: () => void }) => (
		<div data-testid="sign-flow-detail">
			<h1>
				{`گردش امضا #${id}`}
			</h1>
			{onBack && (
				<button type="button" data-testid="back-to-list-btn" onClick={onBack}>
					بازگشت به لیست گردش‌های امضا
				</button>
			)}
		</div>
	),
}));

vi.mock("#src/features/contract/api/contracts.api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("#src/features/contract/api/contracts.api")>();
	return {
		...actual,
		fetchSignFlowsList: vi.fn(),
	};
});

vi.mock("#src/features/contract/create/queries/contract.queries", () => ({
	servicesQuery: () => ({
		queryKey: ["common", "services"],
		queryFn: () => ({
			results: [
				{ id: 1, name: "سرویس پیامک", code: "sms" },
				{ id: 2, name: "سرویس شاهکار", code: "shahkar" },
			],
		}),
	}),
}));

function LocationDisplay() {
	const location = useLocation();
	return <div data-testid="location-path">{location.pathname}</div>;
}

const mockListRow: SignFlowListItem = {
	id: 101,
	state: "in_progress",
	service: "sms",
	service_name: "سرویس پیامک",
	company_type: null,
	contract_id: 201,
	contract_number: "CTR-2026-101",
	company_name: "شرکت همراه",
	addendum_group_id: null,
	record_type: "contract",
	template_id: 1,
	template_name: "قالب استاندارد",
	rule_config_id: 1,
	current_step_order: 1,
	current_step_name: "بررسی اولیه",
	total_steps: 2,
	contract_start_date: "1405/01/01",
	contract_end_date: "1405/12/29",
	is_waiting_for_me: true,
	started_at: "2026-03-21T10:00:00Z",
	finished_at: null,
	cancel_reason: "",
	created_by: 10,
	created_by_username: "ali_rezaei",
	created_at: "2026-03-21T10:00:00Z",
};

describe("signFlowListPage - routing and master-detail states", () => {
	beforeEach(() => {
		capturedTableProps = null;
		vi.clearAllMocks();
	});

	it("renders BasicTable and hides SignFlowDetail when URL is /contracts/sign-flows (without id)", () => {
		renderWithProviders(
			<>
				<LocationDisplay />
				<Routes>
					<Route path="/contracts/sign-flows/:id?" element={<SignFlowListPage />} />
				</Routes>
			</>,
			{ initialEntries: ["/contracts/sign-flows"] },
		);

		// BasicTable must be rendered with proper titles
		expect(screen.getByTestId("basic-table")).toBeInTheDocument();
		expect(screen.getByTestId("filter-title")).toHaveTextContent("جستجوی گردش‌های امضا");
		expect(screen.getByTestId("filter-subtitle")).toHaveTextContent("برای جستجو و فیلتر گردش‌های امضای قرارداد، مقادیر زیر را انتخاب کنید.");
		expect(screen.getByTestId("table-subtitle")).toHaveTextContent("گردش‌های امضای ثبت شده را مشاهده و مدیریت کنید.");

		// SignFlowDetail must NOT be rendered
		expect(screen.queryByTestId("sign-flow-detail")).not.toBeInTheDocument();
	});

	it("renders SignFlowDetail and hides BasicTable when URL contains an id param (/contracts/sign-flows/123)", () => {
		renderWithProviders(
			<>
				<LocationDisplay />
				<Routes>
					<Route path="/contracts/sign-flows/:id?" element={<SignFlowListPage />} />
				</Routes>
			</>,
			{ initialEntries: ["/contracts/sign-flows/123"] },
		);

		// SignFlowDetail must be rendered with correct id
		expect(screen.getByTestId("sign-flow-detail")).toBeInTheDocument();
		expect(screen.getByText("گردش امضا #123")).toBeInTheDocument();

		// BasicTable must NOT be rendered
		expect(screen.queryByTestId("basic-table")).not.toBeInTheDocument();
	});

	it("falls back to BasicTable when id in URL is not a valid number (/contracts/sign-flows/invalid)", () => {
		renderWithProviders(
			<>
				<LocationDisplay />
				<Routes>
					<Route path="/contracts/sign-flows/:id?" element={<SignFlowListPage />} />
				</Routes>
			</>,
			{ initialEntries: ["/contracts/sign-flows/invalid"] },
		);

		expect(screen.getByTestId("basic-table")).toBeInTheDocument();
		expect(screen.queryByTestId("sign-flow-detail")).not.toBeInTheDocument();
	});
});

describe("signFlowListPage - filters, data loading and pagination", () => {
	beforeEach(() => {
		capturedTableProps = null;
		vi.clearAllMocks();
	});

	it("configures defaultPageSize to 15 in table pagination settings", () => {
		renderWithProviders(
			<Routes>
				<Route path="/contracts/sign-flows/:id?" element={<SignFlowListPage />} />
			</Routes>,
			{ initialEntries: ["/contracts/sign-flows"] },
		);

		expect(capturedTableProps).toBeDefined();
		expect(capturedTableProps.pagination).toEqual({
			defaultPageSize: 15,
		});
		expect(capturedTableProps.rowSelection).toBe(false);
	});

	it("passes filter parameters correctly to fetchSignFlowsList via table request function", async () => {
		vi.mocked(fetchSignFlowsList).mockResolvedValueOnce({
			count: 42,
			next: null,
			previous: null,
			results: [mockListRow],
		});

		renderWithProviders(
			<Routes>
				<Route path="/contracts/sign-flows/:id?" element={<SignFlowListPage />} />
			</Routes>,
			{ initialEntries: ["/contracts/sign-flows"] },
		);

		expect(capturedTableProps?.request).toBeTypeOf("function");

		// Execute request function with custom filters and pagination
		const result = await capturedTableProps.request({
			current: 2,
			pageSize: 30,
			mine: "assigned",
			state: "in_progress",
			service: "sms",
			record_type: "contract",
		});

		expect(fetchSignFlowsList).toHaveBeenCalledWith({
			page: 2,
			page_size: 30,
			mine: "assigned",
			state: "in_progress",
			service: "sms",
			record_type: "contract",
		});

		expect(result).toEqual({
			data: [mockListRow],
			success: true,
			total: 42,
		});
	});

	it("handles fetchSignFlowsList error by displaying message.error and returning empty data", async () => {
		const messageErrorSpy = vi.spyOn(message, "error").mockImplementation(() => ({} as any));
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		vi.mocked(fetchSignFlowsList).mockRejectedValueOnce(new Error("API failure"));

		renderWithProviders(
			<Routes>
				<Route path="/contracts/sign-flows/:id?" element={<SignFlowListPage />} />
			</Routes>,
			{ initialEntries: ["/contracts/sign-flows"] },
		);

		const result = await capturedTableProps.request({
			current: 1,
			pageSize: 15,
		});

		expect(messageErrorSpy).toHaveBeenCalledWith("خطا در دریافت لیست گردش‌های امضا");
		expect(result).toEqual({
			data: [],
			success: false,
			total: 0,
		});

		messageErrorSpy.mockRestore();
		consoleErrorSpy.mockRestore();
	});
});

describe("signFlowListPage - navigation interactions", () => {
	beforeEach(() => {
		capturedTableProps = null;
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("navigates to detail URL (/contracts/sign-flows/:id) when onView column callback is triggered", async () => {
		renderWithProviders(
			<>
				<LocationDisplay />
				<Routes>
					<Route path="/contracts/sign-flows/:id?" element={<SignFlowListPage />} />
				</Routes>
			</>,
			{ initialEntries: ["/contracts/sign-flows"] },
		);

		expect(screen.getByTestId("location-path")).toHaveTextContent("/contracts/sign-flows");

		// Find the action column from captured columns
		const actionColumn = capturedTableProps.columns.find((c: any) => c.dataIndex === "action");
		expect(actionColumn).toBeDefined();

		// Render the action button cell
		const ActionButton = () => actionColumn.render(null, mockListRow);
		const { unmount } = renderWithProviders(<ActionButton />);

		const eyeButton = screen.getByRole("button");
		await userEvent.click(eyeButton);

		// Router location should update to /contracts/sign-flows/101
		await waitFor(() => {
			expect(screen.getByTestId("location-path")).toHaveTextContent("/contracts/sign-flows/101");
		});

		unmount();
	});

	it("navigates back to list URL (/contracts/sign-flows) when onBack is triggered from SignFlowDetail", async () => {
		renderWithProviders(
			<>
				<LocationDisplay />
				<Routes>
					<Route path="/contracts/sign-flows/:id?" element={<SignFlowListPage />} />
				</Routes>
			</>,
			{ initialEntries: ["/contracts/sign-flows/123"] },
		);

		expect(screen.getByTestId("location-path")).toHaveTextContent("/contracts/sign-flows/123");

		const backBtn = screen.getByTestId("back-to-list-btn");
		await userEvent.click(backBtn);

		await waitFor(() => {
			expect(screen.getByTestId("location-path")).toHaveTextContent("/contracts/sign-flows");
		});
	});
});
