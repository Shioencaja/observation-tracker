import { supabase } from "@/lib/supabase";

export interface Session {
  id: string;
  user_id: string;
  project_id: string;
  agency: string | null;
  alias: string | null;
  start_time: string;
  end_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSessionData {
  user_id: string;
  project_id: string;
  agency?: string | null;
  alias?: string | null;
  start_time: string;
}

export interface UpdateSessionData {
  agency?: string | null;
  alias?: string | null;
  end_time?: string | null;
}

export const sessionService = {
  /**
   * Get all sessions for a project
   */
  async getSessionsByProject(
    projectId: string
  ): Promise<{ data: Session[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("project_id", projectId)
        .order("start_time", { ascending: false });

      return { data, error };
    } catch (error) {
      console.error("Error fetching sessions by project:", error);
      return { data: null, error };
    }
  },

  /**
   * Get sessions for a specific date range
   */
  async getSessionsByDateRange(
    projectId: string,
    startDate: string,
    endDate: string
  ): Promise<{ data: Session[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("project_id", projectId)
        .gte("start_time", startDate)
        .lte("start_time", endDate)
        .order("start_time", { ascending: false });

      return { data, error };
    } catch (error) {
      console.error("Error fetching sessions by date range:", error);
      return { data: null, error };
    }
  },

  /**
   * Get sessions for a specific user
   */
  async getSessionsByUser(
    userId: string
  ): Promise<{ data: Session[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", userId)
        .order("start_time", { ascending: false });

      return { data, error };
    } catch (error) {
      console.error("Error fetching sessions by user:", error);
      return { data: null, error };
    }
  },

  /**
   * Get a specific session by ID
   */
  async getSessionById(
    sessionId: string
  ): Promise<{ data: Session | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      return { data, error };
    } catch (error) {
      console.error("Error fetching session by ID:", error);
      return { data: null, error };
    }
  },

  /**
   * Create a new session
   */
  async createSession(
    sessionData: CreateSessionData
  ): Promise<{ data: Session | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("sessions")
        .insert({
          ...sessionData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error("Error creating session:", error);
      return { data: null, error };
    }
  },

  /**
   * Update an existing session
   */
  async updateSession(
    sessionId: string,
    updateData: UpdateSessionData
  ): Promise<{ data: Session | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("sessions")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error("Error updating session:", error);
      return { data: null, error };
    }
  },

  /**
   * Finish a session (set end_time)
   */
  async finishSession(
    sessionId: string
  ): Promise<{ data: Session | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("sessions")
        .update({
          end_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error("Error finishing session:", error);
      return { data: null, error };
    }
  },

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from("sessions")
        .delete()
        .eq("id", sessionId);

      return { error };
    } catch (error) {
      console.error("Error deleting session:", error);
      return { error };
    }
  },
};
