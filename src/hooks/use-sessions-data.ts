import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Session } from "@/lib/session-utils";

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Client-side cache for sessions data
const sessionsCache = new Map<
  string,
  { project: Project; sessions: Session[] }
>();

interface UseSessionsDataReturn {
  user: { id: string; email?: string } | null;
  authLoading: boolean;
  project: Project | null;
  sessions: Session[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  clearCache: () => void;
}

export function useSessionsData(
  projectId: string
): UseSessionsDataReturn {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user session
  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error);
        router.push("/login");
      } else {
        setUser(user);
      }
      setAuthLoading(false);
    }
    getUser();
  }, [router]);

  // Load project and sessions data
  const loadSessionsData = useCallback(async () => {
    if (!projectId || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Check cache first
      const cachedData = sessionsCache.get(projectId);
      if (cachedData) {
        setProject(cachedData.project);
        setSessions(cachedData.sessions);
        setIsLoading(false);
        return;
      }

      // Load project info
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) {
        throw projectError;
      }

      setProject(projectData);

      // Load sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("sessions")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (sessionsError) {
        throw sessionsError;
      }

      setSessions(sessionsData || []);

      // Cache the data
      sessionsCache.set(projectId, {
        project: projectData,
        sessions: sessionsData || [],
      });
    } catch (err) {
      console.error("❌ Error loading sessions data:", err);
      setError("Error al cargar las sesiones");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, user]);

  useEffect(() => {
    if (!authLoading && user && projectId) {
      loadSessionsData();
    } else if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, projectId, router, loadSessionsData]);

  // Reload data when page becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && projectId) {
        loadSessionsData();
      }
    };

    const handleFocus = () => {
      if (user && projectId) {
        loadSessionsData();
      }
    };

    // Listen for page visibility changes and window focus
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user, projectId, loadSessionsData]);

  const clearCache = useCallback(() => {
    sessionsCache.delete(projectId);
  }, [projectId]);

  return {
    user,
    authLoading,
    project,
    sessions,
    isLoading,
    error,
    reload: loadSessionsData,
    clearCache,
  };
}

