/**
 * CTA for a schedule window: derived from schedule state first (closed/full/bookable),
 * then auth/role. Used per row on the doctor booking page.
 */

export type BookingRole = "PATIENT" | "ADMIN" | "GUEST";

export type WindowCtaAction =
  | "closed"
  | "full"
  | "sign-in"
  | "pay-and-book"
  | "admin-hide";

export interface WindowCtaResult {
  label: string;
  disabled: boolean;
  action: WindowCtaAction;
  helperText: string;
  showButton: boolean;
}

/**
 * Returns CTA config for a single schedule window.
 * Priority: isClosed > isFull > role (GUEST → Sign in, PATIENT → Pay & Book, ADMIN → hide).
 */
export function getWindowCta({
  isClosed,
  isFull,
  role,
  isBookable,
}: {
  isClosed: boolean;
  isFull: boolean;
  role: BookingRole;
  isBookable: boolean;
}): WindowCtaResult {
  if (isClosed) {
    return {
      label: "Closed",
      disabled: true,
      action: "closed",
      helperText: "This window has already ended.",
      showButton: true,
    };
  }
  if (isFull) {
    return {
      label: "Full",
      disabled: true,
      action: "full",
      helperText: "All tokens have been booked.",
      showButton: true,
    };
  }
  if (role === "GUEST") {
    return {
      label: "Sign in to book",
      disabled: false,
      action: "sign-in",
      helperText: "Sign in to pay and confirm your token.",
      showButton: true,
    };
  }
  if (role === "PATIENT") {
    return {
      label: "Pay & Book",
      disabled: false,
      action: "pay-and-book",
      helperText: "",
      showButton: true,
    };
  }
  // ADMIN (or DOCTOR)
  return {
    label: "",
    disabled: true,
    action: "admin-hide",
    helperText: "Use the dashboard to manage bookings.",
    showButton: false,
  };
}
