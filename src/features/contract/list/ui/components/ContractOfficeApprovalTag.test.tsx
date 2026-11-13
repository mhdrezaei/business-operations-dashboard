import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { ContractOfficeApprovalTag } from "./ContractOfficeApprovalTag";

describe("contractOfficeApprovalTag", () => {
	it("renders success tag when contract is signed (is_signed: true)", () => {
		const { container } = render(
			<ContractOfficeApprovalTag contract={{ is_signed: true, is_business_approved: true }} />,
		);

		const tag = container.querySelector(".ant-tag");
		expect(tag).toBeInTheDocument();
		expect(tag).toHaveClass("ant-tag-success");
		expect(tag).toHaveTextContent("تأیید شده");
	});

	it("renders warning tag when contract is not signed but business is approved (waiting)", () => {
		const { container } = render(
			<ContractOfficeApprovalTag contract={{ is_signed: false, is_business_approved: true }} />,
		);

		const tag = container.querySelector(".ant-tag");
		expect(tag).toBeInTheDocument();
		expect(tag).toHaveClass("ant-tag-warning");
		expect(tag).toHaveTextContent("در انتظار تأیید");
	});

	it("renders default tag when neither or business approval is not approved (waitingBusiness)", () => {
		const { container: containerBothFalse } = render(
			<ContractOfficeApprovalTag contract={{ is_signed: false, is_business_approved: false }} />,
		);

		const tagBothFalse = containerBothFalse.querySelector(".ant-tag");
		expect(tagBothFalse).toBeInTheDocument();
		expect(tagBothFalse).not.toHaveClass("ant-tag-success");
		expect(tagBothFalse).not.toHaveClass("ant-tag-warning");
		expect(tagBothFalse).toHaveTextContent("در انتظار تأیید تجاری");

		const { container: containerNull } = render(
			<ContractOfficeApprovalTag contract={{ is_signed: null, is_business_approved: null }} />,
		);

		const tagNull = containerNull.querySelector(".ant-tag");
		expect(tagNull).toBeInTheDocument();
		expect(tagNull).not.toHaveClass("ant-tag-success");
		expect(tagNull).not.toHaveClass("ant-tag-warning");
		expect(tagNull).toHaveTextContent("در انتظار تأیید تجاری");
	});
});
