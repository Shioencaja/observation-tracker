"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectRole } from "@/hooks/use-project-role";
import { useProjectFormState } from "@/hooks/use-project-form-state";
import { Project } from "@/types/observation";
import { SettingsHeader } from "@/components/project-settings/SettingsHeader";
import { ProjectInformationSection } from "@/components/project-settings/ProjectInformationSection";
import { AgenciesSection } from "@/components/project-settings/AgenciesSection";
import { UserManagementSection } from "@/components/project-settings/UserManagementSection";
import { ObservationOptionsSection } from "@/components/project-settings/ObservationOptionsSection";
import { DeleteProjectSection } from "@/components/project-settings/DeleteProjectSection";

function ProjectSettingsPageContent() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveReminder, setShowSaveReminder] = useState(false);

  // Get user role for the project
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
      // Form state will be initialized by useProjectFormState hook
    } catch (error) {
      console.error("Error loading project:", error);
      setError("Error al cargar el proyecto");
    } finally {
      setIsLoadingProject(false);
    }
  }, [projectId]);

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
      // Reset unsaved changes when project loads
      setHasUnsavedChanges(false);
      setShowSaveReminder(false);
    }
  }, [project]);

  // Change tracking is handled by useProjectFormState hook

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
        name: formState.name.trim(),
        description: formState.description.trim() || null,
        updated_at: new Date().toISOString(),
      };

      // Only include agencies if the column exists
      try {
        updateData.agencies = formState.agencies;
      } catch {
        // If agencies column doesn't exist, just skip it
        console.log(
          "Agencies column doesn't exist, skipping agencies update"
        );
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
      // Step 1: Get all sessions for this project
      const { data: sessions, error: sessionsError } = await supabase
        .from("sessions")
        .select("id")
        .eq("project_id", project.id);

      if (sessionsError) throw sessionsError;

      const sessionIds = sessions?.map((s) => s.id) || [];

      // Step 2: Delete voice recordings if any
      if (sessionIds.length > 0) {
        const { data: observations, error: obsError } = await supabase
          .from("observations")
          .select("response")
          .in("session_id", sessionIds);

        if (!obsError && observations) {
          const voiceRecordings = observations
            .map((obs) => {
              if (obs.response && typeof obs.response === "string") {
                const audioUrlMatch = obs.response.match(/\[Audio: (.*?)\]/);
                if (audioUrlMatch) {
                  const audioUrl = audioUrlMatch[1];
                  const urlParts = audioUrl.split("/");
                  const filename = urlParts[urlParts.length - 1];
                  return filename;
                }
              }
              return null;
            })
            .filter(Boolean);

          if (voiceRecordings.length > 0) {
            const { error: storageError } = await supabase.storage
              .from("voice-recordings")
              .remove(voiceRecordings as string[]);

            if (storageError) {
              console.error("Error deleting voice recordings:", storageError);
            }
          }
        }

        // Step 3: Delete all observations
        const { error: deleteObsError } = await supabase
          .from("observations")
          .delete()
          .in("session_id", sessionIds);

        if (deleteObsError) throw deleteObsError;

        // Step 4: Delete all sessions
        const { error: deleteSessionsError } = await supabase
          .from("sessions")
          .delete()
          .eq("project_id", project.id);

        if (deleteSessionsError) throw deleteSessionsError;
      }

      // Step 5: Delete project observation options
      const { error: deleteOptionsError } = await supabase
        .from("project_observation_options")
        .delete()
        .eq("project_id", project.id);

      if (deleteOptionsError) throw deleteOptionsError;

      // Step 6: Delete project users
      const { error: deleteUsersError } = await supabase
        .from("project_users")
        .delete()
        .eq("project_id", project.id);

      if (deleteUsersError) {
        // If table doesn't exist, just continue
        console.log("project_users table doesn't exist, skipping");
      }

      // Step 7: Finally delete the project
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
    }
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
    updateField("agencies", formState.agencies.filter((a) => a !== agency));
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
