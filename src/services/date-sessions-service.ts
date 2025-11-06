import { supabase } from "@/lib/supabase";
import type { Session, SessionWithObservations, ProjectObservationOption } from "@/types/observation";
import { getDateRange } from "@/lib/date-sessions-utils";

export class DateSessionsService {
  /**
   * Load all sessions for a specific date with their observations
   * Optimized: Uses a single join query instead of separate queries
   */
  static async loadSessionsForDate(
    projectId: string,
    date: string,
    userId: string,
    agency?: string
  ): Promise<SessionWithObservations[]> {
    const { startOfDay, endOfDay } = getDateRange(date);

    // Build query with join to load sessions and observations in a single query
    // Note: Supabase doesn't support ordering in nested selects directly,
    // so we'll sort observations after retrieval
    let query = supabase
      .from("sessions")
      .select(`
        *,
        observations (
          id,
          session_id,
          user_id,
          project_observation_option_id,
          response,
          alias,
          created_at,
          updated_at
        )
      `)
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .gte("start_time", startOfDay.toISOString())
      .lte("start_time", endOfDay.toISOString());

    // Filter by agency if provided
    if (agency) {
      query = query.eq("agency", agency);
    }

    const { data: sessionsData, error: sessionsError } = await query.order(
      "start_time",
      { ascending: false }
    );

    if (sessionsError) {
      throw new Error(`Error al cargar sesiones: ${sessionsError.message}`);
    }

    if (!sessionsData || sessionsData.length === 0) {
      return [];
    }

    // Format the response to match SessionWithObservations type
    // Supabase returns observations as an array, but we need to ensure it's properly typed
    const sessionsWithObservations: SessionWithObservations[] = sessionsData.map(
      (session: any) => ({
        id: session.id,
        user_id: session.user_id,
        project_id: session.project_id,
        agency: session.agency,
        alias: session.alias,
        start_time: session.start_time,
        end_time: session.end_time,
        created_at: session.created_at,
        updated_at: session.updated_at,
        observations: (session.observations || [])
          .sort((a: any, b: any) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
          .map((obs: any) => ({
            id: obs.id,
            session_id: obs.session_id || session.id,
            user_id: obs.user_id || session.user_id,
            project_observation_option_id: obs.project_observation_option_id,
            response: obs.response,
            alias: obs.alias,
            created_at: obs.created_at,
            updated_at: obs.updated_at,
          })),
      })
    );

    return sessionsWithObservations;
  }

  /**
   * Create a new session with blank observations for all observation options
   */
  static async createSessionWithObservations(
    projectId: string,
    date: string,
    agency: string | null,
    userId: string,
    observationOptions: ProjectObservationOption[]
  ): Promise<Session> {
    // Create session with the selected date at the current time
    const selectedDateTime = new Date(
      date + "T" + new Date().toTimeString().split(" ")[0]
    );

    const { data: sessionData, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        user_id: userId,
        project_id: projectId,
        agency: agency,
        start_time: selectedDateTime.toISOString(),
      })
      .select()
      .single();

    if (sessionError) {
      throw new Error(`Error al crear la sesión: ${sessionError.message}`);
    }

    // Create blank observations for all observation options
    if (observationOptions.length > 0) {
      const blankObservations = observationOptions.map((option) => ({
        session_id: sessionData.id,
        project_id: projectId,
        user_id: userId,
        project_observation_option_id: option.id,
        response: null, // Blank response
        agency: agency,
        alias: null,
      }));

      const { error: obsError } = await supabase
        .from("observations")
        .insert(blankObservations);

      if (obsError) {
        console.error("Error creating blank observations:", obsError);
        // Don't throw error here - session was created successfully
        // Just log the error and continue
      }
    }

    return sessionData;
  }

  /**
   * Finish a session by setting its end_time
   */
  static async finishSession(sessionId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("sessions")
      .update({ end_time: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Error al finalizar la sesión: ${error.message}`);
    }
  }
}

