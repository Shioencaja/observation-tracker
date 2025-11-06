import { useState, useEffect, useCallback } from "react";
import {
  loadSessionWithObservations,
  loadAllSessions,
  getSessionCreator,
  SessionCreator,
  ObservationWithDetails,
  SessionWithObservations,
} from "@/services/session-details-service";
import { Session } from "@/types/observation";

export function useSessionDetailsData(
  sessionId: string,
  projectId: string,
  currentUser: { id: string; email?: string } | null,
  shouldLoad: boolean
) {
  const [session, setSession] = useState<SessionWithObservations | null>(null);
  const [observations, setObservations] = useState<ObservationWithDetails[]>(
    []
  );
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [sessionCreator, setSessionCreator] = useState<SessionCreator | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessionData = useCallback(async () => {
    if (!shouldLoad || !sessionId || !projectId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Load all sessions for navigation
      const sessionsData = await loadAllSessions(projectId);
      setAllSessions(sessionsData);

      // Find and set current session
      const currentSession = sessionsData.find((s) => s.id === sessionId);
      if (!currentSession) {
        throw new Error("Sesión no encontrada");
      }

      // Load session with observations
      const sessionWithObservations = await loadSessionWithObservations(
        sessionId,
        projectId
      );
      setSession(sessionWithObservations);
      setObservations(sessionWithObservations.observations);

      // Get session creator information
      const creatorInfo = await getSessionCreator(
        currentSession,
        currentUser
      );
      setSessionCreator(creatorInfo);
    } catch (error) {
      console.error("Error loading session data:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Error al cargar los datos de la sesión"
      );
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, projectId, currentUser, shouldLoad]);

  useEffect(() => {
    loadSessionData();
  }, [loadSessionData]);

  return {
    session,
    observations,
    allSessions,
    sessionCreator,
    isLoading,
    error,
    loadSessionData,
  };
}

