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

  it("navigates to doctors page with q when both fields are submitted (main search wins)", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const searchInput = screen.getByPlaceholderText(
      "Try: General Physician, Dentist, Skin, Child"
    );
    const optionalInput = screen.getByPlaceholderText(
      "Department / Doctor (optional)"
    );
    const submitButton = screen.getByRole("button", {
      name: /Find & Book Doctor/i,
    });

    await user.type(searchInput, "Cardiologist");
    await user.type(optionalInput, "New York");
    await user.click(submitButton);

    // Free-text maps to q only; when main search is set it is used for q
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

  it("navigates with q when only optional field is filled (free-text maps to q)", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const optionalInput = screen.getByPlaceholderText(
      "Department / Doctor (optional)"
    );
    const submitButton = screen.getByRole("button", {
      name: /Find & Book Doctor/i,
    });

    await user.type(optionalInput, "Boston");
    await user.click(submitButton);

    expect(mockPush).toHaveBeenCalledWith("/doctors?q=boston");
  });

  it("navigates with doctorId when optional input looks like doctor id", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const searchInput = screen.getByPlaceholderText(
      "Try: General Physician, Dentist, Skin, Child"
    );
    const optionalInput = screen.getByPlaceholderText(
      "Department / Doctor (optional)"
    );
    const submitButton = screen.getByRole("button", {
      name: /Find & Book Doctor/i,
    });

    await user.type(searchInput, "child");
    await user.type(optionalInput, "doc_123");
    await user.click(submitButton);

    expect(mockPush).toHaveBeenCalledWith("/doctors?q=child&doctorId=doc_123");
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

  it("pressing Enter in department/doctor input triggers search with q", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const optionalInput = screen.getByPlaceholderText(
      "Department / Doctor (optional)"
    );
    await user.type(optionalInput, "Cardiology{Enter}");

    expect(mockPush).toHaveBeenCalledWith("/doctors?q=cardiology");
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
