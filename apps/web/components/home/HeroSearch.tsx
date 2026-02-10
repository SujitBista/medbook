"use client";

import { useState, useRef } from "react";
import { Button, Input } from "@medbook/ui";
import { useRouter } from "next/navigation";

const POPULAR_SPECIALTIES = [
  "General Physician",
  "Dentist",
  "Dermatologist",
  "Gynecologist",
  "Pediatrician",
] as const;

export function HeroSearch() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const ctaWrapperRef = useRef<HTMLDivElement>(null);

  const focusCta = () => {
    ctaWrapperRef.current
      ?.querySelector<HTMLButtonElement>("button[type='submit']")
      ?.focus();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm) params.append("search", searchTerm);
    if (location) params.append("location", location);
    const query = params.toString();
    router.push(query ? `/doctors?${query}` : "/doctors");
  };

  const handleChipClick = (specialty: string) => {
    setSearchTerm(specialty);
    focusCta();
  };

  const handleNotSureClick = () => {
    setSearchTerm("General Physician");
    focusCta();
  };

  return (
    <div className="mt-6 w-full max-w-4xl mx-auto">
      {/* Booking Card: single unified container */}
      <div className="rounded-2xl bg-white/95 backdrop-blur-sm border border-gray-200/80 shadow-lg shadow-gray-200/50 p-4 sm:p-5 md:p-6">
        <form onSubmit={handleSearch}>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Try: General Physician, Dentist, Skin, Child"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border-gray-300 focus:border-primary-500 focus:ring-primary-500 text-gray-900 placeholder:text-gray-500"
              />
            </div>
            <div className="md:w-64">
              <Input
                type="text"
                placeholder="Department / Doctor (optional)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full border-gray-300 focus:border-primary-500 focus:ring-primary-500 text-gray-900 placeholder:text-gray-500"
              />
            </div>
            <div
              ref={ctaWrapperRef}
              className="flex items-end w-full md:w-auto"
            >
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full md:w-auto bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 px-8 py-4 md:py-3 whitespace-nowrap min-w-[140px] min-h-[48px] md:min-h-0"
                style={{ backgroundColor: "#0284c7", color: "#ffffff" }}
              >
                Find & Book Doctor
              </Button>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Most patients start with a General Physician.
          </p>
        </form>

        {/* Popular specialties chips — horizontal scroll on mobile */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 -mx-1 scrollbar-hide md:flex-wrap md:overflow-visible md:justify-center">
          <span className="text-sm font-medium text-gray-600 shrink-0">
            Popular:
          </span>
          <div className="flex gap-2 min-w-0 md:flex-wrap md:justify-center">
            {POPULAR_SPECIALTIES.map((specialty) => {
              const isSelected =
                searchTerm.toLowerCase() === specialty.toLowerCase();
              return (
                <button
                  key={specialty}
                  type="button"
                  onClick={() => handleChipClick(specialty)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200 cursor-pointer hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
                    isSelected
                      ? "border-primary-500 bg-primary-50 text-primary-700 ring-1 ring-primary-200"
                      : "border-gray-300 bg-white text-gray-700 shadow-sm"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {isSelected && (
                      <svg
                        className="h-3.5 w-3.5 text-primary-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    {specialty}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Microcopy + Not sure? quick start link */}
        <p className="text-sm text-gray-500 mt-3 text-center">
          Takes less than 1 minute.{" "}
          <button
            type="button"
            onClick={handleNotSureClick}
            className="font-medium text-primary-600 hover:text-primary-700 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 rounded"
          >
            Not sure? Start with General Physician →
          </button>
        </p>
      </div>
    </div>
  );
}
