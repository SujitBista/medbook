/**
 * Vitest setup file for the web app.
 * Configures Testing Library and shared test hooks.
 */

import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Provide resilient localStorage/sessionStorage mocks when not available in the test environment
const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

if (
  !("localStorage" in globalThis) ||
  typeof (globalThis as any).localStorage?.clear !== "function"
) {
  Object.defineProperty(globalThis, "localStorage", {
    value: createStorageMock(),
    writable: true,
  });
}

if (
  !("sessionStorage" in globalThis) ||
  typeof (globalThis as any).sessionStorage?.clear !== "function"
) {
  Object.defineProperty(globalThis, "sessionStorage", {
    value: createStorageMock(),
    writable: true,
  });
}

// Cleanup React Testing Library DOM between tests
afterEach(() => {
  cleanup();
});
