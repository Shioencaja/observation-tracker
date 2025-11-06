import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  validateSessionAccess,
  redirectToLogin,
  redirectToProjects,
} from "@/lib/auth-utils";
import { Project, Session } from "@/types/observation";

export function useSessionAuth(projectId: string, sessionId: string) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [fallbackUser, setFallbackUser] = useState<any>(null);
  const [fallbackLoading, setFallbackLoading] = useState(true);
  const [isValidatingAuth, setIsValidatingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // Auth check - use fallback if AuthContext is not working
  const currentUser = user || fallbackUser;
  const currentLoading = authLoading || fallbackLoading;

  // Fallback authentication check
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setFallbackUser(currentUser);
      setFallbackLoading(false);
    };
    checkAuth();
  }, []);

  // Handle redirect if not authenticated
  useEffect(() => {
    if (typeof window !== "undefined" && !authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  // Validate authentication and session access
  useEffect(() => {
    const validateAccess = async () => {
      if (!currentUser || !sessionId || !projectId) return;

      setIsValidatingAuth(true);
      setAuthError(null);

      try {
        // Validate session access
        const validation = await validateSessionAccess(projectId, sessionId);

        if (!validation.hasAccess) {
          setAuthError(validation.error || "Error de autenticación");
          redirectToLogin();
          return;
        }

        // Set project and session data
        if (validation.project) {
          setProject(validation.project);
        }
        if (validation.session) {
          setSession(validation.session);
        }
      } catch (error) {
        console.error("Error validating session access:", error);
        setAuthError("Error interno del servidor");
        redirectToProjects();
      } finally {
        setIsValidatingAuth(false);
      }
    };

    if (!currentLoading && currentUser) {
      validateAccess();
    }
  }, [currentLoading, currentUser, sessionId, projectId, router]);

  return {
    currentUser,
    currentLoading,
    isLoading: isValidatingAuth,
    hasAccess: !authError && project !== null && session !== null,
    authError,
    project,
    session,
  };
}

