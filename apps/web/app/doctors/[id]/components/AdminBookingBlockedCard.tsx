"use client";

import { Button } from "@medbook/ui";
import Link from "next/link";

/**
 * Shown to ADMIN on the public doctor booking page.
 * Explains that admins cannot book and offers actions.
 */
export function AdminBookingBlockedCard() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-amber-900">
          Admins cannot book from the public page.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin">
            <Button variant="primary" size="sm">
              Go to Admin Dashboard
            </Button>
          </Link>
          <Link href="/doctors">
            <Button variant="outline" size="sm">
              Browse Doctors
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
