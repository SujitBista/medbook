import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DoctorCard } from "../DoctorCard";

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

describe("DoctorCard", () => {
  const baseProps = {
    id: "doctor-1",
    name: "Dr. John Smith",
    specialization: "Cardiology",
    experience: "10 years",
    rating: 4.5,
    bio: "Experienced cardiologist with a focus on preventive care.",
  } as const;

  it("renders doctor information", () => {
    render(<DoctorCard {...baseProps} />);

    expect(screen.getByText("Dr. John Smith")).toBeInTheDocument();
    expect(screen.getByText("Cardiology")).toBeInTheDocument();
    expect(screen.getByText(/10 years/i)).toBeInTheDocument();
    expect(screen.getByText("4.5")).toBeInTheDocument();
  });

  it("renders initials avatar when no imageUrl is provided", () => {
    render(<DoctorCard {...baseProps} />);

    // Initials are computed from the name (first letters of each word)
    expect(screen.getByText("DJ")).toBeInTheDocument();
  });

  it("renders image when imageUrl is provided", () => {
    render(<DoctorCard {...baseProps} imageUrl="/doctor.jpg" />);

    const img = screen.getByRole("img", { name: "Dr. John Smith" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/doctor.jpg");
  });

  it("links actions to the doctor details page", () => {
    render(<DoctorCard {...baseProps} />);

    const viewProfileLink = screen.getByText("View Profile").closest("a");
    const bookNowLink = screen.getByText("Book Now").closest("a");

    expect(viewProfileLink).toHaveAttribute("href", "/doctors/doctor-1");
    expect(bookNowLink).toHaveAttribute("href", "/doctors/doctor-1");
  });
});
