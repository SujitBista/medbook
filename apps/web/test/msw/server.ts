import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * MSW server instance used in Vitest.
 *
 * The server is started and stopped in `vitest.setup.ts`.
 * Add or modify handlers in `./handlers` to mock API responses.
 */
export const server = setupServer(...handlers);
