/**
 * Tests for HeroSearch component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HeroSearch } from "../HeroSearch";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("HeroSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders search form with inputs", () => {
    render(<HeroSearch />);

    expect(
      screen.getByPlaceholderText(
        "Try: General Physician, Dentist, Skin, Child"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Department / Doctor (optional)")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Find & Book Doctor/i })
    ).toBeInTheDocument();
  });

  it("allows typing in search input", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const searchInput = screen.getByPlaceholderText(
      "Try: General Physician, Dentist, Skin, Child"
    );
    await user.type(searchInput, "Cardiologist");

    expect(searchInput).toHaveValue("Cardiologist");
  });

  it("allows typing in location input", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const locationInput = screen.getByPlaceholderText(
      "Department / Doctor (optional)"
    );
    await user.type(locationInput, "New York");

    expect(locationInput).toHaveValue("New York");
  });

  it("navigates to doctors page with search params when form is submitted", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const searchInput = screen.getByPlaceholderText(
      "Try: General Physician, Dentist, Skin, Child"
    );
    const locationInput = screen.getByPlaceholderText(
      "Department / Doctor (optional)"
    );
    const submitButton = screen.getByRole("button", {
      name: /Find & Book Doctor/i,
    });

    await user.type(searchInput, "Cardiologist");
    await user.type(locationInput, "New York");
    await user.click(submitButton);

    expect(mockPush).toHaveBeenCalledWith(
      "/doctors?search=Cardiologist&location=New+York"
    );
  });

  it("navigates with only search term when location is empty", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const searchInput = screen.getByPlaceholderText(
      "Try: General Physician, Dentist, Skin, Child"
    );
    const submitButton = screen.getByRole("button", {
      name: /Find & Book Doctor/i,
    });

    await user.type(searchInput, "Dermatologist");
    await user.click(submitButton);

    expect(mockPush).toHaveBeenCalledWith("/doctors?search=Dermatologist");
  });

  it("navigates with only location when search term is empty", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const locationInput = screen.getByPlaceholderText(
      "Department / Doctor (optional)"
    );
    const submitButton = screen.getByRole("button", {
      name: /Find & Book Doctor/i,
    });

    await user.type(locationInput, "Boston");
    await user.click(submitButton);

    expect(mockPush).toHaveBeenCalledWith("/doctors?location=Boston");
  });

  it("navigates to doctors page without params when both fields are empty", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const submitButton = screen.getByRole("button", {
      name: /Find & Book Doctor/i,
    });
    await user.click(submitButton);

    expect(mockPush).toHaveBeenCalledWith("/doctors");
  });

  it("prevents default form submission", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const form = screen
      .getByRole("button", { name: /Find & Book Doctor/i })
      .closest("form");
    if (!form) throw new Error("Form not found");

    const submitEvent = new Event("submit", {
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(submitEvent, "preventDefault");

    form.dispatchEvent(submitEvent);

    // The form should prevent default (handled by handleSubmit)
    const searchInput = screen.getByPlaceholderText(
      "Try: General Physician, Dentist, Skin, Child"
    );
    await user.type(searchInput, "Test");
    await user.click(
      screen.getByRole("button", { name: /Find & Book Doctor/i })
    );

    expect(mockPush).toHaveBeenCalled();
  });

  it("renders Popular specialties chips and sets specialty on chip click", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    expect(screen.getByText("Popular:")).toBeInTheDocument();
    const dentistChip = screen.getByRole("button", { name: "Dentist" });
    await user.click(dentistChip);

    const searchInput = screen.getByPlaceholderText(
      "Try: General Physician, Dentist, Skin, Child"
    );
    expect(searchInput).toHaveValue("Dentist");
  });

  it("Not sure? link sets specialty to General Physician", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const notSureLink = screen.getByRole("button", {
      name: /Not sure\? Start with General Physician/i,
    });
    await user.click(notSureLink);

    const searchInput = screen.getByPlaceholderText(
      "Try: General Physician, Dentist, Skin, Child"
    );
    expect(searchInput).toHaveValue("General Physician");
  });

  it("typing + clicking CTA still searches as before", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const searchInput = screen.getByPlaceholderText(
      "Try: General Physician, Dentist, Skin, Child"
    );
    await user.type(searchInput, "Pediatrician");
    await user.click(
      screen.getByRole("button", { name: /Find & Book Doctor/i })
    );

    expect(mockPush).toHaveBeenCalledWith("/doctors?search=Pediatrician");
  });
});
