import type { HttpHandler } from "msw";

/**
 * Default global request handlers.
 * Test suites can add specific handlers using `server.use(...)`.
 */
export const handlers: HttpHandler[] = [];
