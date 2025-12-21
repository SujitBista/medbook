"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { ToastProvider } from "@medbook/ui";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Wraps the app with NextAuth SessionProvider and ToastProvider
 * This enables useSession hook and toast notifications throughout the app
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}
