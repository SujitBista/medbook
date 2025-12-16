import { isDevelopment } from "../config/env";

/**
 * Log levels
 */
type LogLevel = "info" | "warn" | "error" | "debug";

/**
 * Logger utility for consistent logging across the application
 */
class Logger {
  private formatMessage(
    level: LogLevel,
    message: string,
    ...args: unknown[]
  ): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    return `${prefix} ${message}`;
  }

  info(message: string, ...args: unknown[]): void {
    console.log(this.formatMessage("info", message), ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(this.formatMessage("warn", message), ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(this.formatMessage("error", message), ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    if (isDevelopment) {
      console.debug(this.formatMessage("debug", message), ...args);
    }
  }
}

export const logger = new Logger();
