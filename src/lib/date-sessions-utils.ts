import type { Session } from "@/types/observation";

/**
 * Get the start and end of day for a given date string (YYYY-MM-DD)
 */
export function getDateRange(date: string): { startOfDay: Date; endOfDay: Date } {
  const startOfDay = new Date(date + "T00:00:00");
  const endOfDay = new Date(date + "T23:59:59.999");
  return { startOfDay, endOfDay };
}

/**
 * Calculate the number of unfinished sessions
 */
export function calculateUnfinishedCount(sessions: Session[]): number {
  return sessions.filter((s) => !s.end_time).length;
}

/**
 * Determine which session to auto-select based on priority:
 * 1. Session from URL (if exists and valid)
 * 2. Latest unfinished session
 * 3. null (no auto-selection)
 */
export function shouldAutoSelectSession(
  sessions: Session[],
  sessionFromUrl: string | null,
  hasAutoSelected: boolean
): string | null {
  // Don't auto-select if already done
  if (hasAutoSelected) {
    return null;
  }

  // Priority 1: URL param
  if (sessionFromUrl) {
    const sessionExists = sessions.find((s) => s.id === sessionFromUrl);
    if (sessionExists) {
      return sessionFromUrl;
    }
  }

  // Priority 2: Latest unfinished session
  const unfinishedSession = sessions.find((s) => !s.end_time);
  if (unfinishedSession) {
    return unfinishedSession.id;
  }

  // Priority 3: Don't auto-select
  return null;
}

