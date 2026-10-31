import { describe, expect, it, vi } from "vitest";

describe("uI / DOM Polyfills and Canvas Mocks", () => {
	it("supports window.matchMedia queries without throwing", () => {
		expect(window.matchMedia).toBeDefined();

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		expect(mediaQuery).toHaveProperty("matches");
		expect(mediaQuery).toHaveProperty("media", "(prefers-color-scheme: dark)");
		expect(typeof mediaQuery.addEventListener).toBe("function");
		expect(typeof mediaQuery.removeEventListener).toBe("function");
	});

	it("supports ResizeObserver observing elements in component lifecycle", () => {
		expect(globalThis.ResizeObserver).toBeDefined();

		const onResize = vi.fn();
		const observer = new ResizeObserver(onResize);
		const div = document.createElement("div");
		document.body.appendChild(div);

		expect(() => observer.observe(div)).not.toThrow();
		expect(() => observer.unobserve(div)).not.toThrow();
		expect(() => observer.disconnect()).not.toThrow();

		div.remove();
	});

	it("supports IntersectionObserver observing elements", () => {
		expect(globalThis.IntersectionObserver).toBeDefined();

		const onIntersect = vi.fn();
		const observer = new IntersectionObserver(onIntersect);
		const div = document.createElement("div");

		expect(() => observer.observe(div)).not.toThrow();
		expect(() => observer.disconnect()).not.toThrow();
	});

	it("supports HTMLCanvasElement 2D context via vitest-canvas-mock", () => {
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");

		expect(ctx).toBeDefined();
		expect(ctx).not.toBeNull();

		// Canvas drawing operations used by ECharts / charts do not throw
		if (ctx) {
			ctx.beginPath();
			ctx.rect(0, 0, 100, 100);
			ctx.fillStyle = "red";
			ctx.fill();
			expect(ctx.fill).toBeDefined();
		}
	});
});
