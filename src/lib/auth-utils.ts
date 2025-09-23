import { supabase } from "./supabase";

export interface AuthError {
  message: string;
  code?: string;
}

export async function validateProjectAccess(
  projectId: string
): Promise<{ hasAccess: boolean; project?: any; error?: string }> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { hasAccess: false, error: "Usuario no autenticado" };
    }

    // Check if user has access to the project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return { hasAccess: false, error: "Proyecto no encontrado" };
    }

    // Check if user is the creator or has been added to the project
    const { data: projectUser, error: projectUserError } = await supabase
      .from("project_users")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single();

    if (project.created_by === user.id || projectUser) {
      return { hasAccess: true, project };
    }

    return { hasAccess: false, error: "No tienes acceso a este proyecto" };
  } catch (error) {
    return { hasAccess: false, error: "Error de validación" };
  }
}

export async function validateSessionAccess(
  projectId: string,
  sessionId: string
): Promise<{
  hasAccess: boolean;
  project?: any;
  session?: any;
  error?: string;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { hasAccess: false, error: "Usuario no autenticado" };
    }

    // First validate project access
    const projectAccess = await validateProjectAccess(projectId);
    if (!projectAccess.hasAccess) {
      return projectAccess;
    }

    // Check if session exists and belongs to the project
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("project_id", projectId)
      .single();

    if (sessionError || !session) {
      return { hasAccess: false, error: "Sesión no encontrada" };
    }

    return { hasAccess: true, project: projectAccess.project, session };
  } catch (error) {
    return { hasAccess: false, error: "Error de validación" };
  }
}

export async function validateDateSessionsAccess(
  projectId: string,
  selectedDate: string
): Promise<{ hasAccess: boolean; project?: any; error?: string }> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { hasAccess: false, error: "Usuario no autenticado" };
    }

    // Validate project access
    const projectAccess = await validateProjectAccess(projectId);
    if (!projectAccess.hasAccess) {
      return projectAccess;
    }

    return { hasAccess: true, project: projectAccess.project };
  } catch (error) {
    return { hasAccess: false, error: "Error de validación" };
  }
}

export async function isProjectCreator(projectId: string): Promise<boolean> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return false;
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("created_by")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return false;
    }

    return project.created_by === user.id;
  } catch (error) {
    return false;
  }
}

export function redirectToLogin() {
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

export function redirectToProjects() {
  if (typeof window !== "undefined") {
    window.location.href = "/projects";
  }
}
