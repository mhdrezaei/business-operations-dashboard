import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { ContractDeleteConfirmTitle } from "./ContractDeleteConfirmTitle";

describe("contractDeleteConfirmTitle", () => {
	it("renders title text without warnings when warnings array is empty", () => {
		render(<ContractDeleteConfirmTitle title="آیا از حذف قرارداد اطمینان دارید؟" warnings={[]} />);

		expect(screen.getByText("آیا از حذف قرارداد اطمینان دارید؟")).toBeInTheDocument();
		expect(screen.queryByText(/این قرارداد تأیید یا امضا شده است/)).not.toBeInTheDocument();
		expect(screen.queryByText(/الحاقیه\u200Cهای این قرارداد/)).not.toBeInTheDocument();
	});

	it("renders approved warning when warnings contains 'approved'", () => {
		render(
			<ContractDeleteConfirmTitle
				title="حذف قرارداد"
				warnings={["approved"]}
			/>,
		);

		expect(screen.getByText("حذف قرارداد")).toBeInTheDocument();
		expect(
			screen.getByText("این قرارداد تأیید یا امضا شده است؛ با حذف، وضعیت تأیید آن هم از بین می‌رود."),
		).toBeInTheDocument();
		expect(screen.queryByText(/الحاقیه\u200Cهای این قرارداد/)).not.toBeInTheDocument();
	});

	it("renders addenda warning when warnings contains 'addenda'", () => {
		render(
			<ContractDeleteConfirmTitle
				title="حذف قرارداد"
				warnings={["addenda"]}
			/>,
		);

		expect(screen.getByText("حذف قرارداد")).toBeInTheDocument();
		expect(
			screen.getByText("الحاقیه‌های این قرارداد هم همراه آن حذف می‌شوند."),
		).toBeInTheDocument();
		expect(screen.queryByText(/این قرارداد تأیید یا امضا شده است/)).not.toBeInTheDocument();
	});

	it("renders both approved and addenda warnings with warning typography styling", () => {
		const { container } = render(
			<ContractDeleteConfirmTitle
				title="حذف قرارداد با الحاقیه"
				warnings={["approved", "addenda"]}
			/>,
		);

		expect(screen.getByText("حذف قرارداد با الحاقیه")).toBeInTheDocument();
		expect(
			screen.getByText("این قرارداد تأیید یا امضا شده است؛ با حذف، وضعیت تأیید آن هم از بین می‌رود."),
		).toBeInTheDocument();
		expect(
			screen.getByText("الحاقیه‌های این قرارداد هم همراه آن حذف می‌شوند."),
		).toBeInTheDocument();

		const warningElements = container.querySelectorAll(".ant-typography-warning");
		expect(warningElements).toHaveLength(2);
	});
});
