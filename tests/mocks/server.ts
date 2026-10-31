import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * MSW Server for Node / Vitest testing environment.
 */
export const server = setupServer(...handlers);
