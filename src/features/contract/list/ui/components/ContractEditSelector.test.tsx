import type { ContractFormSelectionContext } from "../../../shared/ui/form/ContractForm";
import { act, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultContractFormValues } from "../../../shared/ui/form/ContractForm";
import { ContractEditSelector } from "./ContractEditSelector";

let capturedContractFormProps: any = null;
let capturedScopedPanelProps: any = null;

vi.mock("../../../shared/ui/form/ContractForm", () => ({
	defaultContractFormValues: {
		companyId: null,
		counterpartyType: null,
		endMonth: null,
		endYear: null,
		serviceCode: null,
		serviceId: null,
		startMonth: null,
		startYear: null,
	},
	ContractForm: (props: any) => {
		capturedContractFormProps = props;
		return <div data-testid="mock-contract-form" />;
	},
}));

vi.mock("../../../shared/ui/ScopedCompanyContractsPanel", () => ({
	ScopedCompanyContractsPanel: (props: any) => {
		capturedScopedPanelProps = props;
		return <div data-testid="mock-scoped-panel" />;
	},
}));

describe("contractEditSelector", () => {
	const mockOnContractSelect = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		capturedContractFormProps = null;
		capturedScopedPanelProps = null;
	});

	describe("initial render", () => {
		it("renders ContractForm with awaitingContractSelection mode and documents hidden", () => {
			render(<ContractEditSelector onContractSelect={mockOnContractSelect} />);

			expect(screen.getByTestId("mock-contract-form")).toBeInTheDocument();
			expect(capturedContractFormProps).toMatchObject({
				mode: "edit",
				awaitingContractSelection: true,
				showDocuments: false,
				initialValues: defaultContractFormValues,
			});
			expect(typeof capturedContractFormProps.onSelectionContextChange).toBe("function");
		});

		it("renders ScopedCompanyContractsPanel with initial empty scope and currentContractId 0", () => {
			render(<ContractEditSelector onContractSelect={mockOnContractSelect} />);

			expect(screen.getByTestId("mock-scoped-panel")).toBeInTheDocument();
			expect(capturedScopedPanelProps.currentContractId).toBe(0);
			expect(capturedScopedPanelProps.service).toBeUndefined();
			expect(capturedScopedPanelProps.serviceId).toBeUndefined();
			expect(capturedScopedPanelProps.companyId).toBeUndefined();
			expect(capturedScopedPanelProps.companyType).toBeUndefined();
			expect(capturedScopedPanelProps.costContext).toBeUndefined();
			expect(typeof capturedScopedPanelProps.onSelect).toBe("function");
		});
	});

	describe("scope updates via onSelectionContextChange", () => {
		it("updates scope and passes new values to ScopedCompanyContractsPanel for plain service", () => {
			render(<ContractEditSelector onContractSelect={mockOnContractSelect} />);

			const context: ContractFormSelectionContext = {
				serviceCode: "openapi",
				serviceId: 10,
				companyId: 101,
				companyType: "PRIVATE",
				counterpartyType: "client",
			};

			act(() => {
				capturedContractFormProps.onSelectionContextChange(context);
			});

			expect(capturedScopedPanelProps).toMatchObject({
				service: "openapi",
				serviceId: 10,
				companyId: 101,
				companyType: "PRIVATE",
				costContext: false,
			});
		});

		it("updates scope correctly for sms/vendor service and counterparty", () => {
			render(<ContractEditSelector onContractSelect={mockOnContractSelect} />);

			const context: ContractFormSelectionContext = {
				serviceCode: "sms",
				serviceId: 20,
				companyId: 202,
				companyType: null,
				counterpartyType: "gov_ops",
			};

			act(() => {
				capturedContractFormProps.onSelectionContextChange(context);
			});

			expect(capturedScopedPanelProps.service).toBe("sms/vendor");
			expect(capturedScopedPanelProps.serviceId).toBe(20);
			expect(capturedScopedPanelProps.companyId).toBe(202);
		});

		it("identifies collocation cost context and passes costContext=true to ScopedCompanyContractsPanel", () => {
			render(<ContractEditSelector onContractSelect={mockOnContractSelect} />);

			const context: ContractFormSelectionContext = {
				serviceCode: "traffic",
				serviceId: 30,
				companyId: 303,
				companyType: "COLLOCATION",
				counterpartyType: "gov_ops",
			};

			act(() => {
				capturedContractFormProps.onSelectionContextChange(context);
			});

			expect(capturedScopedPanelProps.service).toBe("traffic");
			expect(capturedScopedPanelProps.costContext).toBe(true);
		});
	});

	describe("contract selection from side panel", () => {
		it("calls onContractSelect with contractId, service_id, companyType, and service when contract has service_id", () => {
			render(<ContractEditSelector onContractSelect={mockOnContractSelect} />);

			act(() => {
				capturedContractFormProps.onSelectionContextChange({
					serviceCode: "openapi",
					serviceId: 10,
					companyId: 101,
					companyType: "PRIVATE",
					counterpartyType: "client",
				});
			});

			act(() => {
				capturedScopedPanelProps.onSelect({
					id: 55,
					service_id: 10,
				});
			});

			expect(mockOnContractSelect).toHaveBeenCalledTimes(1);
			expect(mockOnContractSelect).toHaveBeenCalledWith(55, 10, "PRIVATE", "openapi");
		});

		it("uses contract.service as fallback when service_id is not present", () => {
			render(<ContractEditSelector onContractSelect={mockOnContractSelect} />);

			act(() => {
				capturedContractFormProps.onSelectionContextChange({
					serviceCode: "openapi",
					serviceId: 10,
					companyId: 101,
					companyType: "PRIVATE",
					counterpartyType: "client",
				});
			});

			act(() => {
				capturedScopedPanelProps.onSelect({
					id: 77,
					service: 10,
				});
			});

			expect(mockOnContractSelect).toHaveBeenCalledTimes(1);
			expect(mockOnContractSelect).toHaveBeenCalledWith(77, 10, "PRIVATE", "openapi");
		});

		it("uses scope.serviceId as fallback when neither service_id nor service is present on contract", () => {
			render(<ContractEditSelector onContractSelect={mockOnContractSelect} />);

			act(() => {
				capturedContractFormProps.onSelectionContextChange({
					serviceCode: "traffic",
					serviceId: 15,
					companyId: 105,
					companyType: "FCP",
					counterpartyType: "client",
				});
			});

			act(() => {
				capturedScopedPanelProps.onSelect({
					id: 88,
				});
			});

			expect(mockOnContractSelect).toHaveBeenCalledTimes(1);
			expect(mockOnContractSelect).toHaveBeenCalledWith(88, 15, "FCP", "traffic");
		});

		it("does not call onContractSelect if service is not yet resolved in scope", () => {
			render(<ContractEditSelector onContractSelect={mockOnContractSelect} />);

			act(() => {
				capturedScopedPanelProps.onSelect({
					id: 99,
					service_id: 10,
				});
			});

			expect(mockOnContractSelect).not.toHaveBeenCalled();
		});

		it("does not call onContractSelect if resolved serviceId is not a positive integer", () => {
			render(<ContractEditSelector onContractSelect={mockOnContractSelect} />);

			act(() => {
				capturedContractFormProps.onSelectionContextChange({
					serviceCode: "openapi",
					serviceId: 10,
					companyId: 101,
					companyType: "PRIVATE",
					counterpartyType: "client",
				});
			});

			act(() => {
				capturedScopedPanelProps.onSelect({
					id: 99,
					service_id: 0,
				});
			});

			expect(mockOnContractSelect).not.toHaveBeenCalled();

			act(() => {
				capturedScopedPanelProps.onSelect({
					id: 99,
					service_id: -5,
				});
			});

			expect(mockOnContractSelect).not.toHaveBeenCalled();
		});
	});
});
