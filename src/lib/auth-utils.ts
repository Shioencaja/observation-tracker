import { supabase } from "./supabase";

/**
 * Force logout by clearing all auth data without calling Supabase signOut
 * This is useful when the standard signOut fails due to session issues
 */
export const forceLogout = () => {
  console.log("🔄 Force logout: Clearing all auth data...");

  try {
    // Clear localStorage
    Object.keys(localStorage).forEach((key) => {
      if (
        key.includes("supabase") ||
        key.includes("auth") ||
        key.includes("sb-")
      ) {
        localStorage.removeItem(key);
      }
    });

    // Clear sessionStorage
    Object.keys(sessionStorage).forEach((key) => {
      if (
        key.includes("supabase") ||
        key.includes("auth") ||
        key.includes("sb-")
      ) {
        sessionStorage.removeItem(key);
      }
    });

    // Clear any cookies that might contain auth data
    document.cookie.split(";").forEach((cookie) => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      if (
        name.includes("supabase") ||
        name.includes("auth") ||
        name.includes("sb-")
      ) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });

    console.log("✅ Force logout completed");
  } catch (error) {
    console.error("❌ Error during force logout:", error);
  }
};

/**
 * Check if the current session is valid
 */
export const isSessionValid = async (): Promise<boolean> => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.warn("⚠️ Session validation error:", error);
      return false;
    }

    if (!session) {
      return false;
    }

    // Check if session is expired
    if (
      session.expires_at &&
      new Date(session.expires_at * 1000) < new Date()
    ) {
      console.warn("⚠️ Session expired");
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Error checking session validity:", error);
    return false;
  }
};

/**
 * Get the current user safely
 */
export const getCurrentUser = async () => {
  try {
    // First check if session is valid
    const sessionValid = await isSessionValid();
    if (!sessionValid) {
      return null;
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.warn("⚠️ Error getting current user:", error);
      return null;
    }

    return user;
  } catch (error) {
    console.error("❌ Error getting current user:", error);
    return null;
  }
};

/**
 * Redirect to login page (client-side)
 */
export const redirectToLogin = () => {
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};

/**
 * Redirect to projects page (client-side)
 */
export const redirectToProjects = () => {
  if (typeof window !== "undefined") {
    window.location.href = "/projects";
  }
};

/**
 * Validate project access for the current user
 */
export const validateProjectAccess = async (projectId: string) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return {
        hasAccess: false,
        error: "Usuario no autenticado",
      };
    }

    // Check if user has access to the project
    const { data: project, error } = await supabase
      .from("projects")
      .select("id, name, description, created_by, agencies, created_at, updated_at")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      return {
        hasAccess: false,
        error: "Proyecto no encontrado",
      };
    }

    // Check if user is the creator
    if (project.created_by === user.id) {
      return { hasAccess: true, project };
    }

    // Check if user has been explicitly added to the project
    const { data: projectUser, error: projectUserError } = await supabase
      .from("project_users")
      .select("user_id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single();

    if (!projectUserError && projectUser) {
      return { hasAccess: true, project };
    }

    return {
      hasAccess: false,
      error: "Sin acceso al proyecto",
    };
  } catch (error) {
    console.error("❌ Error validating project access:", error);
    return {
      hasAccess: false,
      error: "Error interno del servidor",
    };
  }
};

/**
 * Validate session access for the current user
 */
export const validateSessionAccess = async (
  projectId: string,
  sessionId: string
) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return {
        hasAccess: false,
        error: "Usuario no autenticado",
      };
    }

    // First validate project access
    const projectValidation = await validateProjectAccess(projectId);
    if (!projectValidation.hasAccess) {
      return projectValidation;
    }

    // Check if session exists and belongs to the project
    const { data: session, error } = await supabase
      .from("sessions")
      .select("id, project_id, user_id")
      .eq("id", sessionId)
      .eq("project_id", projectId)
      .single();

    if (error || !session) {
      return {
        hasAccess: false,
        error: "Sesión no encontrada",
      };
    }

    // Check if user is the session creator or has project access
    if (session.user_id === user.id) {
      return { hasAccess: true };
    }

    // If user has project access, they can view the session
    return { hasAccess: true };
  } catch (error) {
    console.error("❌ Error validating session access:", error);
    return {
      hasAccess: false,
      error: "Error interno del servidor",
    };
  }
};
