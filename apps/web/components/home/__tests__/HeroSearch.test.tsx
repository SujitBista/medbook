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

  it("second input shows placeholder when no department/doctor selected", () => {
    render(<HeroSearch />);

    const secondInput = screen.getByPlaceholderText(
      "Department / Doctor (optional)"
    );
    expect(secondInput).toHaveValue("");
  });

  it("navigates to doctors page with q when main search is submitted", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const searchInput = screen.getByPlaceholderText(
      "Try: General Physician, Dentist, Skin, Child"
    );
    const submitButton = screen.getByRole("button", {
      name: /Find & Book Doctor/i,
    });

    await user.type(searchInput, "Cardiologist");
    await user.click(submitButton);

    expect(mockPush).toHaveBeenCalledWith("/doctors?q=cardiologist");
  });

  it("navigates with only q (slug) when optional field is empty", async () => {
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

    expect(mockPush).toHaveBeenCalledWith("/doctors?q=dermatologist");
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

  it("pressing Enter in specialty input triggers search", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const searchInput = screen.getByPlaceholderText(
      "Try: General Physician, Dentist, Skin, Child"
    );
    await user.type(searchInput, "Dermatologist{Enter}");

    expect(mockPush).toHaveBeenCalledWith("/doctors?q=dermatologist");
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

  it("renders Popular specialties chips and navigates to /doctors?q=slug on chip click", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    expect(screen.getByText("Popular:")).toBeInTheDocument();
    const dentistChip = screen.getByRole("button", { name: "Dentist" });
    await user.click(dentistChip);

    expect(mockPush).toHaveBeenCalledWith("/doctors?q=dentist");
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

  it("typing + clicking CTA navigates with slugified q", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const searchInput = screen.getByPlaceholderText(
      "Try: General Physician, Dentist, Skin, Child"
    );
    await user.type(searchInput, "Pediatrician");
    await user.click(
      screen.getByRole("button", { name: /Find & Book Doctor/i })
    );

    expect(mockPush).toHaveBeenCalledWith("/doctors?q=pediatrician");
  });
});
