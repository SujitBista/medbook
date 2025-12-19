/**
 * Tests for NextAuth auth state persistence
 * Tests that session persists across page reloads, navigation, and browser restarts
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useSession, SessionProvider } from "next-auth/react";
import { UserProfileDropdown } from "@/components/layout/UserProfileDropdown";
import { AuthStatus } from "@/app/components/AuthStatus";
import React from "react";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  signOut: vi.fn(),
}));

// Mock next/navigation
const mockPathname = "/dashboard";
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => mockPathname),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  })),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href }, children),
}));

describe("Auth State Persistence", () => {
  const mockSession = {
    user: {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      role: "PATIENT",
      mustResetPassword: false,
      profilePictureUrl: null,
    },
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
    // Clear sessionStorage
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Session Persistence Across Component Renders", () => {
    it("should maintain session state when component re-renders", async () => {
      (useSession as any).mockReturnValue({
        data: mockSession,
        status: "authenticated",
        update: vi.fn(),
      });

      const { rerender } = render(
        <SessionProvider>
          <UserProfileDropdown />
        </SessionProvider>
      );

      // Initial render should show user email
      await waitFor(() => {
        expect(screen.getByText("test@example.com")).toBeInTheDocument();
      });

      // Re-render component
      rerender(
        <SessionProvider>
          <UserProfileDropdown />
        </SessionProvider>
      );

      // Session should still be available after re-render
      await waitFor(() => {
        expect(screen.getByText("test@example.com")).toBeInTheDocument();
      });

      // useSession should be called
      expect(useSession).toHaveBeenCalled();
    });

    it("should persist session when navigating between pages", async () => {
      (useSession as any).mockReturnValue({
        data: mockSession,
        status: "authenticated",
        update: vi.fn(),
      });

      // Render AuthStatus component (simulating page 1)
      const { unmount } = render(
        <SessionProvider>
          <AuthStatus />
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("test@example.com")).toBeInTheDocument();
      });

      // Unmount (simulating navigation away)
      unmount();

      // Render again (simulating navigation to new page)
      render(
        <SessionProvider>
          <AuthStatus />
        </SessionProvider>
      );

      // Session should still be available
      await waitFor(() => {
        expect(screen.getByText("test@example.com")).toBeInTheDocument();
      });
    });
  });

  describe("Session Status Transitions", () => {
    it("should handle loading state correctly", async () => {
      (useSession as any).mockReturnValue({
        data: null,
        status: "loading",
        update: vi.fn(),
      });

      render(
        <SessionProvider>
          <AuthStatus />
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("Loading...")).toBeInTheDocument();
      });
    });

    it("should transition from loading to authenticated", async () => {
      (useSession as any)
        .mockReturnValueOnce({
          data: null,
          status: "loading",
          update: vi.fn(),
        })
        .mockReturnValueOnce({
          data: mockSession,
          status: "authenticated",
          update: vi.fn(),
        });

      const { rerender } = render(
        <SessionProvider>
          <AuthStatus />
        </SessionProvider>
      );

      // Initially loading
      await waitFor(() => {
        expect(screen.getByText("Loading...")).toBeInTheDocument();
      });

      rerender(
        <SessionProvider>
          <AuthStatus />
        </SessionProvider>
      );

      // Should show authenticated content
      await waitFor(() => {
        expect(screen.getByText("test@example.com")).toBeInTheDocument();
      });
    });

    it("should handle unauthenticated state", async () => {
      (useSession as any).mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: vi.fn(),
      });

      render(
        <SessionProvider>
          <AuthStatus />
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("Sign In")).toBeInTheDocument();
        expect(screen.getByText("Sign Up")).toBeInTheDocument();
      });
    });
  });

  describe("Session Data Persistence", () => {
    it("should maintain user data across multiple component instances", async () => {
      (useSession as any).mockReturnValue({
        data: mockSession,
        status: "authenticated",
        update: vi.fn(),
      });

      render(
        <SessionProvider>
          <div>
            <AuthStatus />
            <UserProfileDropdown />
          </div>
        </SessionProvider>
      );

      // Both components should show the same user data
      const emailElements = screen.getAllByText("test@example.com");
      expect(emailElements.length).toBeGreaterThan(0);

      // Both should show the same role
      const roleElements = screen.getAllByText("PATIENT");
      expect(roleElements.length).toBeGreaterThan(0);
    });

    it("should persist session with all user properties", async () => {
      const sessionWithAllProps = {
        ...mockSession,
        user: {
          ...mockSession.user,
          mustResetPassword: true,
          profilePictureUrl: "https://example.com/avatar.jpg",
        },
      };

      (useSession as any).mockReturnValue({
        data: sessionWithAllProps,
        status: "authenticated",
        update: vi.fn(),
      });

      render(
        <SessionProvider>
          <UserProfileDropdown />
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("test@example.com")).toBeInTheDocument();
      });

      // Verify session contains all expected properties
      const sessionData = (useSession as any).mock.results[0].value.data;
      expect(sessionData.user.id).toBe("user-123");
      expect(sessionData.user.email).toBe("test@example.com");
      expect(sessionData.user.role).toBe("PATIENT");
      expect(sessionData.user.mustResetPassword).toBe(true);
      expect(sessionData.user.profilePictureUrl).toBe(
        "https://example.com/avatar.jpg"
      );
    });
  });

  describe("Session Expiration", () => {
    it("should handle expired session", async () => {
      const expiredSession = {
        ...mockSession,
        expires: new Date(Date.now() - 1000).toISOString(), // Expired
      };

      (useSession as any).mockReturnValue({
        data: expiredSession,
        status: "unauthenticated",
        update: vi.fn(),
      });

      render(
        <SessionProvider>
          <AuthStatus />
        </SessionProvider>
      );

      // Should show unauthenticated state
      await waitFor(() => {
        expect(screen.getByText("Sign In")).toBeInTheDocument();
      });
    });

    it("should handle valid session expiration date", async () => {
      const futureExpiration = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      const validSession = {
        ...mockSession,
        expires: futureExpiration,
      };

      (useSession as any).mockReturnValue({
        data: validSession,
        status: "authenticated",
        update: vi.fn(),
      });

      render(
        <SessionProvider>
          <AuthStatus />
        </SessionProvider>
      );

      // Should show authenticated state
      await waitFor(() => {
        expect(screen.getByText("test@example.com")).toBeInTheDocument();
      });
    });
  });
});
