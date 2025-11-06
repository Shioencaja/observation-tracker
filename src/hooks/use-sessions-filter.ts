import { useState, useMemo, useCallback } from "react";
import type { Session } from "@/lib/session-utils";
import { formatDate } from "@/lib/session-utils";
import { useDebounce } from "@/hooks/use-debounce";

interface UseSessionsFilterReturn {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeSearchTerm: string;
  selectedAgency: string;
  selectedDate: string;
  setSelectedAgency: (agency: string) => void;
  setSelectedDate: (date: string) => void;
  filteredSessions: Session[];
  uniqueAgencies: string[];
  uniqueDates: string[];
  handleSearch: () => void;
  handleClearSearch: () => void;
  handleClearFilters: () => void;
}

export function useSessionsFilter(
  sessions: Session[],
  debounceDelay: number = 300
): UseSessionsFilterReturn {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAgency, setSelectedAgency] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("all");

  // Debounce the search term to avoid filtering on every keystroke
  const activeSearchTerm = useDebounce(searchTerm, debounceDelay);

  // Get unique agencies and dates for filters
  const uniqueAgencies = useMemo(
    () =>
      Array.from(
        new Set(
          sessions
            .map((s) => s.agency)
            .filter((agency): agency is string => Boolean(agency))
        )
      ).sort(),
    [sessions]
  );

  const uniqueDates = useMemo(
    () =>
      Array.from(new Set(sessions.map((s) => formatDate(s.created_at)))).sort(),
    [sessions]
  );

  // Filter sessions based on search and filters
  const filteredSessions = useMemo(
    () =>
      sessions.filter((session) => {
        const matchesSearch =
          activeSearchTerm === "" ||
          (session.alias &&
            session.alias.toLowerCase().includes(activeSearchTerm.toLowerCase())) ||
          (session.agency &&
            session.agency.toLowerCase().includes(activeSearchTerm.toLowerCase()));

        const matchesAgency =
          selectedAgency === "all" || session.agency === selectedAgency;
        const matchesDate =
          selectedDate === "all" || formatDate(session.created_at) === selectedDate;

        return matchesSearch && matchesAgency && matchesDate;
      }),
    [sessions, activeSearchTerm, selectedAgency, selectedDate]
  );

  // Search is now automatic via debounce, but keep handleSearch for manual trigger if needed
  const handleSearch = useCallback(() => {
    // No-op: search is now automatic via debounce
    // This is kept for backward compatibility with existing UI
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
    // activeSearchTerm will automatically update via debounce
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedAgency("all");
    setSelectedDate("all");
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    activeSearchTerm,
    selectedAgency,
    selectedDate,
    setSelectedAgency,
    setSelectedDate,
    filteredSessions,
    uniqueAgencies,
    uniqueDates,
    handleSearch,
    handleClearSearch,
    handleClearFilters,
  };
}

