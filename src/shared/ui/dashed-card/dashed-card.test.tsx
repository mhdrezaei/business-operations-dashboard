import { fireEvent, render, screen } from "@testing-library/react";
import { DashedCard, FieldCard } from "./index";

describe("dashed card", () => {
	it("renders shared structure for nested content", () => {
		const { container } = render(
			<DashedCard title="Nested title" extra={<button type="button">Action</button>}>
				<div>Nested content</div>
			</DashedCard>,
		);

		expect(container.querySelector(".dashed-border")).toBeInTheDocument();
		expect(container.querySelector(".dashed-card__header")).toHaveTextContent("Nested title");
		expect(screen.getByText("Nested content")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
	});

	it("uses the field variant and tone tag", () => {
		const { container } = render(
			<FieldCard title="Metric" tone="gold">
				<input aria-label="Metric value" />
			</FieldCard>,
		);

		expect(container.querySelector(".dashed-card--field")).toBeInTheDocument();
		expect(container.querySelector(".dashed-card__tag")).toHaveTextContent("Metric");
		expect(screen.getByRole("textbox", { name: "Metric value" })).toBeInTheDocument();
	});

	it("delegates collapsible behavior to SectionCard", () => {
		render(
			<DashedCard title="Collapsible" collapsible defaultExpanded={false}>
				<div>Hidden content</div>
			</DashedCard>,
		);

		expect(screen.queryByText("Hidden content")).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "باز کردن Collapsible" }));
		expect(screen.getByText("Hidden content")).toBeInTheDocument();
	});
});
