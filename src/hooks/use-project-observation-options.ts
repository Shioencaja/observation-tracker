import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ProjectObservationOption } from "@/types/observation";

interface UseProjectObservationOptionsReturn {
  options: ProjectObservationOption[];
  isLoading: boolean;
  error: string | null;
  loadOptions: () => Promise<void>;
  addOption: (option: {
    name: string;
    question_type: string;
    options?: string[];
  }) => Promise<void>;
  deleteOption: (id: string) => Promise<void>;
  toggleVisibility: (id: string, currentVisibility: boolean) => Promise<void>;
  reorder: (newOrder: ProjectObservationOption[]) => Promise<void>;
  updateOption: (updatedOption: ProjectObservationOption) => void;
}

export function useProjectObservationOptions(
  projectId: string | null
): UseProjectObservationOptionsReturn {
  const [options, setOptions] = useState<ProjectObservationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOptions = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("project_observation_options")
        .select("*")
        .eq("project_id", projectId)
        .order("order", { ascending: true });

      if (error) throw error;
      setOptions(data || []);
    } catch (err) {
      console.error("Error loading observation options:", err);
      setError("Error al cargar las opciones de observación");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const addOption = useCallback(
    async (option: {
      name: string;
      question_type: string;
      options?: string[];
    }) => {
      if (!projectId) return;

      try {
        const insertData: {
          project_id: string;
          name: string;
          description: string | null;
          question_type: string;
          options: string[];
          is_visible: boolean;
          sort_order?: number;
        } = {
          project_id: projectId,
          name: option.name.trim(),
          description: null,
          question_type: option.question_type,
          options: option.options || [],
          is_visible: true,
          sort_order: options.length + 1,
        };

        const { error } = await supabase
          .from("project_observation_options")
          .insert(insertData);

        if (error) {
          // If new columns don't exist, try without them
          if (
            error.message?.includes('column "question_type" does not exist') ||
            error.message?.includes('column "options" does not exist')
          ) {
            const { error: retryError } = await supabase
              .from("project_observation_options")
              .insert({
                project_id: projectId,
                name: option.name.trim(),
                description: null,
                is_visible: true,
              });

            if (retryError) throw retryError;
          } else {
            throw error;
          }
        }

        await loadOptions();
      } catch (err) {
        console.error("Error adding observation option:", err);
        setError("Error al agregar opción de observación");
        throw err;
      }
    },
    [projectId, options.length, loadOptions]
  );

  const deleteOption = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase
          .from("project_observation_options")
          .delete()
          .eq("id", id);

        if (error) throw error;
        await loadOptions();
      } catch (err) {
        console.error("Error deleting option:", err);
        setError("Error al eliminar la opción");
        throw err;
      }
    },
    [loadOptions]
  );

  const toggleVisibility = useCallback(
    async (id: string, currentVisibility: boolean) => {
      try {
        const { error } = await supabase
          .from("project_observation_options")
          .update({ is_visible: !currentVisibility })
          .eq("id", id);

        if (error) throw error;
        await loadOptions();
      } catch (err) {
        console.error("Error toggling option visibility:", err);
        setError("Error al cambiar visibilidad de la opción");
        throw err;
      }
    },
    [loadOptions]
  );

  const reorder = useCallback(
    async (newOrder: ProjectObservationOption[]) => {
      // Update local state immediately for responsive UI
      setOptions(newOrder);

      // Update order in database
      try {
        const updates = newOrder.map((option, index) => ({
          id: option.id,
          order: index + 1,
        }));

        // Update all options with their new order
        for (const update of updates) {
          await supabase
            .from("project_observation_options")
            .update({ order: update.order })
            .eq("id", update.id);
        }
      } catch (err) {
        console.error("Error updating question order:", err);
        // Revert local state on error
        await loadOptions();
        throw err;
      }
    },
    [loadOptions]
  );

  const updateOption = useCallback((updatedOption: ProjectObservationOption) => {
    setOptions((prev) =>
      prev.map((opt) => (opt.id === updatedOption.id ? updatedOption : opt))
    );
  }, []);

  return {
    options,
    isLoading,
    error,
    loadOptions,
    addOption,
    deleteOption,
    toggleVisibility,
    reorder,
    updateOption,
  };
}

