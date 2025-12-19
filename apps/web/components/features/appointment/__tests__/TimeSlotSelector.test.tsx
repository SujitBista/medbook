/**
 * Tests for TimeSlotSelector component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimeSlotSelector } from "../TimeSlotSelector";
import { TimeSlot } from "../utils";

describe("TimeSlotSelector", () => {
  const mockOnSelectSlot = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading message when loading", () => {
    render(
      <TimeSlotSelector
        slots={[]}
        selectedSlot={null}
        onSelectSlot={mockOnSelectSlot}
        loading={true}
      />
    );

    expect(screen.getByText(/Loading available slots.../i)).toBeInTheDocument();
  });

  it("shows empty state when no slots available", () => {
    render(
      <TimeSlotSelector
        slots={[]}
        selectedSlot={null}
        onSelectSlot={mockOnSelectSlot}
        loading={false}
      />
    );

    expect(screen.getByText(/No Available Time Slots/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /This doctor currently has no available appointment slots/i
      )
    ).toBeInTheDocument();
  });

  it("renders slots grouped by date", () => {
    const slots: TimeSlot[] = [
      {
        id: "slot-1",
        startTime: new Date("2024-12-20T10:00:00Z"),
        endTime: new Date("2024-12-20T10:30:00Z"),
        availabilityId: "avail-1",
      },
      {
        id: "slot-2",
        startTime: new Date("2024-12-20T11:00:00Z"),
        endTime: new Date("2024-12-20T11:30:00Z"),
        availabilityId: "avail-1",
      },
      {
        id: "slot-3",
        startTime: new Date("2024-12-21T10:00:00Z"),
        endTime: new Date("2024-12-21T10:30:00Z"),
        availabilityId: "avail-2",
      },
    ];

    render(
      <TimeSlotSelector
        slots={slots}
        selectedSlot={null}
        onSelectSlot={mockOnSelectSlot}
        loading={false}
      />
    );

    // Should show date headers for each unique date
    expect(screen.getByText(/Friday, December 20, 2024/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Saturday, December 21, 2024/i)
    ).toBeInTheDocument();
  });

  it("calls onSelectSlot when a slot is clicked", async () => {
    const user = userEvent.setup();
    const slot: TimeSlot = {
      id: "slot-1",
      startTime: new Date("2024-12-20T10:00:00Z"),
      endTime: new Date("2024-12-20T10:30:00Z"),
      availabilityId: "avail-1",
    };

    render(
      <TimeSlotSelector
        slots={[slot]}
        selectedSlot={null}
        onSelectSlot={mockOnSelectSlot}
        loading={false}
      />
    );

    // Find the button for the time slot (formatted time could be "10:00 AM" or "3:45 PM" depending on timezone)
    // Use a more flexible matcher
    const slotButton = screen.getByRole("button");
    await user.click(slotButton);

    expect(mockOnSelectSlot).toHaveBeenCalledTimes(1);
    expect(mockOnSelectSlot).toHaveBeenCalledWith(slot);
  });

  it("highlights selected slot", () => {
    const slot: TimeSlot = {
      id: "slot-1",
      startTime: new Date("2024-12-20T10:00:00Z"),
      endTime: new Date("2024-12-20T10:30:00Z"),
      availabilityId: "avail-1",
    };

    render(
      <TimeSlotSelector
        slots={[slot]}
        selectedSlot={slot}
        onSelectSlot={mockOnSelectSlot}
        loading={false}
      />
    );

    const slotButton = screen.getByRole("button");
    // Selected slot should have primary variant styling (check for primary classes)
    expect(slotButton.className).toMatch(/primary|bg-primary/);
  });

  it("renders multiple slots for the same date", () => {
    const slots: TimeSlot[] = [
      {
        id: "slot-1",
        startTime: new Date("2024-12-20T10:00:00Z"),
        endTime: new Date("2024-12-20T10:30:00Z"),
        availabilityId: "avail-1",
      },
      {
        id: "slot-2",
        startTime: new Date("2024-12-20T11:00:00Z"),
        endTime: new Date("2024-12-20T11:30:00Z"),
        availabilityId: "avail-1",
      },
      {
        id: "slot-3",
        startTime: new Date("2024-12-20T14:00:00Z"),
        endTime: new Date("2024-12-20T14:30:00Z"),
        availabilityId: "avail-1",
      },
    ];

    render(
      <TimeSlotSelector
        slots={slots}
        selectedSlot={null}
        onSelectSlot={mockOnSelectSlot}
        loading={false}
      />
    );

    // Should show all three time slots (check by count, time format may vary by timezone)
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it("handles slots without IDs", () => {
    const slot: TimeSlot = {
      startTime: new Date("2024-12-20T10:00:00Z"),
      endTime: new Date("2024-12-20T10:30:00Z"),
      availabilityId: "avail-1",
    };

    render(
      <TimeSlotSelector
        slots={[slot]}
        selectedSlot={null}
        onSelectSlot={mockOnSelectSlot}
        loading={false}
      />
    );

    // Should render at least one button (time format may vary by timezone)
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
