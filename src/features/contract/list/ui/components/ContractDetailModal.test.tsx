import type { ReactNode } from "react";
import type { ContractServicePath } from "../../../api/contracts.api";
import { listContractDocuments } from "#src/features/contract/api/contract-documents.api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App, ConfigProvider, theme } from "antd";
import React from "react";
import { ThemeProvider } from "react-jss";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchContractApprovalHistory, fetchContractDetail, fetchDeleteContract, fetchUpdateContract } from "../../../api/contracts.api";
import { ContractEditForm } from "./ContractDetailModal";
import "#src/locales";

vi.mock("#src/features/contract/api/contract-documents.api", () => ({
	listContractDocuments: vi.fn(),
}));

vi.mock("../../../api/contracts.api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../../api/contracts.api")>();
	return {
		...actual,
		fetchContractApprovalHistory: vi.fn(),
		fetchContractDetail: vi.fn(),
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

let capturedContractFormProps: any = null;

// Mock ContractForm
vi.mock("#src/features/contract/shared/ui/form/ContractForm", () => ({
	ContractForm: (props: any) => {
		capturedContractFormProps = props;
		return (
			<div
				data-testid="contract-form"
				data-submit-disabled={props.submitDisabled ? "true" : "false"}
				data-submit-reason={props.submitDisabledReason || ""}
			>
				<span>فرم ویرایش قرارداد</span>
				<button
					type="button"
					data-testid="form-submit-btn"
					disabled={props.submitDisabled}
					title={props.submitDisabledReason}
					onClick={() => props.onSubmit?.(props.initialValues)}
				>
					{props.submitText}
				</button>
				{props.secondaryActions && (
					<div data-testid="form-secondary-actions">
						{props.secondaryActions}
					</div>
				)}
			</div>
		);
	},
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
					<App>
						<JssThemeBridge>
							<QueryClientProvider client={queryClient}>
								{children}
							</QueryClientProvider>
						</JssThemeBridge>
					</App>
				</ConfigProvider>
			);
		};
	};

	beforeEach(() => {
		capturedContractFormProps = null;
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

		vi.mocked(listContractDocuments).mockResolvedValue({ count: 0, results: [] } as any);
		vi.mocked(fetchContractApprovalHistory).mockResolvedValue({
			addenda: [],
			id: contractId,
			is_business_approved: false,
			is_signed: false,
			sign_approval_history: [],
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
				readOnly={true}
				readOnlyHeader={<div>هدر اختصاصی</div>}
				service={service}
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
				readOnly={false}
				service={service}
			/>,
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(screen.getByTestId("contract-form")).toBeInTheDocument();
		});
	});

	describe("successful edit submission", () => {
		it("submits updated form values, calls fetchUpdateContract with converted payload, and shows success message with server notices", async () => {
			const user = userEvent.setup();
			const onUpdated = vi.fn();
			vi.mocked(fetchContractDetail).mockResolvedValueOnce(mockDetail);
			vi.mocked(fetchUpdateContract).mockResolvedValueOnce({
				...mockDetail,
				notices: ["اطلاعیه سرور: قرارداد با موفقیت سینک شد"],
			} as any);

			render(
				<ContractEditForm
					contractId={contractId}
					onUpdated={onUpdated}
					service={service}
				/>,
				{ wrapper: createWrapper() },
			);

			await waitFor(() => {
				expect(screen.getByTestId("contract-form")).toBeInTheDocument();
			});

			const submitBtn = screen.getByTestId("form-submit-btn");
			expect(submitBtn).toHaveTextContent("ذخیره تغییرات");
			expect(submitBtn).not.toBeDisabled();

			await user.click(submitBtn);

			await waitFor(() => {
				expect(fetchUpdateContract).toHaveBeenCalledWith(
					"openapi",
					contractId,
					expect.any(Object),
				);
				expect(window.$message?.success).toHaveBeenCalledWith(
					expect.stringContaining("اطلاعیه سرور: قرارداد با موفقیت سینک شد"),
				);
				expect(onUpdated).toHaveBeenCalled();
			});
		}, 15000);
	});

	describe("real-signed contract locking", () => {
		it("disables save and delete buttons with tooltip reason when contract is real-signed", async () => {
			const realSignedDetail = {
				...mockDetail,
				real_signed_at: "2026-03-21T10:00:00Z",
			};
			vi.mocked(fetchContractDetail).mockResolvedValueOnce(realSignedDetail);

			render(
				<ContractEditForm contractId={contractId} service={service} />,
				{ wrapper: createWrapper() },
			);

			await waitFor(() => {
				expect(screen.getByTestId("contract-form")).toBeInTheDocument();
			});

			// Check submit button is disabled with lock reason
			expect(capturedContractFormProps.submitDisabled).toBe(true);
			expect(capturedContractFormProps.submitDisabledReason).toBe(
				"این قرارداد امضای رسمی شده و قابل ویرایش یا حذف نیست.",
			);

			const submitBtn = screen.getByTestId("form-submit-btn");
			expect(submitBtn).toBeDisabled();

			// Check delete button inside secondaryActions is disabled
			const deleteBtn = screen.getByRole("button", { name: "حذف قرارداد" });
			expect(deleteBtn).toBeDisabled();
		});
	});

	describe("delete flow from edit form", () => {
		it("shows confirmation popconfirm on delete click, calls fetchDeleteContract on confirm and invokes onDeleted", async () => {
			const user = userEvent.setup();
			const onDeleted = vi.fn();
			const onUpdated = vi.fn();
			vi.mocked(fetchContractDetail).mockResolvedValueOnce(mockDetail);
			vi.mocked(fetchDeleteContract).mockResolvedValueOnce(undefined as any);

			render(
				<ContractEditForm
					contractId={contractId}
					onDeleted={onDeleted}
					onUpdated={onUpdated}
					service={service}
				/>,
				{ wrapper: createWrapper() },
			);

			await waitFor(() => {
				expect(screen.getByTestId("contract-form")).toBeInTheDocument();
			});

			const deleteBtn = screen.getByRole("button", { name: "حذف قرارداد" });
			expect(deleteBtn).not.toBeDisabled();
			await user.click(deleteBtn);

			// Popconfirm opens with confirmation message
			await waitFor(() => {
				expect(screen.getByText("آیا از حذف این قرارداد مطمئن هستید؟ این عملیات غیرقابل بازگشت است.")).toBeInTheDocument();
			});

			const confirmBtn = screen.getByRole("button", { name: "تأیید" });
			await user.click(confirmBtn);

			await waitFor(() => {
				expect(fetchDeleteContract).toHaveBeenCalledWith("openapi", contractId);
				expect(window.$message?.success).toHaveBeenCalledWith("قرارداد با موفقیت حذف شد.");
				expect(onDeleted).toHaveBeenCalled();
				expect(onUpdated).toHaveBeenCalled();
			});
		}, 15000);
	});

	describe("sms service fallback mechanism", () => {
		it("automatically retries with fallback sms service when primary sms service detail fetch fails", async () => {
			vi.mocked(fetchContractDetail)
				.mockRejectedValueOnce(new Error("SMS Client not found"))
				.mockResolvedValueOnce({
					...mockDetail,
					service: { code: "sms", id: 1, name: "سرویس پیامک" },
				});

			render(
				<ContractEditForm contractId={contractId} service="sms/client" />,
				{ wrapper: createWrapper() },
			);

			await waitFor(() => {
				expect(screen.getByTestId("contract-form")).toBeInTheDocument();
			});

			expect(fetchContractDetail).toHaveBeenCalledTimes(2);
			expect(fetchContractDetail).toHaveBeenNthCalledWith(1, "sms/client", contractId);
			expect(fetchContractDetail).toHaveBeenNthCalledWith(2, "sms/vendor", contractId);
		});
	});
});
