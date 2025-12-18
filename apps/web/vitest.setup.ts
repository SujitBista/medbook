/**
 * Vitest setup file for the web app.
 * Configures Testing Library and shared test hooks.
 */

import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Cleanup React Testing Library DOM between tests
afterEach(() => {
  cleanup();
});
