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
    <div className="mt-10 w-full max-w-4xl mx-auto">
      <form onSubmit={handleSearch}>
        <div className="flex flex-col md:flex-row gap-3 bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-5 md:p-6">
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
              placeholder="City/Area (e.g., Biratnagar)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border-gray-300 focus:border-primary-500 focus:ring-primary-500 text-gray-900 placeholder:text-gray-500"
            />
          </div>
          {/* Primary CTA: search submits to /doctors (find & book) — full-width on mobile for easy tap */}
          <div ref={ctaWrapperRef} className="flex items-end w-full md:w-auto">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full md:w-auto bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all px-8 py-4 md:py-3 whitespace-nowrap min-w-[140px] min-h-[48px] md:min-h-0"
              style={{ backgroundColor: "#0284c7", color: "#ffffff" }}
            >
              Find & Book Doctor
            </Button>
          </div>
        </div>
      </form>

      {/* Popular specialties chips — set specialty input, focus CTA; no auto-submit */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm font-medium text-gray-600">Popular:</span>
        {POPULAR_SPECIALTIES.map((specialty) => (
          <button
            key={specialty}
            type="button"
            onClick={() => handleChipClick(specialty)}
            className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 transition-colors"
          >
            {specialty}
          </button>
        ))}
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
  );
}
