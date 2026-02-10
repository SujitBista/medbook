"use client";

import { Button } from "@medbook/ui";
import Link from "next/link";

interface GuestCTAProps {
  /** URL to return to after login (e.g. current doctor page) */
  callbackUrl: string;
  className?: string;
}

/**
 * Shown to GUEST on the public doctor booking page.
 * Single CTA to sign in; redirects back to this page after login.
 */
export function GuestCTA({ callbackUrl, className }: GuestCTAProps) {
  const loginUrl = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  return (
    <Link href={loginUrl} className={className}>
      <Button variant="primary" size="sm">
        Sign in to book
      </Button>
    </Link>
  );
}
