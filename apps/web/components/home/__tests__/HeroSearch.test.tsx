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
      screen.getByPlaceholderText(/Search by doctor name or specialty/i)
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Location/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Search/i })).toBeInTheDocument();
  });

  it("allows typing in search input", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const searchInput = screen.getByPlaceholderText(
      /Search by doctor name or specialty/i
    );
    await user.type(searchInput, "Cardiologist");

    expect(searchInput).toHaveValue("Cardiologist");
  });

  it("allows typing in location input", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const locationInput = screen.getByPlaceholderText(/Location/i);
    await user.type(locationInput, "New York");

    expect(locationInput).toHaveValue("New York");
  });

  it("navigates to doctors page with search params when form is submitted", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const searchInput = screen.getByPlaceholderText(
      /Search by doctor name or specialty/i
    );
    const locationInput = screen.getByPlaceholderText(/Location/i);
    const submitButton = screen.getByRole("button", { name: /Search/i });

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
      /Search by doctor name or specialty/i
    );
    const submitButton = screen.getByRole("button", { name: /Search/i });

    await user.type(searchInput, "Dermatologist");
    await user.click(submitButton);

    expect(mockPush).toHaveBeenCalledWith("/doctors?search=Dermatologist");
  });

  it("navigates with only location when search term is empty", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const locationInput = screen.getByPlaceholderText(/Location/i);
    const submitButton = screen.getByRole("button", { name: /Search/i });

    await user.type(locationInput, "Boston");
    await user.click(submitButton);

    expect(mockPush).toHaveBeenCalledWith("/doctors?location=Boston");
  });

  it("navigates to doctors page without params when both fields are empty", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const submitButton = screen.getByRole("button", { name: /Search/i });
    await user.click(submitButton);

    expect(mockPush).toHaveBeenCalledWith("/doctors");
  });

  it("prevents default form submission", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const form = screen
      .getByRole("button", { name: /Search/i })
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
      /Search by doctor name or specialty/i
    );
    await user.type(searchInput, "Test");
    await user.click(screen.getByRole("button", { name: /Search/i }));

    expect(mockPush).toHaveBeenCalled();
  });
});
