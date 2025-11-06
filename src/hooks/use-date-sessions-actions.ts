import { useState, useCallback } from "react";
import { DateSessionsService } from "@/services/date-sessions-service";
import { SessionsService } from "@/services/sessions-service";
import type {
  Project,
  SessionWithObservations,
  ProjectObservationOption,
} from "@/types/observation";

interface UseDateSessionsActionsReturn {
  createNewSession: () => Promise<string | null>; // Returns session ID if successful
  finishSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  isCreatingSession: boolean;
  isFinishingSession: boolean;
  isDeletingSession: boolean;
  canCreateSession: boolean;
  canDeleteSession: boolean;
}

export function useDateSessionsActions(
  project: Project | null,
  userId: string | null,
  projectId: string,
  selectedDate: string,
  selectedAgency: string,
  observationOptions: ProjectObservationOption[],
  loadSessions: () => Promise<void>,
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void
): UseDateSessionsActionsReturn {
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isFinishingSession, setIsFinishingSession] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);

  const canCreateSession = project?.is_finished !== true;
  const canDeleteSession = userId === project?.created_by;

  const createNewSession = useCallback(async (): Promise<string | null> => {
    if (!userId || !project) return null;

    // Prevent creating sessions if project is finished
    if (project.is_finished === true) {
      showToast(
        "Este proyecto ha sido finalizado. No se pueden crear nuevas sesiones.",
        "error"
      );
      return null;
    }

    setIsCreatingSession(true);
    try {
      const session = await DateSessionsService.createSessionWithObservations(
        project.id,
        selectedDate,
        selectedAgency || null,
        userId,
        observationOptions
      );

      // Reload sessions to get the new one
      await loadSessions();
      showToast("Sesión creada exitosamente", "success");
      return session.id;
    } catch (error) {
      console.error("Error creating session:", error);
      showToast(
        error instanceof Error ? error.message : "Error al crear la sesión",
        "error"
      );
      return null;
    } finally {
      setIsCreatingSession(false);
    }
  }, [
    userId,
    project,
    selectedDate,
    selectedAgency,
    observationOptions,
    loadSessions,
    showToast,
  ]);

  const finishSession = useCallback(
    async (sessionId: string) => {
      if (!userId) return;

      setIsFinishingSession(true);
      try {
        await DateSessionsService.finishSession(sessionId, userId);

        // Reload sessions to get updated data
        await loadSessions();
        showToast("Sesión finalizada exitosamente", "success");
      } catch (error) {
        console.error("Error finishing session:", error);
        showToast(
          error instanceof Error ? error.message : "Error al finalizar la sesión",
          "error"
        );
      } finally {
        setIsFinishingSession(false);
      }
    },
    [userId, loadSessions, showToast]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      if (!userId || !project) return;

      // Check if user is the project creator
      if (userId !== project.created_by) {
        showToast("No tienes permisos para eliminar sesiones", "error");
        return;
      }

      setIsDeletingSession(true);
      try {
        await SessionsService.deleteSession(sessionId, project.id);

        // Reload sessions to get updated list (without auto-selecting)
        await loadSessions();
        showToast(
          "Sesión y todas sus observaciones eliminadas exitosamente",
          "success"
        );
      } catch (error) {
        console.error("Error deleting session:", error);
        showToast(
          error instanceof Error ? error.message : "Error al eliminar la sesión",
          "error"
        );
        throw error; // Re-throw so caller can handle it
      } finally {
        setIsDeletingSession(false);
      }
    },
    [userId, project, loadSessions, showToast]
  );

  return {
    createNewSession,
    finishSession,
    deleteSession,
    isCreatingSession,
    isFinishingSession,
    isDeletingSession,
    canCreateSession,
    canDeleteSession,
  };
}

