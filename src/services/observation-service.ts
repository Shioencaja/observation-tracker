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
  project_id: string;
  user_id: string;
  agency?: string | null;
  alias?: string | null;
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
      // First, try to find existing observation
      const { data: existing, error: findError } = await supabase
        .from("observations")
        .select("*")
        .eq("session_id", observationData.session_id)
        .eq(
          "project_observation_option_id",
          observationData.project_observation_option_id
        )
        .single();

      if (findError && findError.code !== "PGRST116") {
        // PGRST116 is "not found" error, which is expected for new observations
        console.error("Error finding existing observation:", findError);
        return { data: null, error: findError };
      }

      if (existing) {
        // Update existing observation
        const { data, error } = await supabase
          .from("observations")
          .update({
            response: observationData.response,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        return { data, error };
      } else {
        // Create new observation
        const { data, error } = await supabase
          .from("observations")
          .insert({
            session_id: observationData.session_id,
            project_observation_option_id:
              observationData.project_observation_option_id,
            response: observationData.response,
            project_id: observationData.project_id,
            user_id: observationData.user_id,
            agency: observationData.agency || null,
            alias: observationData.alias || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        return { data, error };
      }
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

  /**
   * Update observation with voice recording cleanup
   */
  async updateObservationWithVoiceCleanup(
    observationId: string,
    updateData: UpdateObservationData,
    previousResponse?: string
  ): Promise<{ data: Observation | null; error: any }> {
    try {
      // Extract previous voice recording URL if it exists
      if (previousResponse && previousResponse.includes("[Audio:")) {
        const audioUrlMatch = previousResponse.match(/\[Audio: (.*?)\]/);
        if (audioUrlMatch) {
          const previousAudioUrl = audioUrlMatch[1];

          // Extract filename from URL
          const urlParts = previousAudioUrl.split("/");
          const filename = urlParts[urlParts.length - 1];

          // Delete previous recording from storage
          const { error: storageError } = await supabase.storage
            .from("voice-recordings")
            .remove([filename]);

          if (storageError) {
            console.error(
              "Error deleting previous voice recording:",
              storageError
            );
            // Continue with update even if storage deletion fails
          } else {
            console.log("✅ Previous voice recording deleted:", filename);
          }
        }
      }

      // Update the observation
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
      console.error("Error updating observation with voice cleanup:", error);
      return { data: null, error };
    }
  },
};
