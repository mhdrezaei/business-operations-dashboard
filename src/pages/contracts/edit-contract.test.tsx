import { useAccess } from "#src/hooks";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import React from "react";
import { MemoryRouter, useNavigate, useSearchParams } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditContractFormPage from "./edit-contract";
import "#src/locales";

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

vi.mock("#src/features/contract/list/ui/components/ContractEditSelector", () => ({
	ContractEditSelector: ({ onContractSelect }: any) => (
		<div data-testid="contract-edit-selector">
			<span>انتخابگر قرارداد</span>
			<button
				type="button"
				data-testid="select-contract-btn"
				onClick={() => onContractSelect(55, 3, "vendor", "sms/vendor")}
			>
				انتخاب قرارداد تست
			</button>
		</div>
	),
}));

vi.mock("#src/features/contract/list/ui/components/ContractDetailModal", () => ({
	ContractEditForm: ({ contractId, onContractSelect, onDeleted, readOnly, service }: any) => (
		<div
			data-testid="contract-edit-form"
			data-contract-id={contractId}
			data-service={service}
			data-readonly={readOnly ? "true" : "false"}
		>
			<span>
				فرم ویرایش قرارداد
				{contractId}
				(
				{service}
				)
			</span>
			<span data-testid="readonly-badge">{readOnly ? "حالت فقط‌خواندنی" : "حالت ویرایش"}</span>
			<button
				type="button"
				data-testid="switch-contract-btn"
				onClick={() => onContractSelect(88, 4, null, "traffic")}
			>
				تغییر قرارداد به 88
			</button>
			<button
				type="button"
				data-testid="delete-contract-btn"
				onClick={onDeleted}
			>
				حذف قرارداد
			</button>
		</div>
	),
}));

describe("editContractFormPage", () => {
	const mockNavigate = vi.fn();
	const mockHasDomainPermissionByServiceId = vi.fn();
	let setSearchParamsRef: any;

	function SearchParamListener() {
		const [, setSearchParams] = useSearchParams();
		setSearchParamsRef = setSearchParams;
		return null;
	}

	function renderComponent(initialUrl: string = "/contracts/edit") {
		return render(
			<MemoryRouter initialEntries={[initialUrl]}>
				<ConfigProvider>
					<SearchParamListener />
					<EditContractFormPage />
				</ConfigProvider>
			</MemoryRouter>,
		);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		mockNavigate.mockReset();
		mockHasDomainPermissionByServiceId.mockReset();

		vi.mocked(useNavigate).mockReturnValue(mockNavigate);
		vi.mocked(useAccess).mockReturnValue({
			hasDomainPermissionByServiceId: mockHasDomainPermissionByServiceId,
		} as any);

		// Default: user has update permission
		mockHasDomainPermissionByServiceId.mockReturnValue(true);
	});

	describe("url parameters parsing", () => {
		it("renders ContractEditSelector when URL search parameters are empty", () => {
			renderComponent("/contracts/edit");

			expect(screen.getByTestId("contract-edit-selector")).toBeInTheDocument();
			expect(screen.queryByTestId("contract-edit-form")).not.toBeInTheDocument();
		});

		it("renders ContractEditSelector when contractId is missing", () => {
			renderComponent("/contracts/edit?service=openapi&serviceId=1");
			expect(screen.getByTestId("contract-edit-selector")).toBeInTheDocument();
		});

		it("renders ContractEditSelector when serviceId is missing", () => {
			renderComponent("/contracts/edit?contractId=10&service=openapi");
			expect(screen.getByTestId("contract-edit-selector")).toBeInTheDocument();
		});

		it("renders ContractEditSelector when contractId or serviceId is not a positive integer", () => {
			renderComponent("/contracts/edit?contractId=-1&serviceId=0&service=openapi");
			expect(screen.getByTestId("contract-edit-selector")).toBeInTheDocument();
		});

		it("renders ContractEditSelector when contractId or serviceId is not a number", () => {
			renderComponent("/contracts/edit?contractId=abc&serviceId=xyz&service=openapi");
			expect(screen.getByTestId("contract-edit-selector")).toBeInTheDocument();
		});

		it("renders ContractEditSelector when service is missing", () => {
			renderComponent("/contracts/edit?contractId=10&serviceId=1");
			expect(screen.getByTestId("contract-edit-selector")).toBeInTheDocument();
		});

		it("renders ContractEditSelector when service is not supported in CONTRACT_SERVICE_PATHS", () => {
			renderComponent("/contracts/edit?contractId=10&serviceId=1&service=unknown-service");
			expect(screen.getByTestId("contract-edit-selector")).toBeInTheDocument();
		});

		it("enters contract form mode when contractId, serviceId, and service are valid", () => {
			renderComponent("/contracts/edit?contractId=10&serviceId=1&service=openapi");

			expect(screen.queryByTestId("contract-edit-selector")).not.toBeInTheDocument();
			const form = screen.getByTestId("contract-edit-form");
			expect(form).toBeInTheDocument();
			expect(form).toHaveAttribute("data-contract-id", "10");
			expect(form).toHaveAttribute("data-service", "openapi");
		});
	});

	describe("access control and permissions", () => {
		it("shows 403 Result and navigate button when user has neither update nor approval permissions", async () => {
			const user = userEvent.setup();
			mockHasDomainPermissionByServiceId.mockReturnValue(false);

			renderComponent("/contracts/edit?contractId=10&serviceId=1&service=openapi");

			expect(screen.queryByTestId("contract-edit-form")).not.toBeInTheDocument();
			expect(screen.getByText("دسترسی ویرایش این قرارداد را ندارید")).toBeInTheDocument();

			const backBtn = screen.getByRole("button", { name: "بازگشت به لیست قراردادها" });
			expect(backBtn).toBeInTheDocument();

			await user.click(backBtn);
			expect(mockNavigate).toHaveBeenCalledWith("/contracts/list");
		});

		it("renders ContractEditForm with readOnly={true} when user only has business_approve permission", () => {
			mockHasDomainPermissionByServiceId.mockImplementation((_domain, action) => {
				if (action === "update") {
					return false;
				}
				if (action === "business_approve") {
					return true;
				}
				return false;
			});

			renderComponent("/contracts/edit?contractId=10&serviceId=1&service=openapi");

			const form = screen.getByTestId("contract-edit-form");
			expect(form).toBeInTheDocument();
			expect(form).toHaveAttribute("data-readonly", "true");
			expect(screen.getByTestId("readonly-badge")).toHaveTextContent("حالت فقط‌خواندنی");
		});

		it("renders ContractEditForm with readOnly={true} when user only has sign permission", () => {
			mockHasDomainPermissionByServiceId.mockImplementation((_domain, action) => {
				if (action === "update") {
					return false;
				}
				if (action === "business_approve") {
					return false;
				}
				if (action === "sign") {
					return true;
				}
				return false;
			});

			renderComponent("/contracts/edit?contractId=10&serviceId=1&service=openapi");

			const form = screen.getByTestId("contract-edit-form");
			expect(form).toBeInTheDocument();
			expect(form).toHaveAttribute("data-readonly", "true");
			expect(screen.getByTestId("readonly-badge")).toHaveTextContent("حالت فقط‌خواندنی");
		});

		it("renders ContractEditForm with readOnly={false} when user has update permission", () => {
			mockHasDomainPermissionByServiceId.mockImplementation((_domain, action) => {
				return action === "update";
			});

			renderComponent("/contracts/edit?contractId=10&serviceId=1&service=openapi");

			const form = screen.getByTestId("contract-edit-form");
			expect(form).toBeInTheDocument();
			expect(form).toHaveAttribute("data-readonly", "false");
			expect(screen.getByTestId("readonly-badge")).toHaveTextContent("حالت ویرایش");
		});

		it("passes VENDOR access company type when service is sms/vendor", () => {
			renderComponent("/contracts/edit?contractId=15&serviceId=2&service=sms/vendor");

			expect(mockHasDomainPermissionByServiceId).toHaveBeenCalledWith(
				"contracts",
				"update",
				2,
				"VENDOR",
			);
		});

		it("passes query companyType to permission check for other services", () => {
			renderComponent("/contracts/edit?contractId=20&serviceId=3&service=traffic&companyType=FCP");

			expect(mockHasDomainPermissionByServiceId).toHaveBeenCalledWith(
				"contracts",
				"update",
				3,
				"FCP",
			);
		});
	});

	describe("interactivity and navigation", () => {
		it("updates contract selection when onContractSelect is triggered from selector", async () => {
			const user = userEvent.setup();
			renderComponent("/contracts/edit");

			expect(screen.getByTestId("contract-edit-selector")).toBeInTheDocument();

			const selectBtn = screen.getByTestId("select-contract-btn");
			await user.click(selectBtn);

			expect(screen.queryByTestId("contract-edit-selector")).not.toBeInTheDocument();
			const form = screen.getByTestId("contract-edit-form");
			expect(form).toBeInTheDocument();
			expect(form).toHaveAttribute("data-contract-id", "55");
			expect(form).toHaveAttribute("data-service", "sms/vendor");
		});

		it("updates contract selection when onContractSelect is triggered from ContractEditForm", async () => {
			const user = userEvent.setup();
			renderComponent("/contracts/edit?contractId=10&serviceId=1&service=openapi");

			const formBefore = screen.getByTestId("contract-edit-form");
			expect(formBefore).toHaveAttribute("data-contract-id", "10");

			const switchBtn = screen.getByTestId("switch-contract-btn");
			await user.click(switchBtn);

			const formAfter = screen.getByTestId("contract-edit-form");
			expect(formAfter).toHaveAttribute("data-contract-id", "88");
			expect(formAfter).toHaveAttribute("data-service", "traffic");
		});

		it("updates contract selection when URL search params change dynamically (tab reuse)", () => {
			renderComponent("/contracts/edit?contractId=10&serviceId=1&service=openapi");

			expect(screen.getByTestId("contract-edit-form")).toHaveAttribute("data-contract-id", "10");

			act(() => {
				setSearchParamsRef({
					contractId: "77",
					service: "telecom-frame",
					serviceId: "5",
				});
			});

			const form = screen.getByTestId("contract-edit-form");
			expect(form).toHaveAttribute("data-contract-id", "77");
			expect(form).toHaveAttribute("data-service", "telecom-frame");
		});

		it("navigates to /contracts/edit with replace=true when onDeleted is called", async () => {
			const user = userEvent.setup();
			renderComponent("/contracts/edit?contractId=10&serviceId=1&service=openapi");

			const deleteBtn = screen.getByTestId("delete-contract-btn");
			await user.click(deleteBtn);

			expect(mockNavigate).toHaveBeenCalledWith("/contracts/edit", { replace: true });
		});
	});
});
