import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "../Footer";

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

describe("Footer", () => {
  it("renders brand and description", () => {
    render(<Footer />);

    expect(screen.getByText("MedBook")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Your trusted platform for managing healthcare appointments/i
      )
    ).toBeInTheDocument();
  });

  it("renders social media links with accessible labels", () => {
    render(<Footer />);

    expect(screen.getByLabelText("Facebook")).toBeInTheDocument();
    expect(screen.getByLabelText("Twitter")).toBeInTheDocument();
    expect(screen.getByLabelText("LinkedIn")).toBeInTheDocument();
  });

  it("renders key navigation links", () => {
    render(<Footer />);

    expect(screen.getByText("Browse Doctors")).toBeInTheDocument();
    expect(screen.getByText("My Appointments")).toBeInTheDocument();
    expect(screen.getByText("Help Center")).toBeInTheDocument();
    expect(screen.getAllByText("Privacy Policy").length).toBeGreaterThan(0);
  });

  it("shows the current year in the copyright text", () => {
    const currentYear = new Date().getFullYear();

    render(<Footer />);

    const copyright = screen.getByText(/MedBook. All rights reserved./i);
    expect(copyright).toHaveTextContent(String(currentYear));
  });
});
