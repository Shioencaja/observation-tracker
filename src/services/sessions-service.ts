import { supabase } from "@/lib/supabase";
import type { Session } from "@/lib/session-utils";

export class SessionsService {
  /**
   * Delete a session and all its associated data
   */
  static async deleteSession(
    sessionId: string,
    projectId: string
  ): Promise<void> {
    // First, verify the session exists and belongs to the project
    const { data: sessionData, error: sessionCheckError } = await supabase
      .from("sessions")
      .select("id, user_id, project_id, end_time")
      .eq("id", sessionId)
      .eq("project_id", projectId)
      .single();

    if (sessionCheckError) {
      if (sessionCheckError.code === "PGRST116") {
        throw new Error("La sesión no existe o ya fue eliminada");
      }
      throw new Error(
        `Error al verificar la sesión: ${sessionCheckError.message}`
      );
    }

    // If session is not ended, end it first before deletion
    if (!sessionData.end_time) {
      const { error: endSessionError } = await supabase
        .from("sessions")
        .update({ end_time: new Date().toISOString() })
        .eq("id", sessionId)
        .eq("project_id", projectId);

      if (endSessionError) {
        throw new Error(
          `Error al finalizar la sesión antes de eliminar: ${endSessionError.message}`
        );
      }
    }

    // Get all observations to extract voice recording URLs
    const { data: observations, error: fetchError } = await supabase
      .from("observations")
      .select("response")
      .eq("session_id", sessionId);

    if (fetchError) {
      throw new Error(`Error al obtener las observaciones: ${fetchError.message}`);
    }

    // Extract and delete voice recordings from Supabase Storage
    if (observations && observations.length > 0) {
      const voiceRecordings = observations
        .map((obs) => {
          if (
            typeof obs.response === "string" &&
            obs.response.includes("[Audio:")
          ) {
            const audioUrlMatch = obs.response.match(/\[Audio: (.*?)\]/);
            if (audioUrlMatch) {
              const audioUrl = audioUrlMatch[1];
              const urlParts = audioUrl.split("/");
              const filename = urlParts[urlParts.length - 1];
              return filename;
            }
          }
          return null;
        })
        .filter(Boolean);

      // Delete voice recordings from storage
      if (voiceRecordings.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("voice-recordings")
          .remove(
            voiceRecordings.filter(
              (filename): filename is string => filename !== null
            )
          );

        if (storageError) {
          console.warn(
            `Advertencia: No se pudieron eliminar las grabaciones de voz. Razón: ${storageError.message}`
          );
          // Continue with deletion even if storage deletion fails
        }
      }
    }

    // Delete all observations for this session
    const { error: obsError } = await supabase
      .from("observations")
      .delete()
      .eq("session_id", sessionId);

    if (obsError) {
      if (obsError.code === "23503") {
        throw new Error(
          "No se pueden eliminar las observaciones debido a restricciones de integridad de datos"
        );
      } else if (obsError.code === "42501") {
        throw new Error(
          "No tienes permisos para eliminar las observaciones de este proyecto"
        );
      }
      throw new Error(`Error al eliminar las observaciones: ${obsError.message}`);
    }

    // Then delete the session
    const { error: sessionError } = await supabase
      .from("sessions")
      .delete()
      .eq("id", sessionId)
      .eq("project_id", projectId);

    if (sessionError) {
      if (sessionError.code === "23503") {
        throw new Error(
          "No se puede eliminar la sesión debido a restricciones de integridad de datos"
        );
      } else if (sessionError.code === "42501") {
        throw new Error(
          "No tienes permisos para eliminar sesiones en este proyecto"
        );
      } else if (sessionError.code === "PGRST116") {
        throw new Error("La sesión no existe o ya fue eliminada");
      }
      throw new Error(`Error al eliminar la sesión: ${sessionError.message}`);
    }
  }
}

