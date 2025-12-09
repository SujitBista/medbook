/**
 * Email service functions
 * Handles email notifications using Resend
 */

import { Resend } from "resend";
import { env, isDevelopment } from "../config/env";
import { logger } from "../utils/logger";

// Lazy initialization of Resend client to ensure env vars are loaded
let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (resend === null && env.resendApiKey) {
    resend = new Resend(env.resendApiKey);
    logger.info("Resend email client initialized");
  }
  return resend;
}

/**
 * Email send result
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Base email options
 */
interface BaseEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Sends an email using Resend
 * In development without API key, logs the email instead
 * @param options Email options
 * @returns Email result
 */
async function sendEmail(options: BaseEmailOptions): Promise<EmailResult> {
  const { to, subject, html, text } = options;

  // Get the Resend client (lazily initialized)
  const client = getResendClient();

  // If no Resend client (no API key), log the email in development
  if (!client) {
    if (isDevelopment) {
      logger.info("📧 Email (dev mode - not sent):", {
        to,
        subject,
        preview: html.substring(0, 200) + "...",
      });
      return { success: true, messageId: "dev-mode-not-sent" };
    }

    logger.warn("Email not sent - RESEND_API_KEY not configured", {
      to,
      subject,
    });
    return { success: false, error: "Email service not configured" };
  }

  try {
    const result = await client.emails.send({
      from: env.emailFrom,
      to,
      subject,
      html,
      text: text || stripHtml(html),
    });

    if (result.error) {
      logger.error("Failed to send email", {
        to,
        subject,
        error: result.error.message,
      });
      return { success: false, error: result.error.message };
    }

    logger.info("Email sent successfully", {
      to,
      subject,
      messageId: result.data?.id,
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to send email", {
      to,
      subject,
      error: errorMessage,
    });
    return { success: false, error: errorMessage };
  }
}

/**
 * Strips HTML tags from a string
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Formats a date for display in emails
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Formats a time for display in emails
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ============================================================================
// Email Templates
// ============================================================================

/**
 * Welcome email data
 */
export interface WelcomeEmailData {
  email: string;
  role: "PATIENT" | "DOCTOR" | "ADMIN";
}

/**
 * Sends a welcome email to a new user
 */
export async function sendWelcomeEmail(
  data: WelcomeEmailData
): Promise<EmailResult> {
  const { email, role } = data;

  const roleMessages: Record<string, string> = {
    PATIENT:
      "You can now browse doctors, view their availability, and book appointments.",
    DOCTOR:
      "You can now set up your availability and start accepting patient appointments.",
    ADMIN: "You have administrator access to manage the MedBook platform.",
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to MedBook</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">MedBook</h1>
        <p style="color: #6b7280; margin-top: 5px;">Healthcare Made Simple</p>
      </div>
      
      <div style="background-color: #f3f4f6; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="color: #1f2937; margin-top: 0;">Welcome to MedBook! 🎉</h2>
        <p>Your account has been successfully created.</p>
        <p>${roleMessages[role] || roleMessages.PATIENT}</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${env.appUrl}/dashboard" 
           style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
          Go to Dashboard
        </a>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
        <p>If you didn't create this account, please ignore this email.</p>
        <p>© ${new Date().getFullYear()} MedBook. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "Welcome to MedBook!",
    html,
  });
}

/**
 * Appointment confirmation email data
 */
export interface AppointmentConfirmationEmailData {
  patientEmail: string;
  patientName?: string;
  doctorName: string;
  doctorSpecialization?: string;
  appointmentDate: Date;
  appointmentEndTime: Date;
  appointmentId: string;
  notes?: string;
}

/**
 * Sends appointment confirmation email to the patient
 */
export async function sendAppointmentConfirmationEmail(
  data: AppointmentConfirmationEmailData
): Promise<EmailResult> {
  const {
    patientEmail,
    patientName,
    doctorName,
    doctorSpecialization,
    appointmentDate,
    appointmentEndTime,
    appointmentId,
    notes,
  } = data;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Appointment Confirmed</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">MedBook</h1>
        <p style="color: #6b7280; margin-top: 5px;">Healthcare Made Simple</p>
      </div>
      
      <div style="background-color: #dcfce7; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
        <h2 style="color: #166534; margin: 0;">✓ Appointment Confirmed</h2>
      </div>
      
      <p>Dear ${patientName || "Patient"},</p>
      <p>Your appointment has been successfully booked. Here are the details:</p>
      
      <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Doctor:</td>
            <td style="padding: 8px 0; font-weight: 500;">Dr. ${doctorName}${doctorSpecialization ? ` (${doctorSpecialization})` : ""}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Date:</td>
            <td style="padding: 8px 0; font-weight: 500;">${formatDate(appointmentDate)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Time:</td>
            <td style="padding: 8px 0; font-weight: 500;">${formatTime(appointmentDate)} - ${formatTime(appointmentEndTime)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Confirmation #:</td>
            <td style="padding: 8px 0; font-weight: 500;">${appointmentId.substring(0, 8).toUpperCase()}</td>
          </tr>
          ${notes ? `<tr><td style="padding: 8px 0; color: #6b7280;">Notes:</td><td style="padding: 8px 0;">${notes}</td></tr>` : ""}
        </table>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${env.appUrl}/dashboard/appointments" 
           style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
          View Appointment
        </a>
      </div>
      
      <div style="background-color: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>Important:</strong> Please arrive 10 minutes before your scheduled time. 
          If you need to cancel or reschedule, please do so at least 24 hours in advance.
        </p>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
        <p>© ${new Date().getFullYear()} MedBook. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: patientEmail,
    subject: `Appointment Confirmed with Dr. ${doctorName}`,
    html,
  });
}

/**
 * Appointment cancellation email data
 */
export interface AppointmentCancellationEmailData {
  patientEmail: string;
  patientName?: string;
  doctorName: string;
  appointmentDate: Date;
  appointmentEndTime: Date;
  reason?: string;
  cancelledBy: "patient" | "doctor" | "admin";
}

/**
 * Sends appointment cancellation email to the patient
 */
export async function sendAppointmentCancellationEmail(
  data: AppointmentCancellationEmailData
): Promise<EmailResult> {
  const {
    patientEmail,
    patientName,
    doctorName,
    appointmentDate,
    appointmentEndTime,
    reason,
    cancelledBy,
  } = data;

  const cancelledByText =
    cancelledBy === "patient"
      ? "at your request"
      : cancelledBy === "doctor"
        ? "by the doctor"
        : "by the administrator";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Appointment Cancelled</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">MedBook</h1>
        <p style="color: #6b7280; margin-top: 5px;">Healthcare Made Simple</p>
      </div>
      
      <div style="background-color: #fee2e2; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
        <h2 style="color: #991b1b; margin: 0;">Appointment Cancelled</h2>
      </div>
      
      <p>Dear ${patientName || "Patient"},</p>
      <p>Your appointment has been cancelled ${cancelledByText}.</p>
      
      <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #374151;">Cancelled Appointment Details:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Doctor:</td>
            <td style="padding: 8px 0;">Dr. ${doctorName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Date:</td>
            <td style="padding: 8px 0;">${formatDate(appointmentDate)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Time:</td>
            <td style="padding: 8px 0;">${formatTime(appointmentDate)} - ${formatTime(appointmentEndTime)}</td>
          </tr>
          ${reason ? `<tr><td style="padding: 8px 0; color: #6b7280;">Reason:</td><td style="padding: 8px 0;">${reason}</td></tr>` : ""}
        </table>
      </div>
      
      <p>If you would like to book a new appointment, please visit our website.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${env.appUrl}/doctors" 
           style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
          Book New Appointment
        </a>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
        <p>© ${new Date().getFullYear()} MedBook. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: patientEmail,
    subject: `Appointment Cancelled with Dr. ${doctorName}`,
    html,
  });
}

/**
 * Appointment reminder email data
 */
export interface AppointmentReminderEmailData {
  patientEmail: string;
  patientName?: string;
  doctorName: string;
  doctorSpecialization?: string;
  appointmentDate: Date;
  appointmentEndTime: Date;
  appointmentId: string;
  hoursUntil: number;
}

/**
 * Sends appointment reminder email to the patient
 */
export async function sendAppointmentReminderEmail(
  data: AppointmentReminderEmailData
): Promise<EmailResult> {
  const {
    patientEmail,
    patientName,
    doctorName,
    doctorSpecialization,
    appointmentDate,
    appointmentEndTime,
    appointmentId,
    hoursUntil,
  } = data;

  const timeUntilText =
    hoursUntil <= 1
      ? "in about 1 hour"
      : hoursUntil <= 24
        ? `in ${hoursUntil} hours`
        : "tomorrow";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Appointment Reminder</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">MedBook</h1>
        <p style="color: #6b7280; margin-top: 5px;">Healthcare Made Simple</p>
      </div>
      
      <div style="background-color: #dbeafe; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
        <h2 style="color: #1e40af; margin: 0;">⏰ Appointment Reminder</h2>
        <p style="color: #1e40af; margin: 10px 0 0 0;">Your appointment is ${timeUntilText}</p>
      </div>
      
      <p>Dear ${patientName || "Patient"},</p>
      <p>This is a friendly reminder about your upcoming appointment.</p>
      
      <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Doctor:</td>
            <td style="padding: 8px 0; font-weight: 500;">Dr. ${doctorName}${doctorSpecialization ? ` (${doctorSpecialization})` : ""}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Date:</td>
            <td style="padding: 8px 0; font-weight: 500;">${formatDate(appointmentDate)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Time:</td>
            <td style="padding: 8px 0; font-weight: 500;">${formatTime(appointmentDate)} - ${formatTime(appointmentEndTime)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Confirmation #:</td>
            <td style="padding: 8px 0; font-weight: 500;">${appointmentId.substring(0, 8).toUpperCase()}</td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>Remember:</strong> Please arrive 10 minutes before your scheduled time.
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${env.appUrl}/dashboard/appointments" 
           style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
          View Appointment
        </a>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
        <p>© ${new Date().getFullYear()} MedBook. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: patientEmail,
    subject: `Reminder: Appointment ${timeUntilText} with Dr. ${doctorName}`,
    html,
  });
}
