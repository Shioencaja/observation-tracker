import { supabase } from "@/lib/supabase";
import { Session, Observation } from "@/types/observation";

export interface SessionCreator {
  email: string;
  full_name: string | null;
}

export interface ObservationWithDetails extends Observation {
  project_observation_options?: {
    name: string;
    question_type: string;
  };
  question_name?: string;
  question_type?: string;
}

export interface SessionWithObservations extends Session {
  observations: ObservationWithDetails[];
}

/**
 * Get session creator information using RPC function
 */
export async function getSessionCreator(
  session: Session,
  currentUser: { id: string; email?: string } | null
): Promise<SessionCreator> {
  // Check if it's the current user
  if (currentUser && currentUser.id === session.user_id) {
    return {
      email:
        currentUser.email || `Usuario ${session.user_id.substring(0, 8)}`,
      full_name: null,
    };
  }

  // Try to get user email using RPC function (same as project settings)
  try {
    const { data: userEmails, error: emailError } = await supabase.rpc(
      "get_user_emails",
      { user_ids: [session.user_id] }
    );

    if (emailError) {
      console.error("Error fetching user email via RPC:", emailError);
    } else if (userEmails && userEmails.length > 0) {
      const userEmail = userEmails[0];
      return {
        email: userEmail.email,
        full_name: null,
      };
    }
  } catch (error) {
    console.error("❌ Error in RPC call:", error);
  }

  // Fallback to user ID if nothing found
  console.warn("❌ Could not get session creator info, using fallback");
  return {
    email: `Usuario ${session.user_id?.substring(0, 8) || "Unknown"}`,
    full_name: null,
  };
}

/**
 * Finish a session
 * Optimized: Uses conditional update to combine check and update in a single query
 */
export async function finishSession(
  sessionId: string,
  projectId: string,
  userId: string
): Promise<void> {
  // Optimized: Use conditional update - only updates if end_time is null
  // This combines the check and update into a single query
  const { data: updatedSession, error } = await supabase
    .from("sessions")
    .update({ end_time: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .is("end_time", null) // Only update if not already finished
    .select("id")
    .single();

  if (error) {
    console.error("Error finishing session:", error);
    if (error.code === "PGRST116") {
      // No rows updated - session doesn't exist, wrong permissions, or already finished
      // Check if session exists to provide better error message
      const { data: sessionCheck } = await supabase
        .from("sessions")
        .select("id, end_time")
        .eq("id", sessionId)
        .single();

      if (!sessionCheck) {
        throw new Error("La sesión no existe o ya fue eliminada");
      }
      if (sessionCheck.end_time) {
        throw new Error("Esta sesión ya está finalizada");
      }
      throw new Error("No tienes permisos para finalizar esta sesión");
    } else if (error.code === "23503") {
      throw new Error(
        "No se puede finalizar la sesión debido a restricciones de integridad de datos"
      );
    } else if (error.code === "42501") {
      throw new Error(
        "No tienes permisos para finalizar sesiones en este proyecto"
      );
    }
    throw new Error(`Error al finalizar la sesión: ${error.message}`);
  }

  // If no rows were updated (shouldn't happen with .single(), but check anyway)
  if (!updatedSession) {
    throw new Error("No se pudo finalizar la sesión. La sesión puede no existir o ya estar finalizada.");
  }
}

/**
 * Delete a session with all its observations and voice recordings
 */
export async function deleteSessionWithObservations(
  sessionId: string,
  projectId: string,
  userId: string
): Promise<void> {
  // Optimized: Use conditional update to end session if not already ended
  // This combines the check and update into a single query
  const { error: endSessionError } = await supabase
    .from("sessions")
    .update({ end_time: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .is("end_time", null); // Only update if not already finished

  // Ignore "no rows updated" errors - it just means the session was already finished
  if (endSessionError && endSessionError.code !== "PGRST116") {
    console.error("Error ending session:", endSessionError);
    throw new Error("Error al finalizar la sesión antes de eliminar");
  }

  // Get all observations to extract voice recording URLs
  const { data: observations, error: fetchError } = await supabase
    .from("observations")
    .select("response")
    .eq("session_id", sessionId)
    .eq("user_id", userId);

  if (fetchError) {
    console.error("Error fetching observations:", fetchError);
    throw new Error("Error al obtener las observaciones");
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
            // Extract filename from URL
            const urlParts = audioUrl.split("/");
            const filename = urlParts[urlParts.length - 1];
            return filename;
          }
        }
        return null;
      })
      .filter(Boolean) as string[];

    // Delete voice recordings from storage
    if (voiceRecordings.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("voice-recordings")
        .remove(voiceRecordings);

      if (storageError) {
        console.error("Error deleting voice recordings:", storageError);
        // Continue with session deletion even if storage deletion fails
        // This is a warning, not a fatal error
      }
    }
  }

  // Delete all observations for this session
  const { error: obsError } = await supabase
    .from("observations")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", userId);

  if (obsError) {
    console.error("Error deleting observations:", obsError);
    throw new Error("Error al eliminar las observaciones");
  }

  // Then delete the session
  const { error: sessionError } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (sessionError) {
    console.error("Error deleting session:", sessionError);
    throw new Error("Error al eliminar la sesión");
  }
}

/**
 * Load session with observations
 * Optimized: Uses a single join query to load session and observations together
 */
export async function loadSessionWithObservations(
  sessionId: string,
  projectId: string
): Promise<SessionWithObservations> {
  // Load session with observations in a single query
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select(
      `
      *,
      observations (
        id,
        session_id,
        user_id,
        project_observation_option_id,
        response,
        alias,
        created_at,
        updated_at,
        project_observation_options (
          name,
          question_type
        )
      )
    `
    )
    .eq("id", sessionId)
    .eq("project_id", projectId)
    .single();

  if (sessionError || !session) {
    throw new Error("Sesión no encontrada");
  }

  // Format observations - Supabase returns observations as an array
  // Note: Observations need to be sorted client-side since Supabase
  // doesn't support ordering in nested selects
  const formattedObservations: ObservationWithDetails[] = (
    (session as any).observations || []
  )
    .sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    .map((obs: any) => ({
      id: obs.id,
      session_id: obs.session_id || sessionId,
      user_id: obs.user_id || session.user_id,
      project_observation_option_id: obs.project_observation_option_id,
      response: obs.response,
      alias: obs.alias,
      created_at: obs.created_at,
      updated_at: obs.updated_at,
      project_observation_options: obs.project_observation_options,
      question_name: obs.project_observation_options?.name || "Unknown",
      question_type:
        obs.project_observation_options?.question_type || "unknown",
    }));

  // Return session with formatted observations
  // Extract session data without observations for the return
  const { observations: _, ...sessionData } = session as any;
  
  return {
    ...sessionData,
    observations: formattedObservations,
  };
}

/**
 * Load all sessions for a project (for navigation)
 */
export async function loadAllSessions(
  projectId: string
): Promise<Session[]> {
  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("*")
    .eq("project_id", projectId)
    .order("start_time", { ascending: false });

  if (sessionsError) {
    throw sessionsError;
  }

  return sessions || [];
}

