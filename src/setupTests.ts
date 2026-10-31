import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "../tests/mocks/server";
import { setupI18n } from "./locales";
import "@testing-library/jest-dom/vitest";

// Initialize i18n for tests
setupI18n();

// Start MSW server before all tests
beforeAll(() => {
	server.listen({ onUnhandledRequest: "bypass" });
});

// Reset handlers after each test to keep tests isolated
afterEach(() => {
	server.resetHandlers();
});

// Clean up after all tests finish
afterAll(() => {
	server.close();
});
