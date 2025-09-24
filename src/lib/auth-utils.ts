import { supabase } from "./supabase";
import { redirect } from "next/navigation";

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
    return !error && !!session;
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
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      console.error("❌ Error getting current user:", error);
      return null;
    }
    return user;
  } catch (error) {
    console.error("❌ Error getting current user:", error);
    return null;
  }
};

/**
 * Redirect to login page
 */
export const redirectToLogin = () => {
  redirect("/login");
};

/**
 * Redirect to projects page
 */
export const redirectToProjects = () => {
  redirect("/projects");
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
        error: "Usuario no autenticado"
      };
    }

    // Check if user has access to the project
    const { data: project, error } = await supabase
      .from("projects")
      .select("id, name, created_by")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      return {
        hasAccess: false,
        error: "Proyecto no encontrado"
      };
    }

    // Check if user is the creator or has access through organization
    if (project.created_by === user.id) {
      return { hasAccess: true };
    }

    // Check organization access
    const { data: orgAccess, error: orgError } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (orgError || !orgAccess) {
      return {
        hasAccess: false,
        error: "Sin acceso al proyecto"
      };
    }

    const { data: projectOrg, error: projectOrgError } = await supabase
      .from("projects")
      .select("organization_id")
      .eq("id", projectId)
      .single();

    if (projectOrgError || !projectOrg) {
      return {
        hasAccess: false,
        error: "Error verificando acceso organizacional"
      };
    }

    if (orgAccess.organization_id === projectOrg.organization_id) {
      return { hasAccess: true };
    }

    return {
      hasAccess: false,
      error: "Sin acceso al proyecto"
    };
  } catch (error) {
    console.error("❌ Error validating project access:", error);
    return {
      hasAccess: false,
      error: "Error interno del servidor"
    };
  }
};

/**
 * Validate session access for the current user
 */
export const validateSessionAccess = async (projectId: string, sessionId: string) => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return {
        hasAccess: false,
        error: "Usuario no autenticado"
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
        error: "Sesión no encontrada"
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
      error: "Error interno del servidor"
    };
  }
};
