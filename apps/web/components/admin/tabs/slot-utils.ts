/**
 * Slot utility helpers for Pick Slots UI.
 * Used for filtering, grouping, and summarizing time slots.
 */

export interface TimeSlot {
  start: string;
  end: string;
  key: string;
}

/** Parse "HH:MM" to minutes since midnight */
function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Check if a slot's start time falls within [start, end) in minutes */
function slotStartInRange(
  slot: TimeSlot,
  startMin: number,
  endMin: number
): boolean {
  const slotMin = parseTimeToMinutes(slot.start);
  if (startMin <= endMin) {
    return slotMin >= startMin && slotMin < endMin;
  }
  // Wraparound range (e.g. 21:00–06:00 = night)
  return slotMin >= startMin || slotMin < endMin;
}

/**
 * Filter slots whose start time falls within [start, end).
 * start/end are "HH:MM" strings.
 */
export function filterSlotsByRange(
  slots: TimeSlot[],
  start: string,
  end: string
): TimeSlot[] {
  const startMin = parseTimeToMinutes(start);
  const endMin = parseTimeToMinutes(end);
  return slots.filter((slot) => slotStartInRange(slot, startMin, endMin));
}

export type SlotGroup = "morning" | "afternoon" | "evening" | "night";

export interface GroupedSlots {
  morning: TimeSlot[];
  afternoon: TimeSlot[];
  evening: TimeSlot[];
  night?: TimeSlot[];
}

/**
 * Group slots into morning (06–12), afternoon (12–17), evening (17–21).
 * If includeNight is true, adds night (21–06).
 */
export function groupSlots(
  slots: TimeSlot[],
  includeNight: boolean
): GroupedSlots {
  const morning = filterSlotsByRange(slots, "06:00", "12:00");
  const afternoon = filterSlotsByRange(slots, "12:00", "17:00");
  const evening = filterSlotsByRange(slots, "17:00", "21:00");
  const result: GroupedSlots = { morning, afternoon, evening };
  if (includeNight) {
    // Night: 21:00 to 06:00 (wraps)
    result.night = slots.filter((slot) => {
      const m = parseTimeToMinutes(slot.start);
      return m >= 21 * 60 || m < 6 * 60;
    });
  }
  return result;
}

/**
 * Compute summary: count of selected slots and total hours.
 * Uses slotDurationMinutes for each slot (assumes uniform duration).
 */
export function calcSelectedSummary(
  selectedSlotKeys: Set<string>,
  slotDurationMinutes: number
): { count: number; hours: number } {
  const count = selectedSlotKeys.size;
  const hours = (count * slotDurationMinutes) / 60;
  return { count, hours };
}

/** Default visible range: 06:00 to 21:00 */
export const DEFAULT_VISIBLE_START = "06:00";
export const DEFAULT_VISIBLE_END = "21:00";
