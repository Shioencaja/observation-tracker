import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/supabase";

export type ProjectObservationOption = Tables<"project_observation_options">;

export const projectObservationOptionsService = {
  /**
   * Get all observation options for a project
   */
  async getObservationOptionsByProject(
    projectId: string
  ): Promise<{ data: ProjectObservationOption[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("project_observation_options")
        .select("*")
        .eq("project_id", projectId)
        .order("order", { ascending: true });

      return { data, error };
    } catch (error) {
      console.error("Error fetching observation options by project:", error);
      return { data: null, error };
    }
  },

  /**
   * Get a specific observation option by ID
   */
  async getObservationOptionById(
    optionId: string
  ): Promise<{ data: ProjectObservationOption | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("project_observation_options")
        .select("*")
        .eq("id", optionId)
        .single();

      return { data, error };
    } catch (error) {
      console.error("Error fetching observation option by ID:", error);
      return { data: null, error };
    }
  },

  /**
   * Create a new observation option
   */
  async createObservationOption(
    optionData: Omit<
      ProjectObservationOption,
      "id" | "created_at" | "updated_at"
    >
  ): Promise<{ data: ProjectObservationOption | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("project_observation_options")
        .insert({
          ...optionData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error("Error creating observation option:", error);
      return { data: null, error };
    }
  },

  /**
   * Update an existing observation option
   */
  async updateObservationOption(
    optionId: string,
    updateData: Partial<
      Omit<ProjectObservationOption, "id" | "created_at" | "updated_at">
    >
  ): Promise<{ data: ProjectObservationOption | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("project_observation_options")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", optionId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error("Error updating observation option:", error);
      return { data: null, error };
    }
  },

  /**
   * Delete an observation option
   */
  async deleteObservationOption(optionId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from("project_observation_options")
        .delete()
        .eq("id", optionId);

      return { error };
    } catch (error) {
      console.error("Error deleting observation option:", error);
      return { error };
    }
  },

  /**
   * Reorder observation options
   */
  async reorderObservationOptions(
    optionIds: string[]
  ): Promise<{ error: any }> {
    try {
      const updates = optionIds.map((id, index) => ({
        id,
        order: index + 1,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("project_observation_options")
        .upsert(updates);

      return { error };
    } catch (error) {
      console.error("Error reordering observation options:", error);
      return { error };
    }
  },
};
