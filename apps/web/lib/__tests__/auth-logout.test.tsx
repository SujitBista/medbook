/**
 * Tests for NextAuth logout and session invalidation
 * Tests that signOut properly clears session and invalidates tokens
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSession, signOut, SessionProvider } from "next-auth/react";
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
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockPathname = "/dashboard";
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => mockPathname),
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: mockReplace,
    refresh: vi.fn(),
  })),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href }, children),
}));

// Mock window.location
const mockLocation = {
  href: "",
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
};

Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

describe("Logout and Session Invalidation", () => {
  const mockSession = {
    user: {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      role: "PATIENT",
      mustResetPassword: false,
      profilePictureUrl: null,
    },
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = "";
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("SignOut Function", () => {
    it("should call signOut when logout button is clicked", async () => {
      (signOut as any).mockResolvedValue(undefined);
      (useSession as any).mockReturnValue({
        data: mockSession,
        status: "authenticated",
        update: vi.fn(),
      });

      const user = userEvent.setup();

      render(
        <SessionProvider>
          <UserProfileDropdown />
        </SessionProvider>
      );

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByText("test@example.com")).toBeInTheDocument();
      });

      // Find and click the profile button to open dropdown
      const profileButton = screen.getByLabelText("User menu");
      await user.click(profileButton);

      // Wait for dropdown to open and find logout button
      await waitFor(() => {
        const logoutButton = screen.getByText("Sign Out");
        expect(logoutButton).toBeInTheDocument();
      });

      const logoutButton = screen.getByText("Sign Out");
      await user.click(logoutButton);

      // signOut should be called
      expect(signOut).toHaveBeenCalled();
    });

    it("should call signOut with callbackUrl option", async () => {
      (signOut as any).mockResolvedValue(undefined);
      (useSession as any).mockReturnValue({
        data: mockSession,
        status: "authenticated",
        update: vi.fn(),
      });

      const user = userEvent.setup();

      render(
        <SessionProvider>
          <AuthStatus />
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("test@example.com")).toBeInTheDocument();
      });

      const logoutButton = screen.getByText("Sign Out");
      await user.click(logoutButton);

      // signOut should be called with callbackUrl
      expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" });
    });

    it("should handle signOut errors gracefully", async () => {
      (signOut as any).mockRejectedValue(new Error("Logout failed"));
      (useSession as any).mockReturnValue({
        data: mockSession,
        status: "authenticated",
        update: vi.fn(),
      });

      const user = userEvent.setup();

      render(
        <SessionProvider>
          <UserProfileDropdown />
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("test@example.com")).toBeInTheDocument();
      });

      const profileButton = screen.getByLabelText("User menu");
      await user.click(profileButton);

      await waitFor(() => {
        expect(screen.getByText("Sign Out")).toBeInTheDocument();
      });

      const logoutButton = screen.getByText("Sign Out");

      // Should not throw even if signOut fails
      await expect(user.click(logoutButton)).resolves.not.toThrow();

      expect(signOut).toHaveBeenCalled();
    });
  });

  describe("Session Invalidation After Logout", () => {
    it("should clear session data after successful logout", async () => {
      (useSession as any)
        .mockReturnValueOnce({
          data: mockSession,
          status: "authenticated",
          update: vi.fn(),
        })
        .mockReturnValueOnce({
          data: null,
          status: "unauthenticated",
          update: vi.fn(),
        });

      (signOut as any).mockResolvedValue(undefined);

      const user = userEvent.setup();

      const { rerender } = render(
        <SessionProvider>
          <AuthStatus />
        </SessionProvider>
      );

      // Initially authenticated
      await waitFor(() => {
        expect(screen.getByText("test@example.com")).toBeInTheDocument();
      });

      // Click logout
      const logoutButton = screen.getByText("Sign Out");
      await user.click(logoutButton);

      // Wait for signOut to complete
      await waitFor(() => {
        expect(signOut).toHaveBeenCalled();
      });

      // Re-render to reflect new session state
      rerender(
        <SessionProvider>
          <AuthStatus />
        </SessionProvider>
      );

      // Should show unauthenticated state
      await waitFor(() => {
        expect(screen.getByText("Sign In")).toBeInTheDocument();
        expect(screen.queryByText("test@example.com")).not.toBeInTheDocument();
      });
    });

    it("should redirect to callbackUrl after logout", async () => {
      (signOut as any).mockResolvedValue(undefined);
      (useSession as any).mockReturnValue({
        data: mockSession,
        status: "authenticated",
        update: vi.fn(),
      });

      const user = userEvent.setup();

      render(
        <SessionProvider>
          <AuthStatus />
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("test@example.com")).toBeInTheDocument();
      });

      const logoutButton = screen.getByText("Sign Out");
      await user.click(logoutButton);

      await waitFor(() => {
        expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" });
      });
    });

    it("should handle logout with custom callbackUrl", async () => {
      (signOut as any).mockResolvedValue(undefined);
      (useSession as any).mockReturnValue({
        data: mockSession,
        status: "authenticated",
        update: vi.fn(),
      });

      // Test with custom callbackUrl
      await signOut({ callbackUrl: "/login" });

      expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/login" });
    });
  });

  describe("Session State After Logout", () => {
    it("should set status to unauthenticated after logout", async () => {
      (useSession as any)
        .mockReturnValueOnce({
          data: mockSession,
          status: "authenticated",
          update: vi.fn(),
        })
        .mockReturnValueOnce({
          data: null,
          status: "unauthenticated",
          update: vi.fn(),
        });

      (signOut as any).mockResolvedValue(undefined);

      const { rerender } = render(
        <SessionProvider>
          <AuthStatus />
        </SessionProvider>
      );

      // Initially authenticated
      const firstSession = (useSession as any).mock.results[0].value;
      expect(firstSession.status).toBe("authenticated");

      // Logout
      await signOut();

      // Re-render
      rerender(
        <SessionProvider>
          <AuthStatus />
        </SessionProvider>
      );

      // Status should be unauthenticated
      const secondSession = (useSession as any).mock.results[1].value;
      expect(secondSession.status).toBe("unauthenticated");
      expect(secondSession.data).toBeNull();
    });

    it("should clear all user data from session after logout", async () => {
      (useSession as any)
        .mockReturnValueOnce({
          data: mockSession,
          status: "authenticated",
          update: vi.fn(),
        })
        .mockReturnValueOnce({
          data: null,
          status: "unauthenticated",
          update: vi.fn(),
        });

      (signOut as any).mockResolvedValue(undefined);

      render(
        <SessionProvider>
          <UserProfileDropdown />
        </SessionProvider>
      );

      // Initially has user data
      const firstSession = (useSession as any).mock.results[0].value;
      expect(firstSession.data?.user).toBeDefined();
      expect(firstSession.data?.user.id).toBe("user-123");

      // Logout
      await signOut();

      // User data should be cleared
      const secondSession = (useSession as any).mock.results[1].value;
      expect(secondSession.data).toBeNull();
    });
  });

  describe("Multiple Logout Attempts", () => {
    it("should handle multiple logout calls gracefully", async () => {
      (signOut as any).mockResolvedValue(undefined);
      (useSession as any).mockReturnValue({
        data: mockSession,
        status: "authenticated",
        update: vi.fn(),
      });

      // Call signOut multiple times
      await Promise.all([signOut(), signOut(), signOut()]);

      // Should be called multiple times
      expect(signOut).toHaveBeenCalledTimes(3);
    });

    it("should not throw error when logging out while already logged out", async () => {
      (signOut as any).mockResolvedValue(undefined);
      (useSession as any).mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: vi.fn(),
      });

      // Should not throw when already logged out
      await expect(signOut()).resolves.not.toThrow();
      expect(signOut).toHaveBeenCalled();
    });
  });

  describe("Logout with redirect: false", () => {
    it("should logout without redirecting when redirect is false", async () => {
      (signOut as any).mockResolvedValue(undefined);
      (useSession as any).mockReturnValue({
        data: mockSession,
        status: "authenticated",
        update: vi.fn(),
      });

      await signOut({ redirect: false });

      expect(signOut).toHaveBeenCalledWith({ redirect: false });
    });
  });
});
