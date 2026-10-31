import { vi } from "vitest";
import "vitest-canvas-mock";

/**
 * Polyfills for browser APIs missing or incomplete in happy-dom / test environment,
 * required by Ant Design, ECharts, Recharts, and custom hooks.
 */

// 1. window.matchMedia polyfill (used by Ant Design theme, Grid responsive hooks, etc.)
if (typeof window !== "undefined") {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		configurable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});

	// 2. window.scrollTo polyfill
	if (!window.scrollTo) {
		window.scrollTo = vi.fn();
	}
}

// 3. ResizeObserver polyfill (used by Ant Design Table, ProComponents, AutoHeight)
if (typeof globalThis.ResizeObserver === "undefined") {
	globalThis.ResizeObserver = class ResizeObserver {
		observe = vi.fn();
		unobserve = vi.fn();
		disconnect = vi.fn();
	} as any;
}

// 4. IntersectionObserver polyfill (used by lazy loading and scroll triggers)
if (typeof globalThis.IntersectionObserver === "undefined") {
	globalThis.IntersectionObserver = class IntersectionObserver {
		readonly root = null;
		readonly rootMargin = "";
		readonly thresholds = [];
		observe = vi.fn();
		unobserve = vi.fn();
		disconnect = vi.fn();
		takeRecords = vi.fn(() => []);
	} as any;
}
