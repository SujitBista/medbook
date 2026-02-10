"use client";

import { useState, useRef } from "react";
import { Button, Input } from "@medbook/ui";
import { useRouter } from "next/navigation";
import { SearchSuggestionsInput } from "./SearchSuggestionsInput";

const POPULAR_SPECIALTIES = [
  "General Physician",
  "Dentist",
  "Dermatologist",
  "Gynecologist",
  "Pediatrician",
] as const;

/** Normalize to URL-safe slug: lowercase, hyphenated, no redundant chars */
function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Heuristic: looks like a doctor unique id (doc_xxx or UUID-style) */
function looksLikeDoctorId(value: string): boolean {
  const trimmed = value.trim();
  return /^doc_[\w-]+$/i.test(trimmed) || /^[0-9a-f-]{36}$/i.test(trimmed);
}

export function HeroSearch() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentOrDoctor, setDepartmentOrDoctor] = useState("");
  const [selectedDepartmentSlug, setSelectedDepartmentSlug] = useState<
    string | null
  >(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const ctaWrapperRef = useRef<HTMLDivElement>(null);

  const focusCta = () => {
    ctaWrapperRef.current
      ?.querySelector<HTMLButtonElement>("button[type='submit']")
      ?.focus();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    const mainSearch = searchTerm.trim();
    const optional = departmentOrDoctor.trim();

    // Prefer typeahead selection from main search, then fall back to free-text / optional
    if (selectedDoctorId) {
      params.set("doctorId", selectedDoctorId);
    } else if (selectedDepartmentSlug) {
      params.set("department", selectedDepartmentSlug);
    } else {
      // Free-text search (name/email/keyword) MUST map to q only, never to department
      if (mainSearch) {
        params.set("q", toSlug(mainSearch));
      } else if (optional && !looksLikeDoctorId(optional)) {
        params.set("q", toSlug(optional));
      }
      if (optional && looksLikeDoctorId(optional)) {
        params.set("doctorId", optional);
      }
    }
    const query = params.toString();
    router.push(query ? `/doctors?${query}` : "/doctors");
  };

  const handleMainSearchChange = (value: string) => {
    setSearchTerm(value);
    setSelectedDepartmentSlug(null);
    setSelectedDoctorId(null);
  };

  const handleSelectDepartment = (slug: string, label: string) => {
    setSearchTerm(label);
    setSelectedDepartmentSlug(slug);
    setSelectedDoctorId(null);
  };

  const handleSelectDoctor = (
    id: string,
    _name: string,
    department?: string
  ) => {
    setSearchTerm(_name);
    setSelectedDoctorId(id);
    setSelectedDepartmentSlug(department ? toSlug(department) : null);
  };

  const handleChipClick = (specialty: string) => {
    router.push(`/doctors?q=${encodeURIComponent(toSlug(specialty))}`);
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
              <SearchSuggestionsInput
                value={searchTerm}
                onChange={handleMainSearchChange}
                onSelectDepartment={handleSelectDepartment}
                onSelectDoctor={handleSelectDoctor}
                placeholder="Try: General Physician, Dentist, Skin, Child"
                className="w-full border-gray-300 focus:border-primary-500 focus:ring-primary-500 text-gray-900 placeholder:text-gray-500"
              />
            </div>
            <div className="md:w-64">
              <Input
                type="text"
                placeholder="Department / Doctor (optional)"
                value={departmentOrDoctor}
                onChange={(e) => setDepartmentOrDoctor(e.target.value)}
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
              const isSelected = toSlug(searchTerm) === toSlug(specialty);
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
