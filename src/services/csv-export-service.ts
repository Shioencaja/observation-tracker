import { supabase } from "@/lib/supabase";
import type { Session } from "@/lib/session-utils";
import {
  exportSessionToCSV,
  exportAllSessionsToCSV,
  type ExportSessionOptions,
  type ExportAllSessionsOptions,
} from "@/lib/csv-export-utils";

interface Observation {
  id: string;
  session_id: string;
  response: unknown;
  created_at: string;
  project_observation_options: {
    id: string;
    name: string;
    question_type: string;
  } | null;
}

export class CSVExportService {
  /**
   * Export a single session to CSV
   */
  static async exportSession(
    sessionId: string,
    projectId: string
  ): Promise<void> {
    // Find the session
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("project_id", projectId)
      .single();

    if (sessionError || !session) {
      throw new Error("Sesión no encontrada");
    }

    // Get all project observation options with their order
    const { data: projectOptions, error: projectOptionsError } = await supabase
      .from("project_observation_options")
      .select("*")
      .eq("project_id", projectId)
      .order("order", { ascending: true })
      .order("created_at", { ascending: true });

    if (projectOptionsError) {
      throw new Error(
        `Error al cargar las opciones del proyecto: ${projectOptionsError.message}`
      );
    }

    // Get observations for this session
    const { data: observations, error: obsError } = await supabase
      .from("observations")
      .select(
        `
        id,
        session_id,
        response,
        created_at,
        project_observation_options (
          id,
          name,
          question_type
        )
      `
      )
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (obsError) {
      throw new Error(`Error al cargar las observaciones: ${obsError.message}`);
    }

    await exportSessionToCSV({
      session: session as Session,
      observations: (observations || []) as Observation[],
      projectOptions: projectOptions || [],
    });
  }

  /**
   * Export all filtered sessions to CSV
   */
  static async exportAllSessions(
    sessions: Session[],
    projectId: string,
    projectName: string
  ): Promise<void> {
    if (sessions.length === 0) {
      throw new Error("No hay sesiones para exportar");
    }

    await exportAllSessionsToCSV({
      sessions,
      projectId,
      projectName,
    });
  }
}

