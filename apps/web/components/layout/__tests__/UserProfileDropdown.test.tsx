import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserProfileDropdown } from "../UserProfileDropdown";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

// Mock next/link to render a simple anchor element
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("UserProfileDropdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (usePathname as any).mockReturnValue("/");
    (useSession as any).mockReturnValue({
      data: {
        user: {
          email: "user@medbook.com",
          role: "PATIENT",
          profilePictureUrl: null,
        },
      },
      status: "authenticated",
    });
  });

  it("returns null when there is no authenticated user", () => {
    (useSession as any).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    const { container } = render(<UserProfileDropdown />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders user email and role when session is available", () => {
    render(<UserProfileDropdown />);

    expect(screen.getByText("user@medbook.com")).toBeInTheDocument();
    expect(screen.getByText("PATIENT")).toBeInTheDocument();
  });

  it("opens and closes the dropdown when clicking outside", async () => {
    const user = userEvent.setup();

    render(<UserProfileDropdown />);

    const trigger = screen.getByRole("button", { name: "User menu" });
    await user.click(trigger);

    expect(screen.getByText("View Profile")).toBeInTheDocument();

    await user.click(document.body);

    expect(screen.queryByText("View Profile")).not.toBeInTheDocument();
  });

  it("renders patient-specific navigation links when role is PATIENT", async () => {
    const user = userEvent.setup();

    (usePathname as any).mockReturnValue("/doctors");

    render(<UserProfileDropdown />);

    const trigger = screen.getByRole("button", { name: "User menu" });
    await user.click(trigger);

    const dashboardLink = screen.getByText("Dashboard").closest("a");
    const appointmentsLink = screen.getByText("My Appointments").closest("a");

    expect(dashboardLink).toHaveAttribute("href", "/dashboard/patient");
    expect(appointmentsLink).toHaveAttribute("href", "/appointments");
  });

  it("renders doctor-specific navigation links when role is DOCTOR", async () => {
    const user = userEvent.setup();

    (useSession as any).mockReturnValue({
      data: {
        user: {
          email: "doctor@medbook.com",
          role: "DOCTOR",
          profilePictureUrl: null,
        },
      },
      status: "authenticated",
    });

    (usePathname as any).mockReturnValue("/doctors");

    render(<UserProfileDropdown />);

    const trigger = screen.getByRole("button", { name: "User menu" });
    await user.click(trigger);

    const dashboardLink = screen.getByText("Dashboard").closest("a");
    const appointmentsLink = screen.getByText("My Appointments").closest("a");
    const availabilityLink = screen
      .getByText("Manage Availability")
      .closest("a");

    expect(dashboardLink).toHaveAttribute("href", "/dashboard/doctor");
    expect(appointmentsLink).toHaveAttribute("href", "/appointments");
    expect(availabilityLink).toHaveAttribute(
      "href",
      "/dashboard/doctor/availability"
    );
  });

  it("calls signOut when the Sign Out button is clicked", async () => {
    const user = userEvent.setup();

    render(<UserProfileDropdown />);

    const trigger = screen.getByRole("button", { name: "User menu" });
    await user.click(trigger);

    const signOutButton = screen.getByText("Sign Out");
    await user.click(signOutButton);

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });
});
