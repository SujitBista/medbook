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

const localStorageDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "localStorage"
);
const shouldShimLocalStorage =
  !localStorageDescriptor ||
  typeof localStorageDescriptor.get === "function" ||
  typeof (localStorageDescriptor.value as Storage | undefined)?.clear !==
    "function";

if (shouldShimLocalStorage) {
  Object.defineProperty(globalThis, "localStorage", {
    value: createStorageMock(),
    writable: true,
    configurable: true,
  });
}

const sessionStorageDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "sessionStorage"
);
const shouldShimSessionStorage =
  !sessionStorageDescriptor ||
  typeof sessionStorageDescriptor.get === "function" ||
  typeof (sessionStorageDescriptor.value as Storage | undefined)?.clear !==
    "function";

if (shouldShimSessionStorage) {
  Object.defineProperty(globalThis, "sessionStorage", {
    value: createStorageMock(),
    writable: true,
    configurable: true,
  });
}

// Cleanup React Testing Library DOM between tests
afterEach(() => {
  cleanup();
});
