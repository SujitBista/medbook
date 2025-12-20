"use client";

import { useState } from "react";
import { Button, Input } from "@medbook/ui";
import { useRouter } from "next/navigation";

export function HeroSearch() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm) params.append("search", searchTerm);
    if (location) params.append("location", location);
    const query = params.toString();
    router.push(query ? `/doctors?${query}` : "/doctors");
  };

  return (
    <form onSubmit={handleSearch} className="mt-10 w-full max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row gap-3 bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-5 md:p-6">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search by doctor name or specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border-gray-300 focus:border-primary-500 focus:ring-primary-500 text-gray-900 placeholder:text-gray-500"
          />
        </div>
        <div className="md:w-64">
          <Input
            type="text"
            placeholder="Location (optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full border-gray-300 focus:border-primary-500 focus:ring-primary-500 text-gray-900 placeholder:text-gray-500"
          />
        </div>
        <div className="flex items-end">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full md:w-auto bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-md hover:shadow-lg transition-all px-8 py-3 whitespace-nowrap min-w-[120px]"
            style={{ backgroundColor: "#0284c7", color: "#ffffff" }}
          >
            Search
          </Button>
        </div>
      </div>
    </form>
  );
}
