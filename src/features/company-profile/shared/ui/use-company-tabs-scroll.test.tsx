import { act, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { useCompanyTabsScroll } from "./use-company-tabs-scroll";

function Fixture() {
	const { containerRef, resetTabScroll } = useCompanyTabsScroll(true);
	return (
		<div style={{ overflowY: "auto" }} data-testid="scroller">
			<div ref={containerRef} data-testid="tabs">
				<button type="button" onClick={resetTabScroll}>Change tab</button>
			</div>
		</div>
	);
}

describe("company tab scrolling", () => {
	it("resets a scrolled panel to the tab header before switching", () => {
		render(<Fixture />);
		const scroller = screen.getByTestId("scroller");
		const tabs = screen.getByTestId("tabs");
		const scrollTo = vi.spyOn(scroller, "scrollTo").mockImplementation(() => {});
		vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue({ top: 100 } as DOMRect);
		vi.spyOn(tabs, "getBoundingClientRect").mockReturnValue({ top: -300 } as DOMRect);
		scroller.scrollTop = 650;
		act(() => screen.getByRole("button").click());
		expect(scrollTo).toHaveBeenCalledWith({ top: 250, behavior: "instant" });
	});

	it("does not scroll when the tab header is already visible", () => {
		render(<Fixture />);
		const scroller = screen.getByTestId("scroller");
		const scrollTo = vi.spyOn(scroller, "scrollTo");
		vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue({ top: 100 } as DOMRect);
		vi.spyOn(screen.getByTestId("tabs"), "getBoundingClientRect").mockReturnValue({ top: 200 } as DOMRect);
		act(() => screen.getByRole("button").click());
		expect(scrollTo).not.toHaveBeenCalled();
	});
});
