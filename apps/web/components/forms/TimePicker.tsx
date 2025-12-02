"use client";

import React, { useEffect, useRef, useState } from "react";

interface TimePickerProps {
  value: string; // Format: "HH:mm" (24-hour format)
  onChange: (time: string) => void;
  id?: string;
  name?: string;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

interface ScrollablePickerProps {
  items: Array<{ value: string; label: string; display?: string }>;
  value: string;
  onChange: (value: string) => void;
  itemHeight?: number;
  visibleItems?: number;
}

/**
 * Scrollable wheel picker component
 */
function ScrollablePicker({
  items,
  value,
  onChange,
  itemHeight = 40,
  visibleItems = 5,
}: ScrollablePickerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  const selectedIndex = items.findIndex((item) => item.value === value);
  const centerOffset = Math.floor(visibleItems / 2) * itemHeight;

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Scroll to selected item on mount or value change
    const targetScroll = selectedIndex * itemHeight;
    container.scrollTop = targetScroll;
  }, [value, selectedIndex, itemHeight]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    setIsScrolling(true);

    // Clear previous timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    const scrollTop = scrollContainerRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1));

    if (items[clampedIndex]?.value !== value) {
      onChange(items[clampedIndex].value);
    }

    // Debounce snap to item
    scrollTimeoutRef.current = setTimeout(() => {
      if (scrollContainerRef.current) {
        const currentScrollTop = scrollContainerRef.current.scrollTop;
        const currentIndex = Math.round(currentScrollTop / itemHeight);
        const finalIndex = Math.max(
          0,
          Math.min(currentIndex, items.length - 1)
        );

        scrollContainerRef.current.scrollTo({
          top: finalIndex * itemHeight,
          behavior: "smooth",
        });
      }
      setIsScrolling(false);
    }, 150);
  };

  const handleItemClick = (index: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: index * itemHeight,
        behavior: "smooth",
      });
    }
    onChange(items[index].value);
  };

  return (
    <div className="relative">
      {/* Top fade overlay */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 h-16 bg-gradient-to-b from-white to-transparent" />

      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="scrollbar-hide overflow-y-auto rounded-md border border-gray-300 bg-white shadow-sm"
        style={{
          height: `${visibleItems * itemHeight}px`,
        }}
      >
        {/* Spacer for centering */}
        <div style={{ height: `${centerOffset}px` }} />

        {/* Items */}
        {items.map((item, index) => {
          const isSelected = item.value === value;
          const distanceFromCenter = Math.abs(index - selectedIndex);
          const opacity =
            distanceFromCenter === 0
              ? 1
              : Math.max(0.4, 1 - distanceFromCenter * 0.2);
          const scale =
            distanceFromCenter === 0
              ? 1
              : Math.max(0.9, 1 - distanceFromCenter * 0.03);

          return (
            <div
              key={item.value}
              onClick={() => handleItemClick(index)}
              className={`flex cursor-pointer items-center justify-center transition-all duration-200 ${
                isSelected
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
              style={{
                height: `${itemHeight}px`,
                opacity,
                transform: `scale(${scale})`,
              }}
            >
              <span className={`text-sm ${isSelected ? "text-blue-700" : ""}`}>
                {item.label}
              </span>
            </div>
          );
        })}

        {/* Bottom spacer for centering */}
        <div style={{ height: `${centerOffset}px` }} />
      </div>

      {/* Bottom fade overlay */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-16 bg-gradient-to-t from-white to-transparent" />

      {/* Center indicator line */}
      <div
        className="pointer-events-none absolute left-0 right-0 z-20 flex items-center border-t-2 border-b-2 border-blue-500"
        style={{
          top: `${centerOffset}px`,
          height: `${itemHeight}px`,
        }}
      />
    </div>
  );
}

/**
 * TimePicker component with scrollable wheel interface
 * Uses 24-hour format (00:00 to 23:59)
 */
export function TimePicker({
  value,
  onChange,
  id,
  name,
  label,
  required = false,
  error,
  disabled = false,
}: TimePickerProps) {
  // Parse current value or default to "00:00"
  const [hours, minutes] = value ? value.split(":") : ["00", "00"];
  const currentHour = hours || "00";
  const currentMinute = minutes || "00";

  // Generate hour options (00-23) with 12-hour format display
  const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = String(i).padStart(2, "0");
    const displayHour = i === 0 ? "12" : i > 12 ? String(i - 12) : String(i);
    const amPm = i < 12 ? "AM" : "PM";
    return {
      value: hour,
      label: hour,
      display: `${displayHour} ${amPm}`,
      fullLabel: `${hour} (${displayHour} ${amPm})`,
    };
  });

  // Generate minute options (00-59)
  const minuteOptions = Array.from({ length: 60 }, (_, i) => {
    const minute = String(i).padStart(2, "0");
    return {
      value: minute,
      label: minute,
    };
  });

  const handleHourChange = (newHour: string) => {
    onChange(`${newHour}:${currentMinute}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    onChange(`${currentHour}:${newMinute}`);
  };

  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="flex items-start gap-3">
        {/* Hour Picker */}
        <div className="flex-1">
          <div className="mb-1 text-center text-xs font-medium text-gray-600">
            Hour (24h)
          </div>
          <ScrollablePicker
            items={hourOptions.map((opt) => ({
              value: opt.value,
              label: opt.fullLabel,
            }))}
            value={currentHour}
            onChange={handleHourChange}
          />
          {/* Hidden input for form submission */}
          <input
            type="hidden"
            id={id ? `${id}-hour` : undefined}
            name={name ? `${name}-hour` : undefined}
            value={currentHour}
          />
        </div>

        <div className="flex items-center pt-8">
          <span className="text-2xl font-bold text-gray-500">:</span>
        </div>

        {/* Minute Picker */}
        <div className="flex-1">
          <div className="mb-1 text-center text-xs font-medium text-gray-600">
            Minute
          </div>
          <ScrollablePicker
            items={minuteOptions}
            value={currentMinute}
            onChange={handleMinuteChange}
          />
          {/* Hidden input for form submission */}
          <input
            type="hidden"
            id={id ? `${id}-minute` : undefined}
            name={name ? `${name}-minute` : undefined}
            value={currentMinute}
          />
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
