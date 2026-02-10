"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@medbook/ui";

const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;

export interface SuggestionDepartment {
  label: string;
  slug: string;
  /** When matched by alias/symptom: e.g. "chest pain" */
  matchReason?: string;
}

export interface SuggestionDoctor {
  id: string;
  name: string;
  department: string;
}

export interface SearchSuggestionsInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectDepartment?: (slug: string, label: string) => void;
  onSelectDoctor?: (id: string, name: string, department?: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchSuggestionsInput({
  value,
  onChange,
  onSelectDepartment,
  onSelectDoctor,
  placeholder,
  className,
}: SearchSuggestionsInputProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<SuggestionDepartment[]>([]);
  const [doctors, setDoctors] = useState<SuggestionDoctor[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalItems = departments.length + doctors.length;
  const hasSuggestions = totalItems > 0;
  const showEmptyState =
    open && !loading && value.trim().length >= MIN_CHARS && !hasSuggestions;

  const fetchSuggestions = useCallback(async (q: string) => {
    const id = ++requestIdRef.current;
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch(
        `/api/search/suggestions?q=${encodeURIComponent(q)}`,
        { signal: abortControllerRef.current.signal }
      );
      if (id !== requestIdRef.current) return;
      if (!res.ok) {
        setDepartments([]);
        setDoctors([]);
        return;
      }
      const data = (await res.json()) as {
        departments: SuggestionDepartment[];
        doctors: SuggestionDoctor[];
      };
      if (id !== requestIdRef.current) return;
      setDepartments(data.departments ?? []);
      setDoctors(data.doctors ?? []);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      if (id !== requestIdRef.current) return;
      setDepartments([]);
      setDoctors([]);
    } finally {
      if (id === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = value.trim();
    if (q.length < MIN_CHARS) {
      setDepartments([]);
      setDoctors([]);
      setOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      setLoading(true);
      setOpen(true);
      setHighlightedIndex(-1);
      fetchSuggestions(q);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchSuggestions]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
  }, []);

  const selectDepartment = useCallback(
    (slug: string, label: string) => {
      onSelectDepartment?.(slug, label);
      close();
    },
    [onSelectDepartment, close]
  );

  const selectDoctor = useCallback(
    (doc: SuggestionDoctor) => {
      onSelectDoctor?.(doc.id, doc.name, doc.department || undefined);
      close();
    },
    [onSelectDoctor, close]
  );

  const getItemAt = useCallback(
    (
      index: number
    ):
      | { type: "department"; slug: string; label: string }
      | { type: "doctor"; doc: SuggestionDoctor }
      | null => {
      if (index < 0) return null;
      if (index < departments.length) {
        const d = departments[index];
        return { type: "department", slug: d.slug, label: d.label };
      }
      const j = index - departments.length;
      if (j < doctors.length) {
        return { type: "doctor", doc: doctors[j] };
      }
      return null;
    },
    [departments, doctors]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "Escape") return;
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i < totalItems - 1 ? i + 1 : i));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i > 0 ? i - 1 : -1));
      return;
    }
    if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      const item = getItemAt(highlightedIndex);
      if (item) {
        if (item.type === "department") {
          selectDepartment(item.slug, item.label);
        } else {
          selectDoctor(item.doc);
        }
      }
      return;
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (
            value.trim().length >= MIN_CHARS &&
            (loading || hasSuggestions || showEmptyState)
          ) {
            setOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        className={className}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="search-suggestions-list"
        id="hero-search-suggestions-input"
      />
      {open && (loading || hasSuggestions || showEmptyState) && (
        <ul
          id="search-suggestions-list"
          role="listbox"
          aria-label="Search suggestions"
          className="absolute z-50 w-full mt-1 py-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {loading && (
            <li
              className="px-3 py-2 text-sm text-gray-500"
              role="option"
              aria-selected="false"
            >
              Loading…
            </li>
          )}
          {!loading && hasSuggestions && (
            <>
              {departments.length > 0 && (
                <li className="px-2 pt-2 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Departments
                </li>
              )}
              {departments.map((d, i) => (
                <li
                  key={d.slug}
                  role="option"
                  aria-selected={highlightedIndex === i}
                  className={`px-3 py-2 text-sm cursor-pointer ${
                    highlightedIndex === i
                      ? "bg-primary-50 text-primary-800"
                      : "text-gray-900 hover:bg-gray-50"
                  }`}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectDepartment(d.slug, d.label);
                  }}
                >
                  <span>{d.label}</span>
                  {d.matchReason && (
                    <span className="block text-xs text-gray-500 mt-0.5">
                      Matches: {d.matchReason}
                    </span>
                  )}
                </li>
              ))}
              {doctors.length > 0 && (
                <li className="px-2 pt-2 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Doctors
                </li>
              )}
              {doctors.map((d, i) => {
                const idx = departments.length + i;
                return (
                  <li
                    key={d.id}
                    role="option"
                    aria-selected={highlightedIndex === idx}
                    className={`px-3 py-2 text-sm cursor-pointer ${
                      highlightedIndex === idx
                        ? "bg-primary-50 text-primary-800"
                        : "text-gray-900 hover:bg-gray-50"
                    }`}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectDoctor(d);
                    }}
                  >
                    <span className="font-medium">{d.name}</span>
                    {d.department && (
                      <span className="ml-2 text-gray-500 text-xs">
                        {d.department}
                      </span>
                    )}
                  </li>
                );
              })}
            </>
          )}
          {!loading && showEmptyState && (
            <li
              className="px-3 py-2 text-sm text-gray-500"
              role="option"
              aria-selected="false"
            >
              No suggestions found
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
