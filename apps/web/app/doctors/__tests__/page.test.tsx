/**
 * Tests for Doctors Listing Page (Task 4.7)
 * Tests the public doctor listing page with search and filtering
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DoctorsPage from "../page";
import { Doctor } from "@medbook/types";
import React from "react";

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
  })),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Mock SWR - create a proper hook that uses React hooks
// This satisfies React's rules of hooks
function useSWR(key: string, fetcher: any) {
  const [data, setData] = React.useState<any>(undefined);
  const [error, setError] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (fetcher && typeof fetcher === "function") {
      let cancelled = false;
      setIsLoading(true);
      setError(null);
      fetcher(key)
        .then((result: any) => {
          if (!cancelled) {
            setData(result);
            setIsLoading(false);
          }
        })
        .catch((err: any) => {
          if (!cancelled) {
            setError(err);
            setIsLoading(false);
          }
        });
      return () => {
        cancelled = true;
      };
    } else {
      setIsLoading(false);
    }
  }, [key, fetcher]);

  const mutate = React.useCallback(() => {
    if (fetcher && typeof fetcher === "function") {
      setIsLoading(true);
      setError(null);
      return fetcher(key)
        .then((result: any) => {
          setData(result);
          setIsLoading(false);
          return result;
        })
        .catch((err: any) => {
          setError(err);
          setIsLoading(false);
          throw err;
        });
    }
    return Promise.resolve();
  }, [key, fetcher]);

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}

vi.mock("swr", () => ({
  default: useSWR,
}));

// Mock fetch globally
global.fetch = vi.fn();

describe("DoctorsPage", () => {
  const mockDoctors: Doctor[] = [
    {
      id: "doctor-1",
      userId: "user-1",
      specialization: "Cardiology",
      bio: "Experienced cardiologist",
      userEmail: "doctor1@medbook.com",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
    },
    {
      id: "doctor-2",
      userId: "user-2",
      specialization: "Dermatology",
      bio: "Skin specialist",
      userEmail: "doctor2@medbook.com",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
    },
    {
      id: "doctor-3",
      userId: "user-3",
      specialization: "Cardiology",
      bio: "Another cardiologist",
      userEmail: "doctor3@medbook.com",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
    },
  ];

  const mockSession = {
    user: {
      id: "patient-123",
      email: "patient@medbook.com",
      role: "PATIENT",
    },
    expires: "2024-12-31",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useSession as any).mockReturnValue({
      data: mockSession,
      status: "authenticated",
    });
    (useRouter as any).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      refresh: vi.fn(),
    });
    // Mock window.scrollTo
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("should render hero section", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          pagination: {
            page: 1,
            limit: 12,
            total: 0,
            totalPages: 0,
          },
        }),
      });

      render(<DoctorsPage />);

      await waitFor(() => {
        expect(screen.getByText("Find Your Doctor")).toBeInTheDocument();
      });
    });

    it("should display search form", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          pagination: {
            page: 1,
            limit: 12,
            total: 0,
            totalPages: 0,
          },
        }),
      });

      render(<DoctorsPage />);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Search doctors...")
        ).toBeInTheDocument();
        expect(screen.getByText("Search")).toBeInTheDocument();
      });
    });

    it("should display list of doctors", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockDoctors,
          pagination: {
            page: 1,
            limit: 12,
            total: 3,
            totalPages: 1,
          },
        }),
      });

      render(<DoctorsPage />);

      await waitFor(() => {
        expect(screen.getByText("doctor1@medbook.com")).toBeInTheDocument();
        expect(screen.getByText("doctor2@medbook.com")).toBeInTheDocument();
        expect(screen.getByText("doctor3@medbook.com")).toBeInTheDocument();
      });
    });

    it("should display doctor specializations", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockDoctors,
          pagination: {
            page: 1,
            limit: 12,
            total: 3,
            totalPages: 1,
          },
        }),
      });

      render(<DoctorsPage />);

      // Wait for doctors to load first
      await waitFor(
        () => {
          expect(screen.getByText("doctor1@medbook.com")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Specializations appear in the doctor cards (they're displayed as text in the cards)
      await waitFor(
        () => {
          // Specializations are shown in the doctor cards
          // There might be multiple instances (in cards and dropdown), so use getAllByText
          const cardiologyElements = screen.getAllByText("Cardiology");
          expect(cardiologyElements.length).toBeGreaterThan(0);
          const dermatologyElements = screen.getAllByText("Dermatology");
          expect(dermatologyElements.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );
    });

    it("should display doctor bios", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockDoctors,
          pagination: {
            page: 1,
            limit: 12,
            total: 3,
            totalPages: 1,
          },
        }),
      });

      render(<DoctorsPage />);

      await waitFor(() => {
        expect(
          screen.getByText("Experienced cardiologist")
        ).toBeInTheDocument();
        expect(screen.getByText("Skin specialist")).toBeInTheDocument();
      });
    });
  });

  describe("Search Functionality", () => {
    it("should search doctors by name", async () => {
      const user = userEvent.setup();

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockDoctors,
            pagination: {
              page: 1,
              limit: 12,
              total: 3,
              totalPages: 1,
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [mockDoctors[0]],
            pagination: {
              page: 1,
              limit: 12,
              total: 1,
              totalPages: 1,
            },
          }),
        });

      render(<DoctorsPage />);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Search doctors...")
        ).toBeInTheDocument();
      });

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText("doctor1@medbook.com")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search doctors...");
      await user.clear(searchInput);
      await user.type(searchInput, "doctor1");

      const searchButton = screen.getByText("Search");
      await user.click(searchButton);

      // Wait for the search to complete - check that fetch was called with search parameter
      await waitFor(
        () => {
          const fetchCalls = (global.fetch as any).mock.calls;
          const hasSearchCall = fetchCalls.some(
            (call: any[]) =>
              call[0] &&
              typeof call[0] === "string" &&
              call[0].includes("search=doctor1")
          );
          expect(hasSearchCall).toBe(true);
        },
        { timeout: 3000 }
      );
    });
  });

  describe("Filtering", () => {
    it("should filter doctors by specialization", async () => {
      const user = userEvent.setup();

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockDoctors,
            pagination: {
              page: 1,
              limit: 12,
              total: 3,
              totalPages: 1,
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [mockDoctors[0], mockDoctors[2]],
            pagination: {
              page: 1,
              limit: 12,
              total: 2,
              totalPages: 1,
            },
          }),
        });

      render(<DoctorsPage />);

      // Wait for doctors to load first
      await waitFor(
        () => {
          expect(screen.getByText("doctor1@medbook.com")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Wait for specialization dropdown to be populated (options are generated from doctors)
      await waitFor(
        () => {
          const specializationSelect = screen.getByDisplayValue(
            "All Specializations"
          );
          // Check that Cardiology option exists in the select
          const options = Array.from(
            specializationSelect.querySelectorAll("option")
          );
          const hasCardiology = options.some(
            (opt) => opt.textContent === "Cardiology"
          );
          expect(hasCardiology).toBe(true);
        },
        { timeout: 3000 }
      );

      const specializationSelect = screen.getByDisplayValue(
        "All Specializations"
      );
      await user.selectOptions(specializationSelect, "Cardiology");

      await waitFor(
        () => {
          const fetchCalls = (global.fetch as any).mock.calls;
          const hasSpecializationCall = fetchCalls.some(
            (call: any[]) =>
              call[0] &&
              typeof call[0] === "string" &&
              call[0].includes("specialization=Cardiology")
          );
          expect(hasSpecializationCall).toBe(true);
        },
        { timeout: 3000 }
      );
    });
  });

  describe("Pagination", () => {
    it("should display pagination when there are multiple pages", async () => {
      const manyDoctors = Array.from({ length: 25 }, (_, i) => ({
        ...mockDoctors[0],
        id: `doctor-${i}`,
        userEmail: `doctor${i}@medbook.com`,
      }));

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: manyDoctors.slice(0, 12),
          pagination: {
            page: 1,
            limit: 12,
            total: 25,
            totalPages: 3,
          },
        }),
      });

      render(<DoctorsPage />);

      // Wait for doctors to load first (check for any doctor email)
      await waitFor(
        () => {
          expect(screen.getByText("doctor0@medbook.com")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Wait for the "Showing X of Y doctors" text
      await waitFor(
        () => {
          expect(
            screen.getByText(/Showing 12 of 25 doctors/i)
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Then check for pagination buttons
      await waitFor(
        () => {
          expect(screen.getByText("Previous")).toBeInTheDocument();
          expect(screen.getByText("Next")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should navigate to next page", { timeout: 15000 }, async () => {
      const user = userEvent.setup();

      // Mock fetch for initial load (page 1)
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockDoctors,
          pagination: {
            page: 1,
            limit: 12,
            total: 25,
            totalPages: 3,
          },
        }),
      });

      // Mock fetch for page 2
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          pagination: {
            page: 2,
            limit: 12,
            total: 25,
            totalPages: 3,
          },
        }),
      });

      render(<DoctorsPage />);

      // Wait for initial render with page 1 data
      await waitFor(
        () => {
          expect(screen.getByText("Next")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Click next button
      const nextButton = screen.getByText("Next");
      await user.click(nextButton);

      // Wait for UI to show page 2 is active (button "2" should have primary variant)
      // Since we can't easily check button variants, wait for the fetch to complete
      // by checking that the component has updated with new pagination data
      await waitFor(
        () => {
          // Check that fetch was called with page=2 in URL
          const fetchCalls = (global.fetch as any).mock.calls;
          const hasPage2Call = fetchCalls.some(
            (call: unknown[]) =>
              call[0] &&
              typeof call[0] === "string" &&
              call[0].includes("page=2")
          );
          expect(hasPage2Call).toBe(true);
        },
        { timeout: 5000 }
      );
    });
  });

  describe("Empty State", () => {
    it("should show empty state when no doctors found", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          pagination: {
            page: 1,
            limit: 12,
            total: 0,
            totalPages: 0,
          },
        }),
      });

      render(<DoctorsPage />);

      await waitFor(() => {
        expect(screen.getByText("No doctors found")).toBeInTheDocument();
        expect(
          screen.getByText("No doctors are currently available.")
        ).toBeInTheDocument();
      });
    });

    it("should show clear filters button when filters are applied", async () => {
      const user = userEvent.setup();

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockDoctors,
            pagination: {
              page: 1,
              limit: 12,
              total: 3,
              totalPages: 1,
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [],
            pagination: {
              page: 1,
              limit: 12,
              total: 0,
              totalPages: 0,
            },
          }),
        });

      render(<DoctorsPage />);

      // Wait for doctors to load first
      await waitFor(
        () => {
          expect(screen.getByText("doctor1@medbook.com")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Wait for specialization dropdown to be populated
      await waitFor(
        () => {
          const specializationSelect = screen.getByDisplayValue(
            "All Specializations"
          );
          const options = Array.from(
            specializationSelect.querySelectorAll("option")
          );
          const hasCardiology = options.some(
            (opt) => opt.textContent === "Cardiology"
          );
          expect(hasCardiology).toBe(true);
        },
        { timeout: 3000 }
      );

      const specializationSelect = screen.getByDisplayValue(
        "All Specializations"
      );
      await user.selectOptions(specializationSelect, "Cardiology");

      // Wait for the filter to be applied and clear filters button to appear
      await waitFor(
        () => {
          expect(screen.getByText("Clear filters")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe("Authentication States", () => {
    it("should show sign in buttons for unauthenticated users", async () => {
      (useSession as any).mockReturnValue({
        data: null,
        status: "unauthenticated",
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockDoctors,
          pagination: {
            page: 1,
            limit: 12,
            total: 3,
            totalPages: 1,
          },
        }),
      });

      render(<DoctorsPage />);

      // Wait for page to load - hero section appears immediately
      await waitFor(
        () => {
          expect(screen.getByText("Find Your Doctor")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Check for sign in buttons in header (they should be visible immediately)
      // The header is rendered before the doctors list loads
      // "Sign In" might appear multiple times (header and CTA section), so use getAllByText
      const signInButtons = screen.getAllByText("Sign In");
      expect(signInButtons.length).toBeGreaterThan(0);
      expect(screen.getByText("Get Started")).toBeInTheDocument();
    });

    it("should show dashboard button for authenticated users", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockDoctors,
          pagination: {
            page: 1,
            limit: 12,
            total: 3,
            totalPages: 1,
          },
        }),
      });

      render(<DoctorsPage />);

      await waitFor(() => {
        expect(screen.getByText("Dashboard")).toBeInTheDocument();
      });
    });

    it("should show 'Book Appointment' button for authenticated patients", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockDoctors,
          pagination: {
            page: 1,
            limit: 12,
            total: 3,
            totalPages: 1,
          },
        }),
      });

      render(<DoctorsPage />);

      await waitFor(() => {
        const bookButtons = screen.getAllByText("Book Appointment");
        expect(bookButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Error Handling", () => {
    it("should display error message when API call fails", async () => {
      // Mock fetch to return a response with ok: false
      // The component checks response.ok and response.statusText
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
        json: async () => ({
          success: false,
          error: { message: "Failed to fetch doctors" },
        }),
      });

      render(<DoctorsPage />);

      // Wait for error to appear - the error message format is "Failed to fetch doctors: {statusText}"
      await waitFor(
        () => {
          // The error message should contain "Failed to fetch doctors" or "Failed to load doctors"
          const errorText =
            screen.queryByText(/Failed to fetch doctors/i) ||
            screen.queryByText(/Failed to load doctors/i);
          expect(errorText).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Check for retry button (it should appear with the error)
      await waitFor(
        () => {
          expect(screen.getByText("Retry")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should retry fetching when retry button is clicked", async () => {
      const user = userEvent.setup();

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          statusText: "Internal Server Error",
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [],
            pagination: {
              page: 1,
              limit: 12,
              total: 0,
              totalPages: 0,
            },
          }),
        });

      render(<DoctorsPage />);

      await waitFor(() => {
        expect(screen.getByText("Retry")).toBeInTheDocument();
      });

      const retryButton = screen.getByText("Retry");
      await user.click(retryButton);

      // Wait for the retry to complete - check that fetch was called again
      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalledTimes(2);
        },
        { timeout: 3000 }
      );
    });
  });
});
