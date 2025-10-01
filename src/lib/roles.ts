import { UserRole } from "@/types/observation";

export const ROLE_LABELS: Record<UserRole, string> = {
  creator: "Creador",
  admin: "Administrador",
  editor: "Editor",
  viewer: "Observador",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  creator: "Control total del proyecto (único)",
  admin: "Gestión completa excepto eliminación",
  editor: "Puede crear y editar observaciones",
  viewer: "Solo lectura",
};

export const ROLE_COLORS: Record<
  UserRole,
  { bg: string; text: string; border: string }
> = {
  creator: {
    bg: "bg-purple-100",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  admin: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  editor: {
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-200",
  },
  viewer: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-200",
  },
};

export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role] || role;
}

export function getRoleDescription(role: UserRole): string {
  return ROLE_DESCRIPTIONS[role] || "";
}

export function getRoleColor(role: UserRole) {
  return ROLE_COLORS[role] || ROLE_COLORS.viewer;
}

// Permission checks
export function canManageUsers(role: UserRole): boolean {
  return role === "creator" || role === "admin";
}

export function canEditProject(role: UserRole): boolean {
  return role === "creator" || role === "admin";
}

export function canDeleteProject(role: UserRole): boolean {
  return role === "creator"; // Only creator can delete
}

export function canFinishProject(role: UserRole): boolean {
  return role === "creator" || role === "admin";
}

export function canCreateSessions(role: UserRole): boolean {
  return role !== "viewer"; // All except viewer
}

export function canEditObservations(role: UserRole): boolean {
  return role !== "viewer"; // All except viewer
}

export function canViewAllSessions(role: UserRole): boolean {
  return true; // All roles can view sessions
}

export function canManageQuestions(role: UserRole): boolean {
  return role === "creator" || role === "admin" || role === "editor";
}

export function canEditQuestionDetails(role: UserRole): boolean {
  return role === "creator" || role === "admin" || role === "editor";
}

export function canAddAgencies(role: UserRole): boolean {
  return role !== "viewer"; // All except viewer
}

export function canAccessSettings(role: UserRole): boolean {
  return role !== "viewer"; // Viewer cannot access settings at all
}
