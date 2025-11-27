/**
 * Unit tests for logger utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("info", () => {
    it("should log info message with timestamp", () => {
      logger.info("Test message");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const callArgs = consoleLogSpy.mock.calls[0];
      expect(callArgs[0]).toMatch(
        /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] Test message/
      );
    });

    it("should log info message with additional arguments", () => {
      const data = { key: "value" };
      logger.info("Test message", data);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy.mock.calls[0][1]).toBe(data);
    });
  });

  describe("warn", () => {
    it("should log warn message with timestamp", () => {
      logger.warn("Warning message");

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArgs = consoleWarnSpy.mock.calls[0];
      expect(callArgs[0]).toMatch(
        /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[WARN\] Warning message/
      );
    });

    it("should log warn message with additional arguments", () => {
      const error = new Error("Test error");
      logger.warn("Warning message", error);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy.mock.calls[0][1]).toBe(error);
    });
  });

  describe("error", () => {
    it("should log error message with timestamp", () => {
      logger.error("Error message");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const callArgs = consoleErrorSpy.mock.calls[0];
      expect(callArgs[0]).toMatch(
        /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[ERROR\] Error message/
      );
    });

    it("should log error message with additional arguments", () => {
      const error = new Error("Test error");
      logger.error("Error message", error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy.mock.calls[0][1]).toBe(error);
    });
  });

  describe("debug", () => {
    it("should not log debug message in test environment", () => {
      // In test environment (NODE_ENV=test), isDevelopment is false
      // So debug should not be called
      logger.debug("Debug message");

      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it("should have debug method that can be called", () => {
      // Just verify the method exists and doesn't throw
      expect(() => logger.debug("Debug message")).not.toThrow();
    });
  });
});
