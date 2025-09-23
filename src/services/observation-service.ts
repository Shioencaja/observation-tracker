import { supabase } from "@/lib/supabase";

export interface Observation {
  id: string;
  session_id: string;
  project_observation_option_id: string;
  response: string;
  created_at: string;
  updated_at: string;
}

export interface CreateObservationData {
  session_id: string;
  project_observation_option_id: string;
  response: string;
}

export interface UpdateObservationData {
  response: string;
}

export const observationService = {
  /**
   * Get all observations for a specific session
   */
  async getObservationsBySession(
    sessionId: string
  ): Promise<{ data: Observation[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("observations")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      return { data, error };
    } catch (error) {
      console.error("Error fetching observations by session:", error);
      return { data: null, error };
    }
  },

  /**
   * Create or update an observation
   */
  async upsertObservation(
    observationData: CreateObservationData
  ): Promise<{ data: Observation | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("observations")
        .upsert({
          ...observationData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error("Error upserting observation:", error);
      return { data: null, error };
    }
  },

  /**
   * Update an existing observation
   */
  async updateObservation(
    observationId: string,
    updateData: UpdateObservationData
  ): Promise<{ data: Observation | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("observations")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", observationId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error("Error updating observation:", error);
      return { data: null, error };
    }
  },

  /**
   * Delete an observation
   */
  async deleteObservation(observationId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from("observations")
        .delete()
        .eq("id", observationId);

      return { error };
    } catch (error) {
      console.error("Error deleting observation:", error);
      return { error };
    }
  },

  /**
   * Get observations for multiple sessions
   */
  async getObservationsBySessions(
    sessionIds: string[]
  ): Promise<{ data: Observation[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("observations")
        .select("*")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: true });

      return { data, error };
    } catch (error) {
      console.error("Error fetching observations by sessions:", error);
      return { data: null, error };
    }
  },

  /**
   * Get observations by project observation option
   */
  async getObservationsByQuestion(
    questionId: string
  ): Promise<{ data: Observation[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("observations")
        .select("*")
        .eq("project_observation_option_id", questionId)
        .order("created_at", { ascending: true });

      return { data, error };
    } catch (error) {
      console.error("Error fetching observations by question:", error);
      return { data: null, error };
    }
  },
};
