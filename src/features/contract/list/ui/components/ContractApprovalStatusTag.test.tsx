import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { ContractApprovalStatusTag } from "./ContractApprovalStatusTag";

describe("contractApprovalStatusTag", () => {
	it("renders success tag when value is true", () => {
		const { container } = render(<ContractApprovalStatusTag value={true} />);

		const tag = container.querySelector(".ant-tag");
		expect(tag).toBeInTheDocument();
		expect(tag).toHaveClass("ant-tag-success");
		expect(tag).toHaveTextContent("تأیید شده");
	});

	it("renders error tag with default label when value is false", () => {
		const { container } = render(<ContractApprovalStatusTag value={false} />);

		const tag = container.querySelector(".ant-tag");
		expect(tag).toBeInTheDocument();
		expect(tag).toHaveClass("ant-tag-error");
		expect(tag).toHaveTextContent("رد شده");
	});

	it("renders error tag with custom rejectedLabel when provided", () => {
		const { container } = render(
			<ContractApprovalStatusTag value={false} rejectedLabel="عدم تأیید" />,
		);

		const tag = container.querySelector(".ant-tag");
		expect(tag).toBeInTheDocument();
		expect(tag).toHaveClass("ant-tag-error");
		expect(tag).toHaveTextContent("عدم تأیید");
	});

	it("renders default tag with default label when value is null or undefined", () => {
		const { container: containerNull } = render(<ContractApprovalStatusTag value={null} />);
		const tagNull = containerNull.querySelector(".ant-tag");

		expect(tagNull).toBeInTheDocument();
		expect(tagNull).not.toHaveClass("ant-tag-success");
		expect(tagNull).not.toHaveClass("ant-tag-error");

		const { container: containerUndefined } = render(<ContractApprovalStatusTag value={undefined} />);
		const tagUndefined = containerUndefined.querySelector(".ant-tag");

		expect(tagUndefined).toBeInTheDocument();
		expect(tagUndefined).not.toHaveClass("ant-tag-success");
		expect(tagUndefined).not.toHaveClass("ant-tag-error");
	});

	it("renders default tag with custom pendingLabel when provided", () => {
		render(<ContractApprovalStatusTag value={null} pendingLabel="در حال بررسی" />);

		expect(screen.getByText("در حال بررسی")).toBeInTheDocument();
	});
});
