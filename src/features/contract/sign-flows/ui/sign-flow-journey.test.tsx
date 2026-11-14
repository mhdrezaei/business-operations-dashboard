import type { SignFlowDetail as SignFlowDetailType, SignFlowListItem } from "#src/features/contract/api/contracts.api";
import { decideSignFlow, fetchSignFlowDetail, fetchSignFlowHistory, fetchSignFlowOfficialPdf, fetchSignFlowsList } from "#src/features/contract/api/contracts.api";
import { renderWithProviders, screen, waitFor } from "#tests/test-utils";
import userEvent from "@testing-library/user-event";
import { message } from "antd";
import React from "react";
import { Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignFlowListPage from "./SignFlowListPage";

// Logged-in user is the financial approver
const mockUser = { id: 10, username: "signer_user" };
const mockIsFullAdmin = false;

vi.mock("#src/store", () => ({
	useUserStore: vi.fn(() => mockUser),
}));

vi.mock("#src/hooks", () => ({
	useAccess: vi.fn(() => ({ isFullAdmin: mockIsFullAdmin })),
}));

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

vi.mock("#src/features/contract/api/contracts.api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("#src/features/contract/api/contracts.api")>();
	return {
		...actual,
		fetchSignFlowsList: vi.fn(),
		fetchSignFlowDetail: vi.fn(),
		fetchSignFlowHistory: vi.fn(),
		fetchSignFlowOfficialPdf: vi.fn(),
		decideSignFlow: vi.fn(),
		cancelSignFlow: vi.fn(),
		revokeSignFlow: vi.fn(),
	};
});

// High-fidelity BasicTable mock for E2E integration:
// Executes real columns and column renderers from getSignFlowColumns,
// triggers request callbacks on filter change, and wires the onView row navigation.
vi.mock("#src/components", async (importOriginal) => {
	const actual = await importOriginal<typeof import("#src/components")>();
	return {
		...actual,
		BasicTable: ({ columns, request, actionRef }: any) => {
			const [data, setData] = React.useState<any[]>([]);
			const [filterMine, setFilterMine] = React.useState("");

			const loadData = React.useCallback(async (mineVal: string) => {
				if (request) {
					const res = await request({ current: 1, pageSize: 15, mine: mineVal || undefined });
					setData(res.data || []);
				}
			}, [request]);

			React.useEffect(() => {
				loadData(filterMine);
			}, [filterMine, loadData]);

			if (actionRef) {
				actionRef.current = {
					reload: () => loadData(filterMine),
				};
			}

			// Extract 'mine' filter options from column definition
			const mineColumn = columns?.find((c: any) => c.dataIndex === "mine");
			const mineOptions = mineColumn?.fieldProps?.options || [];

			return (
				<div data-testid="sign-flows-table-view">
					<div data-testid="filter-bar" className="mb-4">
						<label htmlFor="filter-mine-select">فیلتر نمایش:</label>
						<select
							id="filter-mine-select"
							data-testid="filter-mine-select"
							value={filterMine}
							onChange={(e) => {
								const val = e.target.value;
								setFilterMine(val);
								mineColumn?.fieldProps?.onChange?.(val);
							}}
						>
							{mineOptions.map((opt: any) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>

					<table data-testid="sign-flows-table">
						<thead>
							<tr>
								{columns?.filter((c: any) => !c.hideInTable).map((c: any) => (
									<th key={c.dataIndex || c.title}>{c.title}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{data.map(record => (
								<tr key={record.id} data-testid={`table-row-${record.id}`}>
									{columns?.filter((c: any) => !c.hideInTable).map((col: any) => (
										<td key={col.dataIndex || col.title} data-testid={`cell-${col.dataIndex || "action"}-${record.id}`}>
											{col.render ? col.render(record[col.dataIndex], record) : record[col.dataIndex]}
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

function AppRouter() {
	return (
		<Routes>
			<Route path="/contracts/sign-flows" element={<SignFlowListPage />} />
			<Route path="/contracts/sign-flows/:id" element={<SignFlowListPage />} />
		</Routes>
	);
}

describe("sign-flow end-to-end user journey", () => {
	let currentListItem: SignFlowListItem;
	let currentDetail: SignFlowDetailType;
	let mockTab: { close: () => void, location: { href: string } };

	beforeEach(() => {
		vi.clearAllMocks();

		mockTab = {
			location: { href: "" },
			close: vi.fn(),
		};
		vi.spyOn(window, "open").mockReturnValue(mockTab as any);

		if (!window.URL.createObjectURL) {
			window.URL.createObjectURL = vi.fn();
		}

		// Initial list item (Step 2 active)
		currentListItem = {
			id: 555,
			contract_id: 888,
			contract_number: "CTR-2026-888",
			company_name: "شرکت سپهر",
			company_type: null,
			service: "sms",
			service_name: "سرویس پیامک",
			addendum_group_id: null,
			record_type: "contract",
			template_id: 1,
			template_name: "قالب عمومی",
			rule_config_id: 1,
			state: "in_progress",
			current_step_order: 2,
			current_step_name: "مرحله مالی",
			total_steps: 4,
			is_waiting_for_me: true,
			started_at: "2026-03-21T10:00:00Z",
			finished_at: null,
			cancel_reason: "",
			created_by: 20,
			created_by_username: "creator_user",
			created_at: "2026-03-21T10:00:00Z",
		};

		// Initial full detail (Step 2 active, assigned to mockUser signer_user)
		currentDetail = {
			...currentListItem,
			contract_start_date: "1405/01/01",
			contract_end_date: "1405/12/29",
			steps: [
				{
					order: 1,
					name: "بررسی حقوقی",
					state: "approved",
					activated_at: "2026-03-21T10:00:00Z",
					decided_at: "2026-03-21T11:00:00Z",
					recipients: [{ target_type: "user", user_id: 1, username: "legal_user", role_id: null, role_name: null }],
					assignments: [],
					decision: { action: "approve", comment: "بررسی و تایید شد توسط حقوقی", decided_by_username: "legal_user", decided_at: "2026-03-21T11:00:00Z" } as any,
				},
				{
					order: 2,
					name: "مرحله مالی",
					state: "active",
					activated_at: "2026-03-21T11:00:00Z",
					decided_at: null,
					recipients: [{ target_type: "user", user_id: 10, username: "signer_user", role_id: null, role_name: null }],
					assignments: [],
					decision: null,
				},
				{
					order: 3,
					name: "بررسی فنی",
					state: "pending",
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

		// Mock API endpoints to simulate backend state updates
		vi.mocked(fetchSignFlowsList).mockImplementation(async (params) => {
			if (params?.mine === "assigned") {
				return {
					results: [currentListItem],
					count: 1,
				};
			}
			return {
				results: [currentListItem],
				count: 1,
			};
		});

		vi.mocked(fetchSignFlowDetail).mockImplementation(async () => currentDetail);
		vi.mocked(fetchSignFlowHistory).mockResolvedValue([]);

		vi.mocked(fetchSignFlowOfficialPdf).mockResolvedValue({
			headers: {
				get: (header: string) => header.toLowerCase() === "content-type" ? "application/json" : null,
			},
			json: async () => ({ url: "https://storage.example.com/contracts/CTR-2026-888-official.pdf" }),
		} as any);

		vi.mocked(decideSignFlow).mockImplementation(async (flowId, payload) => {
			if (payload.action === "approve") {
				// Advance step from 2 to 3
				currentListItem = {
					...currentListItem,
					current_step_order: 3,
					current_step_name: "بررسی فنی",
					is_waiting_for_me: false,
				};

				currentDetail = {
					...currentDetail,
					current_step_order: 3,
					current_step_name: "بررسی فنی",
					is_waiting_for_me: false,
					steps: [
						currentDetail.steps[0],
						{
							...currentDetail.steps[1],
							state: "approved",
							decided_at: "2026-03-21T12:00:00Z",
							decision: {
								action: "approve",
								comment: payload.comment || "بررسی و تایید شد",
								decided_by_username: "signer_user",
								decided_at: "2026-03-21T12:00:00Z",
							} as any,
						},
						{
							...currentDetail.steps[2],
							state: "active",
							activated_at: "2026-03-21T12:00:00Z",
						},
						currentDetail.steps[3],
					],
				};
			}
			return currentDetail;
		});
	});

	it("completes full signer user journey: filter assigned flows -> open detail -> view PDF -> approve step -> advance diagram and table", async () => {
		const messageSuccessSpy = vi.spyOn(message, "success").mockImplementation(() => ({} as any));

		// 1. ورود کاربر امضاکننده به صفحه گردش‌ها (/contracts/sign-flows)
		renderWithProviders(<AppRouter />, { initialEntries: ["/contracts/sign-flows"] });

		// Verify table rendered
		expect(await screen.findByTestId("sign-flows-table-view")).toBeInTheDocument();

		// 2. انتخاب فیلتر «ارجاع شده به من» (mine = "assigned")
		const mineSelect = screen.getByTestId("filter-mine-select");
		await userEvent.selectOptions(mineSelect, "assigned");

		await waitFor(() => {
			expect(fetchSignFlowsList).toHaveBeenCalledWith(
				expect.objectContaining({ mine: "assigned" }),
			);
		});

		// Check row rendered in table with current step: "مرحله مالی (2/4)"
		const contractRow = await screen.findByTestId("table-row-555");
		expect(contractRow).toBeInTheDocument();
		expect(screen.getByText("CTR-2026-888")).toBeInTheDocument();
		expect(screen.getByText("شرکت سپهر")).toBeInTheDocument();
		expect(screen.getByText("مرحله مالی (2/4)")).toBeInTheDocument();
		expect(screen.getByText("در حال بررسی")).toBeInTheDocument();

		// 3. کلیک روی گردش جاری (آیکون مشاهده در ستون عملیات)
		const actionCell = screen.getByTestId("cell-action-555");
		const viewEyeBtn = actionCell.querySelector("button")!;
		expect(viewEyeBtn).toBeDefined();
		await userEvent.click(viewEyeBtn);

		// Navigates to /contracts/sign-flows/555 and mounts SignFlowDetail
		expect(await screen.findByRole("heading", { name: /گردش امضا #\s*555/ })).toBeInTheDocument();
		expect(screen.queryByTestId("sign-flows-table-view")).not.toBeInTheDocument();

		// مشاهده متادیتای قرارداد
		expect(screen.getByText("CTR-2026-888")).toBeInTheDocument();
		expect(screen.getByText("شرکت سپهر")).toBeInTheDocument();
		expect(screen.getByText("سرویس پیامک")).toBeInTheDocument();
		expect(screen.getByText(/از 1405\/01\/01\s*تا 1405\/12\/29/)).toBeInTheDocument();

		// بررسی وضعیت اولیه نمودار گام‌ها:
		// گام ۱ (بررسی حقوقی): finish
		// گام ۲ (مرحله مالی): process (گام فعال کاربر فعلی)
		// گام ۳ (بررسی فنی): wait
		// گام ۴ (امضای نهایی): wait
		const stepNodesBefore = document.querySelectorAll(".ant-steps-item");
		expect(stepNodesBefore.length).toBe(4);
		expect(stepNodesBefore[0]).toHaveClass("ant-steps-item-finish");
		expect(stepNodesBefore[1]).toHaveClass("ant-steps-item-process");
		expect(stepNodesBefore[2]).toHaveClass("ant-steps-item-wait");
		expect(stepNodesBefore[3]).toHaveClass("ant-steps-item-wait");

		// مشاهده PDF رسمی
		const viewPdfBtn = screen.getByRole("button", { name: /مشاهده PDF رسمی/ });
		await userEvent.click(viewPdfBtn);

		await waitFor(() => {
			expect(fetchSignFlowOfficialPdf).toHaveBeenCalledWith(555);
			expect(mockTab.location.href).toBe("https://storage.example.com/contracts/CTR-2026-888-official.pdf");
		});

		// 4. زدن دکمه تایید، درج توضیحات و ثبت نهایی
		const approveBtn = screen.getByRole("button", { name: /تایید$/ });
		await userEvent.click(approveBtn);

		// Modal opens
		expect(screen.getByText("تایید مرحله گردش امضا")).toBeInTheDocument();
		const commentTextarea = screen.getByPlaceholderText("توضیحات تایید را وارد کنید...");
		expect(commentTextarea).toHaveValue("بررسی و تایید شد");

		// User enters custom comment
		await userEvent.clear(commentTextarea);
		await userEvent.type(commentTextarea, "بررسی شد و صورت‌های مالی تایید است");

		// Submit approval
		const confirmBtn = screen.getByRole("button", { name: "تایید کن" });
		await userEvent.click(confirmBtn);

		await waitFor(() => {
			expect(decideSignFlow).toHaveBeenCalledWith(555, {
				action: "approve",
				comment: "بررسی شد و صورت‌های مالی تایید است",
			});
		});

		expect(messageSuccessSpy).toHaveBeenCalledWith("مرحله با موفقیت تایید شد");

		// 5. اطمینان از پیشروی مرحله گردش امضا به گام بعدی در نمودار گام‌ها
		// گام ۲ (مرحله مالی) باید به finish تغییر کند و گام ۳ (بررسی فنی) به process تبدیل شود
		await waitFor(() => {
			const stepNodesAfter = document.querySelectorAll(".ant-steps-item");
			expect(stepNodesAfter[1]).toHaveClass("ant-steps-item-finish");
			expect(stepNodesAfter[2]).toHaveClass("ant-steps-item-process");
		});

		// 6. اطمینان از پیشروی مرحله گردش امضا در جدول پس از بازگشت
		// کاربر روی دکمه بازگشت کلیک می‌کند
		const backBtn = screen.getByRole("button", { name: /بازگشت به لیست گردش\u200Cهای امضا/ });
		await userEvent.click(backBtn);

		// بازگشت به آدرس /contracts/sign-flows و رندر مجدد جدول
		expect(await screen.findByTestId("sign-flows-table-view")).toBeInTheDocument();
		expect(screen.queryByRole("heading", { name: /گردش امضا #\s*555/ })).not.toBeInTheDocument();

		// بررسی این که در جدول مرحله فعلی به "بررسی فنی (3/4)" ارتقا یافته است
		await waitFor(() => {
			expect(screen.getByText("بررسی فنی (3/4)")).toBeInTheDocument();
		});

		messageSuccessSpy.mockRestore();
	}, 25000);
});
