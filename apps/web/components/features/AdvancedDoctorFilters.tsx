"use client";

import React, { useState } from "react";
import { Button, Card, Input } from "@medbook/ui";
import { Doctor } from "@medbook/types";

interface AdvancedDoctorFiltersProps {
  filters: {
    city: string;
    state: string;
    sortBy: "name" | "specialization" | "yearsOfExperience" | "createdAt";
    sortOrder: "asc" | "desc";
  };
  onFiltersChange: (filters: {
    city: string;
    state: string;
    sortBy: "name" | "specialization" | "yearsOfExperience" | "createdAt";
    sortOrder: "asc" | "desc";
  }) => void;
  doctors: Doctor[]; // For getting unique cities/states
}

export function AdvancedDoctorFilters({
  filters,
  onFiltersChange,
  doctors,
}: AdvancedDoctorFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Get unique cities and states from doctors list
  const cities = Array.from(
    new Set(doctors.map((d) => d.city).filter(Boolean))
  ).sort();
  const states = Array.from(
    new Set(doctors.map((d) => d.state).filter(Boolean))
  ).sort();

  const hasActiveFilters =
    filters.city !== "" ||
    filters.state !== "" ||
    filters.sortBy !== "createdAt" ||
    filters.sortOrder !== "desc";

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      city: "",
      state: "",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  };

  return (
    <Card className="mb-6">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <span>Advanced Filters</span>
            {hasActiveFilters && (
              <span className="px-2 py-0.5 text-xs font-semibold text-white bg-primary-600 rounded-full">
                Active
              </span>
            )}
            <svg
              className={`w-4 h-4 transition-transform ${
                isOpen ? "transform rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-sm"
            >
              Clear All
            </Button>
          )}
        </div>

        {isOpen && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            {/* Location Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                {cities.length > 0 ? (
                  <select
                    value={filters.city}
                    onChange={(e) => handleFilterChange("city", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">All Cities</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type="text"
                    placeholder="Enter city"
                    value={filters.city}
                    onChange={(e) => handleFilterChange("city", e.target.value)}
                    className="w-full"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                {states.length > 0 ? (
                  <select
                    value={filters.state}
                    onChange={(e) =>
                      handleFilterChange("state", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">All States</option>
                    {states.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type="text"
                    placeholder="Enter state"
                    value={filters.state}
                    onChange={(e) =>
                      handleFilterChange("state", e.target.value)
                    }
                    className="w-full"
                  />
                )}
              </div>
            </div>

            {/* Sorting Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="createdAt">Date Added</option>
                  <option value="name">Name</option>
                  <option value="specialization">Specialization</option>
                  <option value="yearsOfExperience">Experience</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order
                </label>
                <select
                  value={filters.sortOrder}
                  onChange={(e) =>
                    handleFilterChange("sortOrder", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
