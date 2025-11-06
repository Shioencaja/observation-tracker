import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DateSessionsService } from "@/services/date-sessions-service";
import type {
  Project,
  SessionWithObservations,
  ProjectObservationOption,
} from "@/types/observation";

interface UseDateSessionsDataReturn {
  project: Project | null;
  observationOptions: ProjectObservationOption[];
  sessions: SessionWithObservations[];
  isLoading: boolean;
  isLoadingProject: boolean;
  error: string | null;
  loadProject: () => Promise<void>;
  loadObservationOptions: () => Promise<void>;
  loadSessions: (options?: { skipAutoSelect?: boolean }) => Promise<void>;
}

export function useDateSessionsData(
  projectId: string,
  selectedDate: string,
  selectedAgency: string,
  userId: string | null,
  enabled: boolean
): UseDateSessionsDataReturn {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [observationOptions, setObservationOptions] = useState<
    ProjectObservationOption[]
  >([]);
  const [sessions, setSessions] = useState<SessionWithObservations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Optimized: Load project and observation options in parallel
  const loadProjectAndOptions = useCallback(async () => {
    if (!userId || !projectId) return;

    try {
      setIsLoadingProject(true);
      
      // Load both project and observation options in parallel
      const [projectResult, optionsResult] = await Promise.all([
        supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single(),
        supabase
          .from("project_observation_options")
          .select("*")
          .eq("project_id", projectId)
          .eq("is_visible", true)
          .order("order"),
      ]);

      if (projectResult.error) {
        console.error("Project error:", projectResult.error);
        router.push("/projects");
        return;
      }

      if (optionsResult.error) {
        console.error("Observation options error:", optionsResult.error);
        setObservationOptions([]);
      } else {
        setObservationOptions(optionsResult.data || []);
      }

      setProject(projectResult.data);
    } catch (error) {
      console.error("Unexpected error:", error);
      router.push("/projects");
    } finally {
      setIsLoadingProject(false);
    }
  }, [userId, projectId, router]);

  const loadSessions = useCallback(
    async (options?: { skipAutoSelect?: boolean }) => {
      if (!userId || !project || !selectedDate) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const sessionsData = await DateSessionsService.loadSessionsForDate(
          project.id,
          selectedDate,
          userId,
          selectedAgency || undefined
        );

        setSessions(sessionsData);
      } catch (error) {
        console.error("Error loading sessions:", error);
        setError(
          error instanceof Error ? error.message : "Error al cargar sesiones"
        );
        setSessions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [userId, project, selectedDate, selectedAgency]
  );

  // Wrapper functions for backward compatibility
  const loadProject = useCallback(async () => {
    await loadProjectAndOptions();
  }, [loadProjectAndOptions]);

  const loadObservationOptions = useCallback(async () => {
    // This is now handled by loadProjectAndOptions, but kept for compatibility
    // If project is already loaded, we can still reload options if needed
    if (!projectId) return;
    
    try {
      const { data, error } = await supabase
        .from("project_observation_options")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_visible", true)
        .order("order");

      if (error) {
        console.error("Observation options error:", error);
        setObservationOptions([]);
      } else {
        setObservationOptions(data || []);
      }
    } catch (error) {
      console.error("Unexpected error loading observation options:", error);
      setObservationOptions([]);
    }
  }, [projectId]);

  // Load project and options on mount (optimized)
  useEffect(() => {
    if (enabled && userId) {
      loadProjectAndOptions();
    }
  }, [enabled, userId, loadProjectAndOptions]);

  return {
    project,
    observationOptions,
    sessions,
    isLoading,
    isLoadingProject,
    error,
    loadProject,
    loadObservationOptions,
    loadSessions,
  };
}

