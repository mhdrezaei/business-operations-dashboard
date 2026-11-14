import type { UploadFile } from "antd";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { ContractDocumentsPanel } from "./ContractDocumentsPanel";

describe("contractDocumentsPanel", () => {
	const contractId = 123;

	const mockFiles: UploadFile[] = [
		{
			uid: "1",
			name: "contract-scan.pdf",
			size: 2048,
			type: "application/pdf",
			status: "done",
		},
		{
			uid: "2",
			name: "agreement.png",
			size: 512,
			type: "image/png",
			status: "done",
		},
	];

	it("renders loading spinner when loading is true", () => {
		const { container } = render(
			<ContractDocumentsPanel contractId={contractId} initialDocuments={[]} loading={true} />,
		);

		expect(container.querySelector(".ant-spin-spinning")).toBeInTheDocument();
	});

	it("renders empty state message when there are no documents", () => {
		render(
			<ContractDocumentsPanel contractId={contractId} initialDocuments={[]} loading={false} />,
		);

		expect(screen.getByText("فایلی پیوست نشده است")).toBeInTheDocument();
	});

	it("renders list of documents with filenames and formatted file sizes", () => {
		render(
			<ContractDocumentsPanel contractId={contractId} initialDocuments={mockFiles} loading={false} />,
		);

		expect(screen.getByText("contract-scan.pdf")).toBeInTheDocument();
		expect(screen.getByText("agreement.png")).toBeInTheDocument();

		// Formatted sizes
		expect(screen.getByText(/۲ KB/)).toBeInTheDocument();
		expect(screen.getByText(/۵۱۲ B/)).toBeInTheDocument();
	});

	it("hides upload button and delete action in readOnly mode", () => {
		const { container } = render(
			<ContractDocumentsPanel
				contractId={contractId}
				initialDocuments={mockFiles}
				loading={false}
				readOnly={true}
			/>,
		);

		// In readOnly mode, upload wrapper is hidden and disabled
		expect(container.querySelector(".ant-upload-wrapper.hidden")).toBeInTheDocument();
		// Delete buttons have hidden class in readOnly mode
		const deleteBtns = container.querySelectorAll("button.hidden");
		expect(deleteBtns.length).toBe(mockFiles.length);
		// Download and preview buttons should still be visible
		expect(container.querySelector(".anticon-download")).toBeInTheDocument();
		expect(container.querySelector(".anticon-eye")).toBeInTheDocument();
	});

	it("shows upload section and delete action when readOnly is false", () => {
		const { container } = render(
			<ContractDocumentsPanel
				contractId={contractId}
				initialDocuments={mockFiles}
				loading={false}
				readOnly={false}
			/>,
		);

		expect(container.querySelector(".ant-upload")).toBeInTheDocument();
		expect(container.querySelector(".anticon-delete")).toBeInTheDocument();
	});
});
