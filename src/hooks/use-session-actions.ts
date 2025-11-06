import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectRole } from "@/hooks/use-project-role";
import { Project, Session } from "@/types/observation";
import {
  finishSession,
  deleteSessionWithObservations,
} from "@/services/session-details-service";
import { exportSessionDetails } from "@/services/session-details-export-service";
import { ObservationWithDetails } from "@/services/session-details-service";
import { SessionCreator } from "@/services/session-details-service";

export function useSessionActions(
  session: Session | null,
  project: Project | null,
  currentUser: { id: string; email?: string } | null,
  observations: ObservationWithDetails[],
  sessionCreator: SessionCreator | null,
  projectId: string,
  onSessionUpdated: () => void,
  showToast: (message: string, type: "success" | "error" | "info" | "warning") => void
) {
  const router = useRouter();
  const { role } = useProjectRole(
    projectId,
    currentUser?.id || "",
    project?.created_by || ""
  );

  const [isFinishing, setIsFinishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canFinish = role === "creator" || role === "admin";
  const canDelete = role === "creator";
  const canExport = role === "creator" || role === "admin";

  const handleFinishSession = async () => {
    if (!session || !currentUser || !project) return;

    // Check if user is the project creator (can finish any session in the project)
    if (currentUser.id !== project.created_by) {
      showToast(
        "Solo el creador del proyecto puede finalizar sesiones",
        "error"
      );
      return;
    }

    // Check if session is already finished
    if (session.end_time) {
      showToast("Esta sesión ya está finalizada", "info");
      return;
    }

    setIsFinishing(true);
    try {
      await finishSession(session.id, project.id, currentUser.id);
      showToast("Sesión finalizada exitosamente", "success");
      onSessionUpdated();
    } catch (error) {
      console.error("Error finishing session:", error);
      showToast(
        error instanceof Error
          ? error.message
          : "Error inesperado al finalizar la sesión",
        "error"
      );
    } finally {
      setIsFinishing(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!session || !currentUser || !project) return;

    // Check if user is the project creator
    if (currentUser.id !== project.created_by) {
      showToast("No tienes permisos para eliminar sesiones", "error");
      return;
    }

    setIsDeleting(true);
    try {
      await deleteSessionWithObservations(
        session.id,
        project.id,
        currentUser.id
      );
      showToast(
        "Sesión finalizada y eliminada exitosamente junto con todas sus observaciones",
        "success"
      );
      setTimeout(() => {
        router.push(`/${projectId}/sessions`);
      }, 1500);
    } catch (error) {
      console.error("Error deleting session:", error);
      showToast(
        error instanceof Error
          ? error.message
          : "Error inesperado al eliminar la sesión",
        "error"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportSession = async () => {
    if (!session || !currentUser || !project) return;

    // Check if user is the project creator
    if (currentUser.id !== project.created_by) {
      showToast("No tienes permisos para exportar sesiones", "error");
      return;
    }

    if (!session || !observations.length) {
      showToast(
        "No hay datos de sesión o respuestas disponibles para exportar",
        "error"
      );
      return;
    }

    try {
      await exportSessionDetails(session, observations, sessionCreator || {
        email: `Usuario ${session.user_id.substring(0, 8)}`,
        full_name: null,
      });
      showToast("Sesión exportada exitosamente", "success");
    } catch (error) {
      console.error("Export error:", error);
      showToast(
        error instanceof Error
          ? error.message
          : "Error durante la exportación",
        "error"
      );
    }
  };

  return {
    handleFinishSession,
    handleDeleteSession,
    handleExportSession,
    isFinishing,
    isDeleting,
    canFinish,
    canDelete,
    canExport,
  };
}

