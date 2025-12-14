/**
 * n8n Webhook Integration Utility
 *
 * Provides helper functions to trigger n8n workflows via webhooks.
 * Used for automated notifications, reminders, and integrations.
 */

import { logger } from "./logger";

/**
 * n8n webhook configuration
 */
interface N8nConfig {
  /** Base URL for n8n webhooks */
  baseUrl: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Whether to enable n8n integration */
  enabled: boolean;
}

/**
 * Get n8n configuration from environment
 */
function getN8nConfig(): N8nConfig {
  const baseUrl =
    process.env.N8N_WEBHOOK_BASE_URL || "http://localhost:5678/webhook";
  const timeout = parseInt(process.env.N8N_WEBHOOK_TIMEOUT || "10000", 10);
  const enabled = process.env.N8N_ENABLED !== "false";

  return {
    baseUrl: baseUrl.replace(/\/$/, ""), // Remove trailing slash
    timeout,
    enabled,
  };
}

/**
 * Response from n8n webhook
 */
export interface N8nWebhookResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: unknown;
}

/**
 * Common webhook payload types
 */
export interface AppointmentCreatedPayload {
  appointmentId: string;
  patientEmail: string;
  doctorName: string;
  doctorSpecialization?: string;
  startTime: Date | string;
  endTime: Date | string;
  notes?: string;
}

export interface AppointmentCancelledPayload {
  appointmentId: string;
  patientEmail: string;
  doctorName: string;
  startTime: Date | string;
  endTime: Date | string;
  reason?: string;
  cancelledBy: "patient" | "doctor" | "admin";
}

export interface AppointmentRescheduledPayload {
  appointmentId: string;
  patientEmail: string;
  doctorName: string;
  previousStartTime: Date | string;
  previousEndTime: Date | string;
  newStartTime: Date | string;
  newEndTime: Date | string;
  reason?: string;
}

export interface ReminderPayload {
  appointmentId: string;
  patientEmail: string;
  doctorName: string;
  startTime: Date | string;
  reminderType: "24h" | "1h" | "custom";
}

/**
 * Webhook name to payload type mapping
 */
export type WebhookPayloads = {
  "appointment-created": AppointmentCreatedPayload;
  "appointment-cancelled": AppointmentCancelledPayload;
  "appointment-rescheduled": AppointmentRescheduledPayload;
  "appointment-reminder": ReminderPayload;
};

/**
 * Available webhook names
 */
export type WebhookName = keyof WebhookPayloads;

/**
 * Options for webhook trigger
 */
interface TriggerOptions {
  /** Custom timeout in milliseconds (overrides default) */
  timeout?: number;
  /** Whether to throw on error (default: false - returns error response instead) */
  throwOnError?: boolean;
}

/**
 * Triggers an n8n webhook with the specified payload
 *
 * @param webhookName - Name of the webhook to trigger (e.g., 'appointment-created')
 * @param payload - Data to send to the webhook
 * @param options - Optional configuration
 * @returns Response from n8n or error details
 *
 * @example
 * ```typescript
 * await triggerN8nWebhook('appointment-created', {
 *   appointmentId: '123',
 *   patientEmail: 'patient@example.com',
 *   doctorName: 'Dr. Smith',
 *   startTime: new Date(),
 *   endTime: new Date(),
 * });
 * ```
 */
export async function triggerN8nWebhook<T extends WebhookName>(
  webhookName: T,
  payload: WebhookPayloads[T],
  options: TriggerOptions = {}
): Promise<N8nWebhookResponse> {
  const config = getN8nConfig();
  const { timeout = config.timeout, throwOnError = false } = options;

  // Check if n8n is enabled
  if (!config.enabled) {
    logger.debug("n8n integration disabled, skipping webhook", { webhookName });
    return {
      success: true,
      message: "n8n integration disabled",
    };
  }

  const webhookUrl = `${config.baseUrl}/${webhookName}`;

  logger.info("Triggering n8n webhook", {
    webhookName,
    webhookUrl,
    payloadKeys: Object.keys(payload),
  });

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Source": "medbook-api",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Parse response
    let responseData: unknown;
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    // Check for success
    if (!response.ok) {
      const errorMessage = `n8n webhook returned ${response.status}: ${response.statusText}`;

      logger.error("n8n webhook failed", {
        webhookName,
        status: response.status,
        statusText: response.statusText,
        responseData,
      });

      if (throwOnError) {
        throw new Error(errorMessage);
      }

      return {
        success: false,
        error: errorMessage,
        data: responseData,
      };
    }

    logger.info("n8n webhook triggered successfully", {
      webhookName,
      status: response.status,
    });

    return {
      success: true,
      data: responseData,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle specific error types
    const isAbortError = error instanceof Error && error.name === "AbortError";
    const isTimeoutError = isAbortError;

    const errorMessage = isTimeoutError
      ? `n8n webhook timed out after ${timeout}ms`
      : error instanceof Error
        ? error.message
        : "Unknown error occurred";

    logger.error("n8n webhook error", {
      webhookName,
      error: errorMessage,
      isTimeout: isTimeoutError,
    });

    if (throwOnError) {
      throw error;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Triggers an n8n webhook without waiting for response (fire-and-forget)
 *
 * Useful for non-critical notifications where you don't need to wait
 * for the webhook to complete.
 *
 * @param webhookName - Name of the webhook to trigger
 * @param payload - Data to send to the webhook
 *
 * @example
 * ```typescript
 * // Fire and forget - returns immediately
 * triggerN8nWebhookAsync('appointment-created', appointmentData);
 * ```
 */
export function triggerN8nWebhookAsync<T extends WebhookName>(
  webhookName: T,
  payload: WebhookPayloads[T]
): void {
  triggerN8nWebhook(webhookName, payload).catch((error) => {
    logger.error("Async n8n webhook failed", {
      webhookName,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  });
}

/**
 * Check if n8n service is available
 *
 * @returns true if n8n is reachable, false otherwise
 */
export async function isN8nAvailable(): Promise<boolean> {
  const config = getN8nConfig();

  if (!config.enabled) {
    return false;
  }

  // Extract base URL without /webhook path
  const baseUrl = config.baseUrl.replace("/webhook", "");
  const healthUrl = `${baseUrl}/healthz`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(healthUrl, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    return response.ok;
  } catch {
    return false;
  }
}
