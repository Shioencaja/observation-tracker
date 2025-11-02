"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  LogOut,
  User,
  ArrowLeft,
  Trash2,
  X,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectRole } from "@/hooks/use-project-role";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Project, ProjectObservationOption } from "@/types/observation";
import QuestionManager from "@/components/QuestionManager";

// Draggable Option Component
interface DraggableOptionProps {
  option: ProjectObservationOption;
  index: number;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string, isVisible: boolean) => void;
  canEdit?: boolean;
}

function DraggableOption({
  option,
  index,
  onDelete,
  onToggleVisibility,
  canEdit = false,
}: DraggableOptionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `option-${option.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case "string":
        return "📝 Texto libre";
      case "boolean":
        return "✅ Sí/No";
      case "radio":
        return "🔘 Opción única";
      case "checkbox":
        return "☑️ Múltiples opciones";
      case "counter":
        return "🔢 Contador";
      case "timer":
        return "⏱️ Temporizador";
      case "voice":
        return "🎙️ Grabación de voz";
      default:
        return type;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden ${
        isDragging ? "shadow-lg border-blue-300" : ""
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
        {canEdit && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded flex-shrink-0"
          >
            <GripVertical size={16} className="text-gray-400" />
          </div>
        )}
        {!canEdit && <div className="w-6 flex-shrink-0" />}
        <div className="flex flex-col gap-1 min-w-0 flex-1 overflow-hidden">
          <span className="font-medium text-gray-900 break-words">
            {option.name}
          </span>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border-blue-200"
            >
              {getQuestionTypeLabel(option.question_type)}
            </Badge>
            <Badge
              className={`text-xs px-2 py-1 ${
                option.is_visible
                  ? "bg-green-100 text-green-800 border-green-200"
                  : "bg-gray-100 text-gray-600 border-gray-200"
              }`}
            >
              {option.is_visible ? "Visible" : "Oculta"}
            </Badge>
            {option.description && (
              <span className="text-xs text-gray-500 truncate max-w-32">
                {option.description}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleVisibility(option.id, !option.is_visible)}
            className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
            title={option.is_visible ? "Ocultar opción" : "Mostrar opción"}
          >
          {option.is_visible ? (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
              />
            </svg>
          )}
          </Button>
        )}
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(option.id)}
            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
            title="Eliminar opción"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </Button>
        )}
      </div>
    </div>
  );
}

function ProjectSettingsPageContent() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [options, setOptions] = useState<ProjectObservationOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionType, setNewOptionType] = useState<
    "string" | "boolean" | "radio" | "checkbox" | "counter" | "timer" | "voice"
  >("string");
  const [newOptionOptions, setNewOptionOptions] = useState<string[]>([]);
  const [newOptionOption, setNewOptionOption] = useState("");
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveReminder, setShowSaveReminder] = useState(false);

  // Get user role for the project
  const projectId = searchParams.get("project");
  const { role } = useProjectRole(
    projectId || "",
    user?.id || "",
    project?.created_by || ""
  );
  
  // Check if user can edit (creator or admin)
  const canEdit = role === "creator" || role === "admin";

  // Form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAgencies, setEditAgencies] = useState<string[]>([]);
  const [newAgency, setNewAgency] = useState("");

  // User management state
  const [projectUsers, setProjectUsers] = useState<
    Array<{
      id: string;
      user_id: string;
      user_email: string;
      created_at: string;
    }>
  >([]);
  const [allUsers, setAllUsers] = useState<
    Array<{ id: string; user_id: string; email: string }>
  >([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isRemovingUser, setIsRemovingUser] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = options.findIndex(
        (option) => `option-${option.id}` === active.id
      );
      const newIndex = options.findIndex(
        (option) => `option-${option.id}` === over.id
      );

      const newOptions = arrayMove(options, oldIndex, newIndex);

      // Update local state immediately for responsive UI
      setOptions(newOptions);
      setHasUnsavedChanges(true);

      // Update order in database
      try {
        const updates = newOptions.map((option, index) => ({
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
      } catch (error) {
        console.error("Error updating question order:", error);
        // Revert local state on error
        setOptions(options);
        setHasUnsavedChanges(false);
      }
    }
  };

  // Load project from URL parameter
  const loadProject = useCallback(async () => {
    const projectId = searchParams.get("project");
    if (!projectId) {
      setIsLoadingProject(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      setProject(data);
      setEditName(data.name);
      setEditDescription(data.description || "");
      setEditAgencies(data.agencies || []);
    } catch (error) {
      console.error("Error loading project:", error);
      setError("Error al cargar el proyecto");
    } finally {
      setIsLoadingProject(false);
    }
  }, [searchParams]);

  // Load observation options
  const loadObservationOptions = useCallback(async () => {
    if (!project) return;

    setIsLoadingOptions(true);
    try {
      const { data, error } = await supabase
        .from("project_observation_options")
        .select("*")
        .eq("project_id", project.id)
        .order("order", { ascending: true });

      if (error) throw error;
      setOptions(data || []);
    } catch (error) {
      console.error("Error loading observation options:", error);
      setError("Error al cargar las opciones de observación");
    } finally {
      setIsLoadingOptions(false);
    }
  }, [project]);

  // Load project users
  const loadProjectUsers = useCallback(async () => {
    if (!project) return;

    setIsLoadingUsers(true);

    // Always set empty array initially to avoid errors
    setProjectUsers([]);

    // Try a simple test query first to see if the table exists
    try {
      const { error: testError } = await supabase
        .from("project_users")
        .select("id")
        .limit(0);

      if (testError) {
        console.log("project_users table test failed:", testError);
        console.log("Skipping user management - table doesn't exist");
        return;
      }
    } catch (testErr) {
      console.log("project_users table test exception:", testErr);
      console.log("Skipping user management - table doesn't exist");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("project_users")
        .select("*")
        .eq("project_id", project.id);

      if (error) {
        // If the table doesn't exist, just set empty array and continue
        const errorMessage = error.message || "";
        const errorCode = error.code || "";

        if (
          errorCode === "PGRST116" ||
          errorMessage.includes('relation "project_users" does not exist') ||
          errorMessage.includes("does not exist") ||
          errorMessage.includes("relation") ||
          errorCode === "42P01" || // PostgreSQL error code for "relation does not exist"
          errorCode === "PGRST202" // PostgREST error for missing relation
        ) {
          console.log(
            "project_users table doesn't exist yet, skipping user management"
          );
          return;
        }
        throw error;
      }

      // Get user emails for the project users
      if (data && data.length > 0) {
        try {
          const userIds = data.map((pu) => pu.user_id);
          const { data: userEmails, error: emailError } = await supabase.rpc(
            "get_user_emails",
            { user_ids: userIds }
          );

          if (emailError) {
            console.error("Error loading user emails:", emailError);
            // Fallback: just use the data without emails
            setProjectUsers(
              data.map((pu) => ({ ...pu, user_email: pu.user_id }))
            );
          } else {
            // Map user emails to project users
            const projectUsersWithEmails = data.map((pu) => ({
              ...pu,
              user_email:
                userEmails?.find(
                  (ue: { user_id: string; email: string }) =>
                    ue.user_id === pu.user_id
                )?.email || pu.user_id,
            }));
            setProjectUsers(projectUsersWithEmails);
          }
        } catch (emailError) {
          console.error("Error in email loading:", emailError);
          // Fallback: just use the data without emails
          setProjectUsers(
            data.map((pu) => ({ ...pu, user_email: pu.user_id }))
          );
        }
      }
    } catch (error) {
      console.error("Error loading project users:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        code: (error as { code?: string; message?: string })?.code,
        details: error,
      });

      // Check if this is a "table doesn't exist" error
      const errorMessage =
        (error as { code?: string; message?: string })?.message || "";
      const errorCode =
        (error as { code?: string; message?: string })?.code || "";

      const isTableMissingError =
        errorCode === "PGRST116" ||
        errorMessage.includes('relation "project_users" does not exist') ||
        errorMessage.includes("does not exist") ||
        errorMessage.includes("relation") ||
        errorCode === "42P01" ||
        errorCode === "PGRST202";

      // Don't set error state for missing table, just log it
      if (!isTableMissingError) {
        setError("Error al cargar los usuarios del proyecto");
      }
    } finally {
      setIsLoadingUsers(false);
    }
  }, [project]);

  // Load all users for the combobox
  const loadAllUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("get_all_users");

      if (error) {
        // If the function doesn't exist, just set empty array and continue
        if (
          error.code === "PGRST202" ||
          error.message?.includes("function get_all_users") ||
          error.message?.includes("does not exist")
        ) {
          console.log(
            "get_all_users function doesn't exist yet, skipping user management"
          );
          setAllUsers([]);
          return;
        }
        throw error;
      }
      setAllUsers(data || []);
    } catch (error) {
      console.error("Error loading all users:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        code: (error as { code?: string; message?: string })?.code,
        details: error,
      });
      // Don't set error state for missing function, just log it
      if (
        !(
          (error as { code?: string; message?: string })?.code === "PGRST202" ||
          (error as { code?: string; message?: string })?.message?.includes(
            "function get_all_users"
          ) ||
          (error as { code?: string; message?: string })?.message?.includes(
            "does not exist"
          )
        )
      ) {
        setError("Error al cargar los usuarios");
      }
      setAllUsers([]);
    }
  }, []);

  // Add user to project
  const addUserToProject = async () => {
    if (!project || !selectedUserId || !user || isAddingUser) return;

    setIsAddingUser(true);

    // First, check if the table exists by trying a simple query
    try {
      const { error: testError } = await supabase
        .from("project_users")
        .select("id")
        .limit(0);

      if (testError) {
        console.log("project_users table test failed:", testError);
        setError(
          "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
        );
        return;
      }
    } catch (testErr) {
      console.log("project_users table test exception:", testErr);
      setError(
        "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
      );
      return;
    }

    try {
      const { error } = await supabase.from("project_users").insert({
        project_id: project.id,
        user_id: selectedUserId,
        added_by: user.id,
      });

      if (error) {
        // Check if this is a "table doesn't exist" error
        const errorMessage = error.message || "";
        const errorCode = error.code || "";

        if (
          errorCode === "PGRST116" ||
          errorMessage.includes('relation "project_users" does not exist') ||
          errorMessage.includes("does not exist") ||
          errorMessage.includes("relation") ||
          errorCode === "42P01" || // PostgreSQL error code for "relation does not exist"
          errorCode === "PGRST202" // PostgREST error for missing relation
        ) {
          setError(
            "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
          );
          return;
        }
        throw error;
      }
      await loadProjectUsers();
      setSelectedUserId("");
    } catch (error) {
      console.error("Error adding user to project:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        code: (error as { code?: string; message?: string })?.code,
        details: error,
      });

      // Check if this is a "table doesn't exist" error
      const errorMessage =
        (error as { code?: string; message?: string })?.message || "";
      const errorCode =
        (error as { code?: string; message?: string })?.code || "";

      const isTableMissingError =
        errorCode === "PGRST116" ||
        errorMessage.includes('relation "project_users" does not exist') ||
        errorMessage.includes("does not exist") ||
        errorMessage.includes("relation") ||
        errorCode === "42P01" ||
        errorCode === "PGRST202";

      if (isTableMissingError) {
        setError(
          "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
        );
      } else {
        setError("Error al agregar usuario al proyecto");
      }
    } finally {
      setIsAddingUser(false);
    }
  };

  // Remove user from project
  const removeUserFromProject = async (userId: string) => {
    if (!project || isRemovingUser) return;

    setIsRemovingUser(true);

    // First, check if the table exists by trying a simple query
    try {
      const { error: testError } = await supabase
        .from("project_users")
        .select("id")
        .limit(0);

      if (testError) {
        console.log("project_users table test failed:", testError);
        setError(
          "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
        );
        return;
      }
    } catch (testErr) {
      console.log("project_users table test exception:", testErr);
      setError(
        "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
      );
      return;
    }

    try {
      const { error } = await supabase
        .from("project_users")
        .delete()
        .eq("project_id", project.id)
        .eq("user_id", userId);

      if (error) {
        // Check if this is a "table doesn't exist" error
        const errorMessage = error.message || "";
        const errorCode = error.code || "";

        if (
          errorCode === "PGRST116" ||
          errorMessage.includes('relation "project_users" does not exist') ||
          errorMessage.includes("does not exist") ||
          errorMessage.includes("relation") ||
          errorCode === "42P01" || // PostgreSQL error code for "relation does not exist"
          errorCode === "PGRST202" // PostgREST error for missing relation
        ) {
          setError(
            "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
          );
          return;
        }
        throw error;
      }
      await loadProjectUsers();
    } catch (error) {
      console.error("Error removing user from project:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        code: (error as { code?: string; message?: string })?.code,
        details: error,
      });

      // Check if this is a "table doesn't exist" error
      const errorMessage =
        (error as { code?: string; message?: string })?.message || "";
      const errorCode =
        (error as { code?: string; message?: string })?.code || "";

      const isTableMissingError =
        errorCode === "PGRST116" ||
        errorMessage.includes('relation "project_users" does not exist') ||
        errorMessage.includes("does not exist") ||
        errorMessage.includes("relation") ||
        errorCode === "42P01" ||
        errorCode === "PGRST202";

      if (isTableMissingError) {
        setError(
          "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
        );
      } else {
        setError("Error al remover usuario del proyecto");
      }
    } finally {
      setIsRemovingUser(false);
    }
  };

  // Add agency
  const addAgency = () => {
    if (newAgency.trim() && !editAgencies.includes(newAgency.trim())) {
      setEditAgencies([...editAgencies, newAgency.trim()]);
      setNewAgency("");
      setHasUnsavedChanges(true);
      setShowSaveReminder(true);

      // Auto-hide the reminder after 5 seconds
      setTimeout(() => {
        setShowSaveReminder(false);
      }, 5000);
    }
  };

  // Remove agency
  const removeAgency = (agency: string) => {
    setEditAgencies(editAgencies.filter((a) => a !== agency));
    setHasUnsavedChanges(true);
    setShowSaveReminder(true);

    // Auto-hide the reminder after 5 seconds
    setTimeout(() => {
      setShowSaveReminder(false);
    }, 5000);
  };

  // Add option option (for radio/checkbox types)
  const addOptionOption = () => {
    if (
      newOptionOption.trim() &&
      !newOptionOptions.includes(newOptionOption.trim())
    ) {
      setNewOptionOptions([...newOptionOptions, newOptionOption.trim()]);
      setNewOptionOption("");
    }
  };

  // Remove option option
  const removeOptionOption = (option: string) => {
    setNewOptionOptions(newOptionOptions.filter((o) => o !== option));
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    if (project) {
      loadObservationOptions();
      loadProjectUsers();
      loadAllUsers();
      // Reset unsaved changes when project loads
      setHasUnsavedChanges(false);
      setShowSaveReminder(false);
    }
  }, [project, loadObservationOptions, loadProjectUsers, loadAllUsers]);

  // Track changes to project name and description
  useEffect(() => {
    if (project) {
      const hasChanges =
        editName !== project.name ||
        editDescription !== (project.description || "") ||
        JSON.stringify(editAgencies.sort()) !==
          JSON.stringify((project.agencies || []).sort());

      setHasUnsavedChanges(hasChanges);
    }
  }, [project, editName, editDescription, editAgencies]);

  const handleUpdateProject = async () => {
    if (!project || !user) return;

    setIsSaving(true);
    try {
      // Try to update with agencies first
      const updateData: {
        name: string;
        description: string | null;
        updated_at: string;
        agencies?: string[];
      } = {
        name: editName.trim(),
        description: editDescription.trim() || null,
        updated_at: new Date().toISOString(),
      };

      // Only include agencies if the column exists
      try {
        updateData.agencies = editAgencies;
      } catch {
        // If agencies column doesn't exist, just skip it
        console.log("Agencies column doesn't exist, skipping agencies update");
      }

      const { error } = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", project.id)
        .eq("created_by", user.id);

      if (error) {
        // If agencies column doesn't exist, try without it
        if (error.message?.includes('column "agencies" does not exist')) {
          console.log(
            "Agencies column doesn't exist, updating without agencies"
          );
          const { error: retryError } = await supabase
            .from("projects")
            .update({
              name: editName.trim(),
              description: editDescription.trim() || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", project.id)
            .eq("created_by", user.id);

          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }

      // Update local state
      setProject((prev) =>
        prev
          ? {
              ...prev,
              name: editName.trim(),
              description: editDescription.trim() || null,
              agencies: editAgencies,
            }
          : null
      );

      // Reset unsaved changes flag
      setHasUnsavedChanges(false);
      setShowSaveReminder(false);
    } catch (error) {
      console.error("Error updating project:", error);
      setError("Error al actualizar el proyecto");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project || !user) return;

    setIsDeletingProject(true);
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id)
        .eq("created_by", user.id);

      if (error) throw error;

      // Redirect to projects page
      router.push("/projects");
    } catch (error) {
      console.error("Error deleting project:", error);
      setError("Error al eliminar el proyecto");
    } finally {
      setIsDeletingProject(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleAddOption = async () => {
    if (!newOptionName.trim() || !project) return;

    setIsAddingOption(true);
    try {
      // Try to insert with new columns first
      const insertData: {
        project_id: string;
        name: string;
        description: string | null;
        question_type: string;
        options: string[];
        is_visible: boolean;
        sort_order?: number;
      } = {
        project_id: project.id,
        name: newOptionName.trim(),
        description: null,
        question_type: newOptionType,
        options: newOptionOptions,
        is_visible: true,
        sort_order: options.length + 1,
      };

      // Properties are already set in the object above

      const { error } = await supabase
        .from("project_observation_options")
        .insert(insertData);

      if (error) {
        // If new columns don't exist, try without them
        if (
          error.message?.includes('column "question_type" does not exist') ||
          error.message?.includes('column "options" does not exist')
        ) {
          console.log(
            "New columns don't exist, inserting without question_type and options"
          );
          const { error: retryError } = await supabase
            .from("project_observation_options")
            .insert({
              project_id: project.id,
              name: newOptionName.trim(),
              description: null,
              is_visible: true,
            });

          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }

      setNewOptionName("");
      setNewOptionType("string");
      setNewOptionOptions([]);
      setNewOptionOption("");
      loadObservationOptions();
    } catch (error) {
      console.error("Error adding observation option:", error);
      setError("Error al agregar opción de observación");
    } finally {
      setIsAddingOption(false);
    }
  };

  const handleToggleOptionVisibility = async (
    optionId: string,
    currentVisibility: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("project_observation_options")
        .update({ is_visible: !currentVisibility })
        .eq("id", optionId);

      if (error) throw error;

      loadObservationOptions();
    } catch (error) {
      console.error("Error toggling option visibility:", error);
      setError("Error al cambiar visibilidad de la opción");
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    try {
      const { error } = await supabase
        .from("project_observation_options")
        .delete()
        .eq("id", optionId);

      if (error) throw error;

      loadObservationOptions();
    } catch (error) {
      console.error("Error deleting option:", error);
      setError("Error al eliminar la opción");
    }
  };

  // New question management handlers
  const handleQuestionUpdated = useCallback(
    (updatedQuestion: ProjectObservationOption) => {
      setOptions((prev) =>
        prev.map((opt) =>
          opt.id === updatedQuestion.id ? updatedQuestion : opt
        )
      );
      setHasUnsavedChanges(true);
    },
    []
  );

  const handleQuestionDeleted = useCallback((questionId: string) => {
    setOptions((prev) => prev.filter((opt) => opt.id !== questionId));
    setHasUnsavedChanges(true);
  }, []);

  const handleQuestionDuplicated = useCallback(
    (duplicatedQuestion: ProjectObservationOption) => {
      setOptions((prev) => [...prev, duplicatedQuestion]);
      setHasUnsavedChanges(true);
    },
    []
  );

  const handleBackToProjects = () => {
    router.push("/projects");
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (authLoading || isLoadingProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/50 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || !project) {
    return null; // Will redirect
  }

  const isCreator = user.id === project.created_by;
  const canEditQuestions = canEdit;

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/50 to-background">
      {/* Header */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-3 sm:px-4">
          <div className="flex h-12 sm:h-14 items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                onClick={handleBackToProjects}
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
              >
                <ArrowLeft size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Proyectos</span>
              </Button>
              <div>
                <h1 className="text-base sm:text-lg font-semibold">
                  Configuración del Proyecto
                </h1>
                <p className="text-xs text-muted-foreground truncate max-w-32 sm:max-w-none">
                  {project.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <User size={16} />
                <span className="max-w-32 truncate">{user.email}</span>
              </div>
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
              >
                <LogOut size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        <div className="space-y-4 sm:space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {showSaveReminder && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>
                  ¡Recuerda hacer clic en "Guardar Cambios" para guardar las
                  modificaciones!
                </span>
              </div>
              <button
                onClick={() => setShowSaveReminder(false)}
                className="text-blue-500 hover:text-blue-700 ml-2"
                aria-label="Cerrar notificación"
                title="Cerrar notificación"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Project Information */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Información del Proyecto
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="project-name"
                  className="text-sm font-medium text-gray-700"
                >
                  Nombre del Proyecto
                </Label>
                <Input
                  id="project-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nombre del proyecto"
                  disabled={!isCreator}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="project-description"
                  className="text-sm font-medium text-gray-700"
                >
                  Descripción
                </Label>
                <Textarea
                  id="project-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Descripción del proyecto (opcional)"
                  rows={3}
                  disabled={!isCreator}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              {isCreator && (
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleUpdateProject}
                    disabled={isSaving || !editName.trim()}
                    className={`${
                      hasUnsavedChanges
                        ? "bg-orange-600 hover:bg-orange-700 ring-2 ring-orange-200"
                        : "bg-blue-600 hover:bg-blue-700"
                    } text-white transition-all duration-200`}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        {hasUnsavedChanges && (
                          <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                        )}
                        Guardar Cambios
                        {hasUnsavedChanges && " *"}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Agencies Management */}
          {isCreator && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">
                  Agencias
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Define las agencias disponibles para este proyecto
                </p>
              </div>
              <div className="p-6 space-y-4">
                {/* Add Agency Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Agregar Agencia
                  </h3>
                  <div className="flex gap-3">
                    <Input
                      value={newAgency}
                      onChange={(e) => setNewAgency(e.target.value)}
                      placeholder="Nombre de la agencia"
                      className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors"
                      onKeyPress={(e) => e.key === "Enter" && addAgency()}
                    />
                    <Button
                      onClick={addAgency}
                      disabled={!newAgency.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Agregar
                    </Button>
                  </div>
                </div>

                {/* Current Agencies List */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Agencias Configuradas ({editAgencies.length})
                  </h3>
                  {editAgencies.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No hay agencias configuradas</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {editAgencies.map((agency, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-green-600 text-xs font-medium">
                                {agency.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {agency}
                            </span>
                          </div>
                          <Button
                            onClick={() => removeAgency(agency)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* User Management */}
          {isCreator && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">
                  Usuarios del Proyecto
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Gestiona quién puede acceder a este proyecto
                </p>
              </div>
              <div className="p-6 space-y-4">
                {/* Add User Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Agregar Usuario
                  </h3>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Select
                        value={selectedUserId}
                        onValueChange={setSelectedUserId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar usuario..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allUsers
                            .filter(
                              (u) =>
                                !projectUsers.some(
                                  (pu) => pu.user_id === u.user_id
                                )
                            )
                            .map((user) => (
                              <SelectItem
                                key={user.user_id}
                                value={user.user_id}
                              >
                                {user.email}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={addUserToProject}
                      disabled={!selectedUserId || isAddingUser}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      {isAddingUser ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Agregando...</span>
                        </div>
                      ) : (
                        "Agregar"
                      )}
                    </Button>
                  </div>
                </div>

                {/* Current Users List */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Usuarios con Acceso ({projectUsers.length})
                  </h3>
                  {isLoadingUsers ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <p className="text-sm">Cargando usuarios...</p>
                      </div>
                    </div>
                  ) : projectUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No hay usuarios agregados</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {projectUsers.map((projectUser) => (
                        <div
                          key={projectUser.id}
                          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                projectUser.user_id === project?.created_by
                                  ? "bg-green-100"
                                  : "bg-blue-100"
                              }`}
                            >
                              <span
                                className={`text-sm font-medium ${
                                  projectUser.user_id === project?.created_by
                                    ? "text-green-600"
                                    : "text-blue-600"
                                }`}
                              >
                                {(projectUser.user_email || projectUser.user_id)
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900">
                                  {projectUser.user_email ||
                                    projectUser.user_id}
                                </p>
                                {projectUser.user_id ===
                                  project?.created_by && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Creador
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                {projectUser.user_id === project?.created_by
                                  ? "Creador del proyecto"
                                  : `Agregado el ${new Date(
                                      projectUser.created_at
                                    ).toLocaleDateString()}`}
                              </p>
                            </div>
                          </div>
                          {projectUser.user_id !== project?.created_by && (
                            <Button
                              onClick={() =>
                                removeUserFromProject(projectUser.user_id)
                              }
                              disabled={isRemovingUser}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
                            >
                              {isRemovingUser ? (
                                <Loader2
                                  size={16}
                                  className="mr-1 animate-spin"
                                />
                              ) : (
                                <Trash2 size={16} className="mr-1" />
                              )}
                              {isRemovingUser ? "Removiendo..." : "Remover"}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Observation Options Management */}
          {canEditQuestions && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">
                  Opciones de Observación
                </h2>
              </div>
              <div className="p-6 space-y-6">
                {/* Add New Option */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Agregar Nueva Pregunta
                  </h3>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <Input
                        value={newOptionName}
                        onChange={(e) => setNewOptionName(e.target.value)}
                        placeholder="Pregunta"
                        className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors"
                      />
                      <Select
                        value={newOptionType}
                        onValueChange={(value) =>
                          setNewOptionType(
                            value as
                              | "string"
                              | "boolean"
                              | "radio"
                              | "checkbox"
                              | "counter"
                              | "timer"
                              | "voice"
                          )
                        }
                      >
                        <SelectTrigger className="min-w-[180px]">
                          <SelectValue placeholder="Tipo de pregunta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">Texto</SelectItem>
                          <SelectItem value="boolean">Sí/No</SelectItem>
                          <SelectItem value="radio">Opción única</SelectItem>
                          <SelectItem value="checkbox">
                            Múltiples opciones
                          </SelectItem>
                          <SelectItem value="counter">Contador</SelectItem>
                          <SelectItem value="timer">Temporizador</SelectItem>
                          <SelectItem value="voice">
                            Grabación de voz
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(newOptionType === "radio" ||
                      newOptionType === "checkbox") && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          Opciones
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            value={newOptionOption}
                            onChange={(e) => setNewOptionOption(e.target.value)}
                            placeholder="Agregar opción"
                            className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            onKeyPress={(e) =>
                              e.key === "Enter" && addOptionOption()
                            }
                          />
                          <Button
                            onClick={addOptionOption}
                            disabled={!newOptionOption.trim()}
                            variant="outline"
                            size="sm"
                          >
                            Agregar
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {newOptionOptions.map((option, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="bg-gray-100 text-gray-800"
                            >
                              {option}
                              <button
                                onClick={() => removeOptionOption(option)}
                                className="ml-2 text-gray-600 hover:text-gray-800"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        onClick={handleAddOption}
                        disabled={
                          isAddingOption ||
                          !newOptionName.trim() ||
                          ((newOptionType === "radio" ||
                            newOptionType === "checkbox") &&
                            newOptionOptions.length === 0)
                        }
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4"
                      >
                        {isAddingOption ? (
                          <>
                            <Loader2 size={16} className="mr-2 animate-spin" />
                            Agregando...
                          </>
                        ) : (
                          "Agregar Pregunta"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Existing Options */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Opciones Existentes
                  </h3>
                  {isLoadingOptions ? (
                    <div className="text-center py-8">
                      <Loader2
                        size={20}
                        className="animate-spin mx-auto mb-2 text-gray-400"
                      />
                      <p className="text-sm text-gray-500">
                        Cargando opciones...
                      </p>
                    </div>
                  ) : options.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500">
                        No hay opciones de observación
                      </p>
                    </div>
                  ) : canEditQuestions ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={options.map((option) => `option-${option.id}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {options.map((option, index) => (
                            <DraggableOption
                              key={`option-${option.id}`}
                              option={option}
                              index={index}
                              onDelete={handleDeleteOption}
                              onToggleVisibility={handleToggleOptionVisibility}
                              canEdit={canEditQuestions}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="space-y-2">
                      {options.map((option, index) => (
                        <DraggableOption
                          key={`option-${option.id}`}
                          option={option}
                          index={index}
                          onDelete={handleDeleteOption}
                          onToggleVisibility={handleToggleOptionVisibility}
                          canEdit={canEditQuestions}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Delete Project Section */}
          {isCreator && (
            <div className="bg-red-50 border border-red-200 rounded-lg">
              <div className="px-6 py-4 border-b border-red-200">
                <h2 className="text-lg font-semibold text-red-800">
                  Zona de Peligro
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <p className="text-sm text-red-700">
                    Una vez que elimines un proyecto, no hay vuelta atrás. Por
                    favor, ten cuidado.
                  </p>
                  <AlertDialog
                    open={isDeleteDialogOpen}
                    onOpenChange={setIsDeleteDialogOpen}
                  >
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Eliminar Proyecto
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Esto eliminará
                          permanentemente el proyecto "{project.name}" y todas
                          sus sesiones y observaciones asociadas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteProject}
                          disabled={isDeletingProject}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {isDeletingProject ? (
                            <>
                              <Loader2
                                size={16}
                                className="mr-2 animate-spin"
                              />
                              Eliminando...
                            </>
                          ) : (
                            "Eliminar"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProjectSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
            Cargando...
          </div>
        </div>
      }
    >
      <ProjectSettingsPageContent />
    </Suspense>
  );
}
