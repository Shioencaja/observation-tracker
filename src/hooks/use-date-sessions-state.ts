import { useState, useCallback, useEffect } from "react";
import type { Session } from "@/types/observation";
import { shouldAutoSelectSession } from "@/lib/date-sessions-utils";

interface UseDateSessionsStateReturn {
  selectedSessionId: string | null;
  sessionsTableOpen: boolean;
  hasAutoSelected: boolean;
  handleSessionSelect: (sessionId: string | null) => void;
  setSessionsTableOpen: (open: boolean) => void;
  clearAutoSelection: () => void;
  markAutoSelected: () => void;
}

export function useDateSessionsState(
  sessions: Session[],
  sessionFromUrl: string | null,
  updateUrlWithSession: (sessionId: string | null) => void
): UseDateSessionsStateReturn {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    sessionFromUrl || null
  );
  const [sessionsTableOpen, setSessionsTableOpen] = useState(false);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  const handleSessionSelect = useCallback(
    (sessionId: string | null) => {
      setSelectedSessionId(sessionId);
      updateUrlWithSession(sessionId);
    },
    [updateUrlWithSession]
  );

  const clearAutoSelection = useCallback(() => {
    setHasAutoSelected(false);
  }, []);

  const markAutoSelected = useCallback(() => {
    setHasAutoSelected(true);
  }, []);

  // Auto-select session on first load
  useEffect(() => {
    if (sessions.length > 0 && !hasAutoSelected) {
      const sessionToSelect = shouldAutoSelectSession(
        sessions,
        sessionFromUrl,
        hasAutoSelected
      );

      if (sessionToSelect) {
        handleSessionSelect(sessionToSelect);
        setSessionsTableOpen(false); // Keep closed when auto-selecting
        setHasAutoSelected(true);
      } else if (sessions.length > 0) {
        // Mark as auto-selected even if no session was selected
        // This prevents re-running the auto-selection logic
        setHasAutoSelected(true);
      }
    }
  }, [sessions, sessionFromUrl, hasAutoSelected, handleSessionSelect]);

  // Update selected session when URL changes
  useEffect(() => {
    if (sessionFromUrl && sessionFromUrl !== selectedSessionId) {
      const sessionExists = sessions.find((s) => s.id === sessionFromUrl);
      if (sessionExists) {
        setSelectedSessionId(sessionFromUrl);
      }
    } else if (!sessionFromUrl && selectedSessionId) {
      // If URL param is removed but we still have a selected session, keep it
      // This handles the case where user manually changes URL
    }
  }, [sessionFromUrl, sessions, selectedSessionId]);

  return {
    selectedSessionId,
    sessionsTableOpen,
    hasAutoSelected,
    handleSessionSelect,
    setSessionsTableOpen,
    clearAutoSelection,
    markAutoSelected,
  };
}

