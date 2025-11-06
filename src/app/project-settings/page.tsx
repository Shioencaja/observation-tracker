"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { FullPageLoading } from "@/components/LoadingSpinner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectRole } from "@/hooks/use-project-role";
import { useProjectFormState } from "@/hooks/use-project-form-state";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useAsyncOperation } from "@/hooks/use-async-operation";
import { Project } from "@/types/observation";
import { SettingsHeader } from "@/components/project-settings/SettingsHeader";
import { ProjectInformationSection } from "@/components/project-settings/ProjectInformationSection";
import { AgenciesSection } from "@/components/project-settings/AgenciesSection";
import { UserManagementSection } from "@/components/project-settings/UserManagementSection";
import { ObservationOptionsSection } from "@/components/project-settings/ObservationOptionsSection";
import { DeleteProjectSection } from "@/components/project-settings/DeleteProjectSection";

function ProjectSettingsPageContent() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Require authentication
  const { isLoading: authLoading } = useRequireAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Async operations
  const { isLoading: isLoadingProject, execute: executeLoadProject } =
    useAsyncOperation<Project>({
      onError: () => {
        setError("Error al cargar el proyecto");
      },
    });

  const { isLoading: isSaving, execute: executeSave } = useAsyncOperation({
    onError: () => {
      setError("Error al actualizar el proyecto");
    },
  });

  const { isLoading: isDeletingProject, execute: executeDelete } =
    useAsyncOperation({
      onError: () => {
        setError("Error al eliminar el proyecto");
      },
    });
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

  // Form state using custom hook
  const {
    formState,
    updateField,
    updateFields,
    resetForm,
    hasUnsavedChanges: formHasUnsavedChanges,
  } = useProjectFormState({
    project,
    onUnsavedChangesChange: (hasChanges) => {
      setHasUnsavedChanges(hasChanges);
    },
  });

  // Load project from URL parameter
  const loadProject = useCallback(async () => {
    const projectId = searchParams.get("project");
    if (!projectId) {
      return;
    }

    await executeLoadProject(async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      setProject(data);
      // Form state will be initialized by useProjectFormState hook
      return data;
    });
  }, [searchParams, executeLoadProject]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    if (project) {
      // Reset unsaved changes when project loads
      setHasUnsavedChanges(false);
      setShowSaveReminder(false);
    }
  }, [project]);

  const handleUpdateProject = async () => {
    if (!project || !user) return;

    await executeSave(async () => {
      // Try to update with agencies first
      const updateData: {
        name: string;
        description: string | null;
        updated_at: string;
        agencies?: string[];
      } = {
        name: formState.name.trim(),
        description: formState.description.trim() || null,
        updated_at: new Date().toISOString(),
      };

      // Only include agencies if the column exists
      try {
        updateData.agencies = formState.agencies;
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
              name: formState.name.trim(),
              description: formState.description.trim() || null,
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
              name: formState.name.trim(),
              description: formState.description.trim() || null,
              agencies: formState.agencies,
            }
          : null
      );

      // Reset unsaved changes flag
      setHasUnsavedChanges(false);
      setShowSaveReminder(false);
    });
  };

  const handleDeleteProject = async () => {
    if (!project || !user) return;

    await executeDelete(async () => {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id)
        .eq("created_by", user.id);

      if (error) throw error;

      // Redirect to projects page
      router.push("/projects");
    });
  };

  const handleAddAgency = (agency: string) => {
    if (!formState.agencies.includes(agency)) {
      updateField("agencies", [...formState.agencies, agency]);
      setShowSaveReminder(true);

      // Auto-hide the reminder after 5 seconds
      setTimeout(() => {
        setShowSaveReminder(false);
      }, 5000);
    }
  };

  const handleRemoveAgency = (agency: string) => {
    updateField(
      "agencies",
      formState.agencies.filter((a) => a !== agency)
    );
    setShowSaveReminder(true);

    // Auto-hide the reminder after 5 seconds
    setTimeout(() => {
      setShowSaveReminder(false);
    }, 5000);
  };

  const handleUnsavedChange = () => {
    setHasUnsavedChanges(true);
    setShowSaveReminder(true);

    // Auto-hide the reminder after 5 seconds
    setTimeout(() => {
      setShowSaveReminder(false);
    }, 5000);
  };

  const handleBackToProjects = () => {
    router.push("/projects");
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (authLoading || isLoadingProject) {
    return <FullPageLoading text="Cargando configuración..." />;
  }

  if (!user || !project) {
    return null; // Will redirect
  }

  const isCreator = user.id === project.created_by;
  const canEditQuestions = canEdit;

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/50 to-background">
      {/* Header */}
      <SettingsHeader
        projectName={project.name}
        userEmail={user.email || ""}
        onBack={handleBackToProjects}
        onSignOut={handleSignOut}
      />

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
          <ProjectInformationSection
            editName={formState.name}
            editDescription={formState.description}
            isSaving={isSaving}
            hasUnsavedChanges={hasUnsavedChanges}
            isCreator={isCreator}
            onNameChange={(value) => updateField("name", value)}
            onDescriptionChange={(value) => updateField("description", value)}
            onSave={handleUpdateProject}
          />

          {/* Agencies Management */}
          {isCreator && (
            <AgenciesSection
              agencies={formState.agencies}
              onAddAgency={handleAddAgency}
              onRemoveAgency={handleRemoveAgency}
              onUnsavedChange={handleUnsavedChange}
            />
          )}

          {/* User Management */}
          {isCreator && projectId && (
            <UserManagementSection
              projectId={projectId}
              projectCreatorId={project.created_by}
              currentUserId={user.id}
            />
          )}

          {/* Observation Options Management */}
          {canEditQuestions && projectId && (
            <ObservationOptionsSection
              projectId={projectId}
              canEdit={canEditQuestions}
              onUnsavedChange={handleUnsavedChange}
            />
          )}

          {/* Delete Project Section */}
          {isCreator && (
            <DeleteProjectSection
              projectName={project.name}
              onDelete={handleDeleteProject}
              isDeleting={isDeletingProject}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProjectSettingsPage() {
  return (
    <Suspense
      fallback={<FullPageLoading text="Cargando..." />}
    >
      <ProjectSettingsPageContent />
    </Suspense>
  );
}
