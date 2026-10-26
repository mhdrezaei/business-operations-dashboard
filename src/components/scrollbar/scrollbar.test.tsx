import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Scrollbar } from "./index";

describe("scrollbar component", () => {
	it("renders children in default simplebar mode", () => {
		render(
			<Scrollbar data-testid="scroll-container">
				<div>Scrollable Content</div>
			</Scrollbar>,
		);

		expect(screen.getByText("Scrollable Content")).toBeInTheDocument();
		expect(screen.getByTestId("scroll-container")).toBeInTheDocument();
	});

	it("renders in native mode with custom-scrollbar classes", () => {
		const { container } = render(
			<Scrollbar mode="native" data-testid="native-scroll">
				<div>Native Content</div>
			</Scrollbar>,
		);

		const element = container.querySelector(".custom-scrollbar");
		expect(element).toBeInTheDocument();
		expect(element).toHaveClass("overflow-auto");
		expect(screen.getByText("Native Content")).toBeInTheDocument();
	});

	it("applies directional overflow classes in native mode", () => {
		const { rerender, container } = render(
			<Scrollbar mode="native" direction="vertical">
				<div>Vertical Content</div>
			</Scrollbar>,
		);

		expect(container.firstChild).toHaveClass("overflow-y-auto");
		expect(container.firstChild).toHaveClass("overflow-x-hidden");

		rerender(
			<Scrollbar mode="native" direction="horizontal">
				<div>Horizontal Content</div>
			</Scrollbar>,
		);

		expect(container.firstChild).toHaveClass("overflow-x-auto");
		expect(container.firstChild).toHaveClass("overflow-y-hidden");
	});

	it("supports thin and hidden variants", () => {
		const { rerender, container } = render(
			<Scrollbar mode="native" variant="thin">
				<div>Thin variant</div>
			</Scrollbar>,
		);

		expect(container.firstChild).toHaveClass("custom-scrollbar-thin");

		rerender(
			<Scrollbar mode="native" variant="hidden">
				<div>Hidden variant</div>
			</Scrollbar>,
		);

		expect(container.firstChild).toHaveClass("custom-scrollbar-hidden");
	});

	it("formats numeric dimensions as pixel styles", () => {
		const { container } = render(
			<Scrollbar mode="native" maxHeight={350} height={200} maxWidth={500} width={400}>
				<div>Sized Content</div>
			</Scrollbar>,
		);

		const style = (container.firstChild as HTMLElement).style;
		expect(style.maxHeight).toBe("350px");
		expect(style.height).toBe("200px");
		expect(style.maxWidth).toBe("500px");
		expect(style.width).toBe("400px");
	});

	it("renders content wrapper when contentClassName or contentStyle are provided", () => {
		const { container } = render(
			<Scrollbar mode="native" contentClassName="p-4" contentStyle={{ minHeight: "100%" }}>
				<div>Wrapped Content</div>
			</Scrollbar>,
		);

		const contentDiv = container.querySelector(".p-4");
		expect(contentDiv).toBeInTheDocument();
		expect(contentDiv).toHaveTextContent("Wrapped Content");
		expect((contentDiv as HTMLElement).style.minHeight).toBe("100%");
	});

	it("forwards ref to scrollable element in native mode", () => {
		let refElement: HTMLElement | null = null;
		render(
			<Scrollbar mode="native" ref={(el) => { refElement = el; }}>
				<div>Ref Content</div>
			</Scrollbar>,
		);

		expect(refElement).toBeInstanceOf(HTMLElement);
	});

	it("forwards ref to scrollable element in simplebar mode", () => {
		let refElement: HTMLElement | null = null;
		render(
			<Scrollbar ref={(el) => { refElement = el; }}>
				<div>SimpleBar Ref Content</div>
			</Scrollbar>,
		);

		expect(refElement).toBeInstanceOf(HTMLElement);
	});

	it("handles onScroll events", () => {
		let scrolled = false;
		render(
			<Scrollbar mode="native" data-testid="scrollable" onScroll={() => (scrolled = true)}>
				<div style={{ height: "1000px" }}>Long Content</div>
			</Scrollbar>,
		);

		const scrollable = screen.getByTestId("scrollable");
		fireEvent.scroll(scrollable);
		expect(scrolled).toBe(true);
	});
});
