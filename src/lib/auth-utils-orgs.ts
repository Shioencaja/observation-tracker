import { supabase } from "@/lib/supabase";
import {
  UserRole,
  OrganizationWithAccess,
  ProjectWithAccess,
  UserWithOrganizations,
  Tables,
} from "@/types/supabase-orgs";

// Helper function to clear all Supabase-related data
export const forceLogout = () => {
  try {
    // Clear local storage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes("supabase") || key.includes("auth"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    // Clear session storage
    const sessionKeysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes("supabase") || key.includes("auth"))) {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach((key) => sessionStorage.removeItem(key));

    // Clear cookies
    document.cookie.split(";").forEach((cookie) => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      if (name.includes("supabase") || name.includes("auth")) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });

    console.log("✅ Force logout completed - all auth data cleared");
  } catch (error) {
    console.error("Error during force logout:", error);
  }
};

// Check if there's a valid Supabase session
export const isSessionValid = async (): Promise<boolean> => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Error checking session validity:", error);
      return false;
    }

    if (!session) {
      return false;
    }

    // Check if session is expired
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at < now) {
      console.log("Session expired");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error validating session:", error);
    return false;
  }
};

// Get current user safely
export const getCurrentUser = async () => {
  try {
    // Check session validity first
    const isValid = await isSessionValid();
    if (!isValid) {
      console.log("No valid session found");
      return null;
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Error fetching user:", error);
      return null;
    }

    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

// Client-side redirect functions
export const redirectToLogin = () => {
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};

export const redirectToOrganizations = () => {
  if (typeof window !== "undefined") {
    window.location.href = "/organizations";
  }
};

export const redirectToOrganization = (orgSlug: string) => {
  if (typeof window !== "undefined") {
    window.location.href = `/org/${orgSlug}`;
  }
};

// Organization access validation
export const validateOrganizationAccess = async (
  organizationId: string
): Promise<{
  hasAccess: boolean;
  error?: string;
  organization?: Tables<"organizations">;
}> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return {
        hasAccess: false,
        error: "Usuario no autenticado",
      };
    }

    // Check if user has access to the organization
    const { data: orgUser, error } = await supabase
      .from("organization_users")
      .select(
        `
        organization_id,
        role,
        organizations (*)
      `
      )
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .single();

    if (error || !orgUser) {
      return {
        hasAccess: false,
        error: "No tienes acceso a esta organización",
      };
    }

    return {
      hasAccess: true,
      organization: orgUser.organizations as Tables<"organizations">,
    };
  } catch (error) {
    console.error("Error validating organization access:", error);
    return {
      hasAccess: false,
      error: "Error interno del servidor",
    };
  }
};

// Project access validation (organization-aware)
export const validateProjectAccess = async (
  projectId: string
): Promise<{
  hasAccess: boolean;
  error?: string;
  project?: ProjectWithAccess;
  organization?: Tables<"organizations">;
}> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return {
        hasAccess: false,
        error: "Usuario no autenticado",
      };
    }

    // Get project with organization info
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(
        `
        *,
        organizations (*)
      `
      )
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return {
        hasAccess: false,
        error: "Proyecto no encontrado",
      };
    }

    const organization = project.organizations as Tables<"organizations">;

    // Check if user has access to the organization
    const orgAccess = await validateOrganizationAccess(organization.id);
    if (!orgAccess.hasAccess) {
      return {
        hasAccess: false,
        error: "No tienes acceso a la organización de este proyecto",
      };
    }

    // Check project-specific access
    const { data: projectUser, error: projectUserError } = await supabase
      .from("project_users")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single();

    // Get user's organization role
    const { data: orgUser, error: orgUserError } = await supabase
      .from("organization_users")
      .select("role")
      .eq("organization_id", organization.id)
      .eq("user_id", user.id)
      .single();

    const hasProjectAccess =
      projectUser || orgUser || project.created_by === user.id;
    const userRole =
      projectUser?.role ||
      orgUser?.role ||
      (project.created_by === user.id ? "owner" : "member");

    if (!hasProjectAccess) {
      return {
        hasAccess: false,
        error: "No tienes acceso a este proyecto",
      };
    }

    // Get session count for the project
    const { count: sessionCount } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId);

    const projectWithAccess: ProjectWithAccess = {
      ...project,
      organization,
      user_role: userRole as UserRole,
      session_count: sessionCount || 0,
      can_edit: ["owner", "admin"].includes(userRole),
      can_delete: userRole === "owner" || orgUser?.role === "owner",
    };

    return {
      hasAccess: true,
      project: projectWithAccess,
      organization,
    };
  } catch (error) {
    console.error("Error validating project access:", error);
    return {
      hasAccess: false,
      error: "Error interno del servidor",
    };
  }
};

// Session access validation
export const validateSessionAccess = async (
  projectId: string,
  sessionId: string
): Promise<{
  hasAccess: boolean;
  error?: string;
  session?: Tables<"sessions">;
  project?: ProjectWithAccess;
  organization?: Tables<"organizations">;
}> => {
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
      .select(
        "id, project_id, user_id, agency, start_time, end_time, created_at, updated_at"
      )
      .eq("id", sessionId)
      .eq("project_id", projectId)
      .single();

    if (error || !session) {
      return {
        hasAccess: false,
        error: "Sesión no encontrada",
      };
    }

    // Check if user can access this session
    const canAccess =
      session.user_id === user.id ||
      projectValidation.project?.can_edit ||
      (projectValidation.organization &&
        (await validateOrganizationAccess(projectValidation.organization.id))
          .hasAccess);

    if (!canAccess) {
      return {
        hasAccess: false,
        error: "No tienes acceso a esta sesión",
      };
    }

    return {
      hasAccess: true,
      session: session,
      project: projectValidation.project,
      organization: projectValidation.organization,
    };
  } catch (error) {
    console.error("Error validating session access:", error);
    return {
      hasAccess: false,
      error: "Error interno del servidor",
    };
  }
};

// Get user's organizations
export const getUserOrganizations = async (): Promise<
  OrganizationWithAccess[]
> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase.rpc("get_user_organizations", {
      user_id: user.id,
    });

    if (error) {
      console.error("Error fetching user organizations:", error);
      return [];
    }

    // Get member and project counts for each organization
    const organizationsWithCounts = await Promise.all(
      data.map(async (org: any) => {
        const [memberCount, projectCount] = await Promise.all([
          supabase
            .from("organization_users")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", org.organization_id),
          supabase
            .from("projects")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", org.organization_id),
        ]);

        return {
          id: org.organization_id,
          name: org.organization_name,
          slug: org.organization_slug,
          description: null,
          logo_url: null,
          website_url: null,
          status: "active" as const,
          settings: {},
          created_at: null,
          updated_at: null,
          user_role: org.user_role,
          user_joined_at: org.joined_at,
          member_count: memberCount.count || 0,
          project_count: projectCount.count || 0,
        };
      })
    );

    return organizationsWithCounts;
  } catch (error) {
    console.error("Error getting user organizations:", error);
    return [];
  }
};

// Check if user has permission for a specific action
export const hasPermission = (
  userRole: UserRole,
  action: string,
  resource: string
): boolean => {
  const permissions: Record<UserRole, string[]> = {
    owner: ["*"], // Owner has all permissions
    admin: ["read", "write", "update", "delete", "invite", "manage_projects"],
    member: ["read", "write", "update", "create_sessions"],
    viewer: ["read"],
  };

  const userPermissions = permissions[userRole] || [];
  return userPermissions.includes("*") || userPermissions.includes(action);
};

// Check if user can manage organization
export const canManageOrganization = (userRole: UserRole): boolean => {
  return ["owner", "admin"].includes(userRole);
};

// Check if user can manage projects
export const canManageProjects = (userRole: UserRole): boolean => {
  return ["owner", "admin"].includes(userRole);
};

// Check if user can invite members
export const canInviteMembers = (userRole: UserRole): boolean => {
  return ["owner", "admin"].includes(userRole);
};

// Check if user can delete resources
export const canDelete = (userRole: UserRole): boolean => {
  return userRole === "owner";
};

// Get user's role in organization
export const getUserOrganizationRole = async (
  organizationId: string
): Promise<UserRole | null> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return null;
    }

    const { data, error } = await supabase.rpc("get_user_organization_role", {
      user_id: user.id,
      org_id: organizationId,
    });

    if (error) {
      console.error("Error getting user organization role:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error getting user organization role:", error);
    return null;
  }
};

// Create organization
export const createOrganization = async (
  name: string,
  description?: string
): Promise<{ success: boolean; organizationId?: string; error?: string }> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return {
        success: false,
        error: "Usuario no autenticado",
      };
    }

    const { data, error } = await supabase.rpc(
      "create_organization_with_owner",
      {
        org_name: name,
        org_description: description,
        owner_user_id: user.id,
      }
    );

    if (error) {
      console.error("Error creating organization:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      organizationId: data,
    };
  } catch (error) {
    console.error("Error creating organization:", error);
    return {
      success: false,
      error: "Error interno del servidor",
    };
  }
};


