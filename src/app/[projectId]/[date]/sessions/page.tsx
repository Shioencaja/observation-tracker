"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { SessionWithObservations, Project } from "@/types/observation";
import { Tables } from "@/types/supabase";
import SessionsTable from "@/components/SessionsTable";
import QuestionnaireForm from "@/components/QuestionnaireForm";
import { Loader2 } from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ToastContainer } from "@/components/ui/toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function DateSessionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Cargando sesiones...</p>
          </div>
        </div>
      }
    >
      <DateSessionsPageContent />
    </Suspense>
  );
}

function DateSessionsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const selectedDate = params.date as string;

  const [sessions, setSessions] = useState<SessionWithObservations[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    () => {
      // Get session from URL params
      const sessionParam = searchParams.get("session");
      return sessionParam || null;
    }
  );
  const [observationOptions, setObservationOptions] = useState<
    Tables<"project_observation_options">[]
  >([]);
  const [project, setProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [selectedAgency, setSelectedAgency] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [newlyCreatedObservationId, setNewlyCreatedObservationId] = useState<
    string | null
  >(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [sessionsTableOpen, setSessionsTableOpen] = useState(true);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [skipNextLoad, setSkipNextLoad] = useState(false);
  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      message: string;
      type: "success" | "error" | "info" | "warning";
    }>
  >([]);

  // Helper function to show toasts
  const showToast = (
    message: string,
    type: "success" | "error" | "info" | "warning" = "info"
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Update URL with or without session parameter
  const updateURL = (sessionId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (sessionId) {
      params.set("session", sessionId);
    } else {
      params.delete("session");
    }

    const newUrl = `/${projectId}/${selectedDate}/sessions?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
  };

  // Handle session selection with URL update
  const handleSessionSelect = (sessionId: string | null) => {
    setSelectedSessionId(sessionId);
    updateURL(sessionId);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const agency = searchParams.get("agency");
    if (agency) {
      setSelectedAgency(agency);
    }
  }, [searchParams]);

  // Update selected session when URL params change (only on initial load)
  useEffect(() => {
    const sessionParam = searchParams.get("session");
    if (sessionParam && !selectedSessionId) {
      handleSessionSelect(sessionParam);
    }
  }, [searchParams]); // Removed selectedSessionId from dependencies to prevent loops

  // Load project data
  useEffect(() => {
    const loadProject = async () => {
      if (!user || !projectId) return;

      try {
        setIsLoadingProject(true);
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single();

        if (error) {
          console.error("Project error:", error);
          router.push("/projects");
          return;
        }

        setProject(data);
      } catch (error) {
        console.error("Unexpected error:", error);
        router.push("/projects");
      } finally {
        setIsLoadingProject(false);
      }
    };

    loadProject();
  }, [user, projectId, router]);

  // Load observation options
  const loadObservationOptions = useCallback(async () => {
    if (!project) return;

    try {
      const { data, error } = await supabase
        .from("project_observation_options")
        .select("*")
        .eq("project_id", project.id)
        .eq("is_visible", true)
        .order("order");

      if (error) {
        console.error("Observation options error:", error);
        console.error("Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        setObservationOptions([]);
        return;
      }

      console.log("Loaded observation options:", data?.length || 0, "options");
      setObservationOptions(data || []);
    } catch (error) {
      console.error("Unexpected error loading observation options:", error);
      setObservationOptions([]);
    }
  }, [project]);

  // Load sessions data
  const loadAllSessions = useCallback(async () => {
    if (!user || !project || !selectedDate) {
      console.log("🚫 Skipping loadAllSessions:", {
        user: !!user,
        project: !!project,
        selectedDate,
      });
      return;
    }

    try {
      console.log("🔄 Loading sessions for:", {
        projectId: project.id,
        selectedDate,
        selectedAgency,
      });
      setIsLoading(true);

      // Get sessions for the selected date (using local timezone)
      const startOfDay = new Date(selectedDate + "T00:00:00");
      const endOfDay = new Date(selectedDate + "T23:59:59.999");

      let query = supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("project_id", project.id)
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString());

      // Filter by agency if selected
      if (selectedAgency) {
        query = query.eq("agency", selectedAgency);
      }

      const { data: sessionsData, error: sessionsError } = await query.order(
        "start_time",
        { ascending: false }
      );

      if (sessionsError) {
        console.error("Sessions error:", sessionsError);
        showToast(`Error de base de datos: ${sessionsError.message}`, "error");
        return;
      }

      if (sessionsData && sessionsData.length > 0) {
        // Get observations for all sessions
        const sessionIds = sessionsData.map((s) => s.id);
        const { data: observations, error: obsError } = await supabase
          .from("observations")
          .select("*")
          .eq("user_id", user.id)
          .in("session_id", sessionIds)
          .order("created_at", { ascending: true });

        if (obsError) {
          console.error("Observations error:", obsError);
          showToast(`Error de base de datos: ${obsError.message}`, "error");
          return;
        }

        // Group observations by session
        const sessionsWithObservations = sessionsData.map((session) => ({
          ...session,
          observations:
            observations?.filter((obs) => obs.session_id === session.id) || [],
        }));

        setSessions(sessionsWithObservations);

        // Auto-select the most recent session if none selected
        if (!selectedSessionId && sessionsData.length > 0) {
          handleSessionSelect(sessionsData[0].id);
        }
      } else {
        setSessions([]);
        // Don't reset selectedSessionId if it was already set - preserve user's selection
        // Only reset if there was no session selected before
        if (!selectedSessionId) {
          handleSessionSelect(null);
        }
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
      showToast(`Error inesperado: ${error}`, "error");
    } finally {
      setIsLoading(false);
    }
  }, [user, project, selectedDate, selectedAgency]); // Removed selectedSessionId to prevent reload loops

  // Load all sessions for the selected date and agency (without auto-selecting)
  const loadAllSessionsAfterDeletion = useCallback(async () => {
    if (!user || !project || !selectedDate) return;

    try {
      setIsLoading(true);

      // Get sessions for the selected date (using local timezone)
      const startOfDay = new Date(selectedDate + "T00:00:00");
      const endOfDay = new Date(selectedDate + "T23:59:59.999");

      let query = supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("project_id", project.id)
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString())
        .order("created_at", { ascending: false });

      // Add agency filter if selected
      if (selectedAgency && selectedAgency !== "all") {
        query = query.eq("agency", selectedAgency);
      }

      const { data: sessionsData, error: sessionsError } = await query;

      if (sessionsError) {
        console.error("Error loading sessions:", sessionsError);
        showToast(
          `Error al cargar sesiones: ${sessionsError.message}`,
          "error"
        );
        return;
      }

      if (sessionsData && sessionsData.length > 0) {
        // Load observations for each session
        const sessionIds = sessionsData.map((session) => session.id);
        const { data: observations, error: obsError } = await supabase
          .from("observations")
          .select("*")
          .in("session_id", sessionIds)
          .eq("user_id", user.id);

        if (obsError) {
          console.error("Error loading observations:", obsError);
          showToast(
            `Error al cargar observaciones: ${obsError.message}`,
            "error"
          );
          return;
        }

        // Combine sessions with their observations
        const sessionsWithObservations = sessionsData.map((session) => ({
          ...session,
          observations:
            observations?.filter((obs) => obs.session_id === session.id) || [],
        }));

        setSessions(sessionsWithObservations);
        // Don't auto-select any session after deletion
      } else {
        setSessions([]);
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
      showToast(`Error inesperado: ${error}`, "error");
    } finally {
      setIsLoading(false);
    }
  }, [user, project, selectedDate, selectedAgency]);

  useEffect(() => {
    // Load observation options when project is available
    if (project) {
      loadObservationOptions();
    }
  }, [project, loadObservationOptions]);

  useEffect(() => {
    console.log("🔄 Sessions useEffect triggered:", {
      project: !!project,
      selectedDate,
      skipNextLoad,
      selectedAgency,
    });

    // Load sessions when project and date are available
    if (project && selectedDate && !skipNextLoad) {
      console.log("✅ Calling loadAllSessions");
      loadAllSessions();
    }
    // Reset skip flag after use
    if (skipNextLoad) {
      setSkipNextLoad(false);
    }
  }, [project, selectedDate, selectedAgency, skipNextLoad]); // Removed loadAllSessions from dependencies

  // Create new session
  const createNewSession = async () => {
    if (!user || !project) return;

    setIsCreatingSession(true);
    try {
      // Create session with the selected date at the current time
      const selectedDateTime = new Date(
        selectedDate + "T" + new Date().toTimeString().split(" ")[0]
      );

      const { data, error } = await supabase
        .from("sessions")
        .insert({
          user_id: user.id,
          project_id: project.id,
          agency: selectedAgency || null, // Use 'agency' field as it exists in database
          start_time: selectedDateTime.toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating session:", error);
        showToast("Error al crear la sesión", "error");
        return;
      }

      // Create blank observations for all observation options
      if (observationOptions.length > 0) {
        const blankObservations = observationOptions.map((option) => ({
          session_id: data.id,
          project_id: project.id,
          user_id: user.id,
          project_observation_option_id: option.id,
          response: null, // Blank response
          agency: selectedAgency || null,
          alias: null,
        }));

        const { error: obsError } = await supabase
          .from("observations")
          .insert(blankObservations);

        if (obsError) {
          console.error("Error creating blank observations:", obsError);
          // Don't throw error here - session was created successfully
          // Just log the error and continue
        } else {
          console.log(
            `✅ Created ${blankObservations.length} blank observations for new session`
          );
        }
      }

      // Refresh sessions
      await loadAllSessions();
      handleSessionSelect(data.id);
    } catch (error) {
      console.error("Unexpected error:", error);
      showToast("Error inesperado al crear la sesión", "error");
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Clear newly created observation ID
  const clearNewlyCreatedObservationId = () => {
    setNewlyCreatedObservationId(null);
  };

  // Finish session function
  const handleFinishSession = async () => {
    if (!selectedSessionId || !user) return;

    try {
      // Only update the session end time - observations are already saved by QuestionnaireForm
      const { error } = await supabase
        .from("sessions")
        .update({ end_time: new Date().toISOString() })
        .eq("id", selectedSessionId);

      if (error) {
        console.error("Error finishing session:", error);
        showToast("Error al finalizar la sesión", "error");
        return;
      }

      // Reload sessions to get updated data
      await loadAllSessions();
      showToast("Sesión finalizada exitosamente", "success");
    } catch (error) {
      console.error("Unexpected error finishing session:", error);
      showToast("Error inesperado al finalizar la sesión", "error");
    }
  };

  // Delete session function
  const handleDeleteSession = (sessionId: string) => {
    // Check if user is the project creator
    if (user?.id !== project?.created_by) {
      showToast("No tienes permisos para eliminar sesiones", "error");
      return;
    }

    setSessionToDelete(sessionId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete || !user) return;

    console.log("🗑️ Starting session deletion:", sessionToDelete);
    setIsDeletingSession(true);
    try {
      // First, verify the session exists and user has permission
      const { data: sessionData, error: sessionCheckError } = await supabase
        .from("sessions")
        .select("id, user_id, project_id")
        .eq("id", sessionToDelete)
        .single();

      if (sessionCheckError) {
        console.error("Error checking session:", sessionCheckError);
        if (sessionCheckError.code === "PGRST116") {
          showToast("La sesión no existe o ya fue eliminada", "error");
        } else {
          showToast(
            `Error al verificar la sesión: ${sessionCheckError.message}`,
            "error"
          );
        }
        return;
      }

      if (sessionData.user_id !== user.id) {
        showToast("No tienes permisos para eliminar esta sesión", "error");
        return;
      }

      // Get all observations to extract voice recording URLs
      const { data: observations, error: fetchError } = await supabase
        .from("observations")
        .select("response")
        .eq("session_id", sessionToDelete)
        .eq("user_id", user.id);

      if (fetchError) {
        console.error("Error fetching observations:", fetchError);
        showToast(
          `Error al obtener las observaciones: ${fetchError.message}`,
          "error"
        );
        return;
      }

      // Extract and delete voice recordings from Supabase Storage
      if (observations && observations.length > 0) {
        const voiceRecordings = observations
          .map((obs) => {
            if (
              typeof obs.response === "string" &&
              obs.response.includes("[Audio:")
            ) {
              const audioUrlMatch = obs.response.match(/\[Audio: (.*?)\]/);
              if (audioUrlMatch) {
                const audioUrl = audioUrlMatch[1];
                // Extract filename from URL
                const urlParts = audioUrl.split("/");
                const filename = urlParts[urlParts.length - 1];
                return filename;
              }
            }
            return null;
          })
          .filter(Boolean);

        // Delete voice recordings from storage
        if (voiceRecordings.length > 0) {
          const { error: storageError } = await supabase.storage
            .from("voice-recordings")
            .remove(voiceRecordings);

          if (storageError) {
            console.error("Error deleting voice recordings:", storageError);
            // Continue with session deletion even if storage deletion fails
            showToast(
              `Advertencia: No se pudieron eliminar las grabaciones de voz. Razón: ${storageError.message}`,
              "warning"
            );
          }
        }
      }

      // Delete all observations for this session
      const { error: obsError } = await supabase
        .from("observations")
        .delete()
        .eq("session_id", sessionToDelete)
        .eq("user_id", user.id);

      if (obsError) {
        console.error("Error deleting observations:", obsError);
        if (obsError.code === "23503") {
          showToast(
            "No se pueden eliminar las observaciones debido a restricciones de integridad de datos",
            "error"
          );
        } else if (obsError.code === "42501") {
          showToast(
            "No tienes permisos para eliminar las observaciones",
            "error"
          );
        } else {
          showToast(
            `Error al eliminar las observaciones: ${obsError.message}`,
            "error"
          );
        }
        return;
      }

      // Then delete the session
      const { error: sessionError } = await supabase
        .from("sessions")
        .delete()
        .eq("id", sessionToDelete)
        .eq("user_id", user.id);

      if (sessionError) {
        console.error("Error deleting session:", sessionError);
        if (sessionError.code === "23503") {
          showToast(
            "No se puede eliminar la sesión debido a restricciones de integridad de datos",
            "error"
          );
        } else if (sessionError.code === "42501") {
          showToast("No tienes permisos para eliminar esta sesión", "error");
        } else if (sessionError.code === "PGRST116") {
          showToast("La sesión no existe o ya fue eliminada", "error");
        } else {
          showToast(
            `Error al eliminar la sesión: ${sessionError.message}`,
            "error"
          );
        }
        return;
      }

      // Clear selected session if it was the deleted one
      if (selectedSessionId === sessionToDelete) {
        console.log("🔄 Clearing selected session and updating URL");
        setSelectedSessionId(null);
        updateURL(null);
        setSkipNextLoad(true); // Prevent loadAllSessions from triggering
      }

      // Reload sessions to get updated list (without auto-selecting)
      try {
        await loadAllSessionsAfterDeletion();
        showToast(
          "Sesión y todas sus observaciones eliminadas exitosamente",
          "success"
        );
      } catch (reloadError) {
        console.error("Error reloading sessions after deletion:", reloadError);
        showToast(
          "Sesión eliminada, pero hubo un error al actualizar la lista",
          "warning"
        );
      }
    } catch (error) {
      console.error("Unexpected error deleting session:", error);
      if (error instanceof Error) {
        showToast(
          `Error inesperado al eliminar la sesión: ${error.message}`,
          "error"
        );
      } else {
        showToast(
          "Error inesperado al eliminar la sesión. Intenta nuevamente.",
          "error"
        );
      }
    } finally {
      console.log("✅ Session deletion process completed");
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
      setIsDeletingSession(false);
    }
  };

  // Manual save is now handled by auto-save in QuestionnaireForm

  // Create new observation (keeping for compatibility)
  const createNewObservation = async () => {
    if (!selectedSessionId || !user) return;

    try {
      // Get a random option if available
      const randomOption =
        observationOptions.length > 0
          ? observationOptions[
              Math.floor(Math.random() * observationOptions.length)
            ]
          : null;

      const { data, error } = await supabase
        .from("observations")
        .insert({
          session_id: selectedSessionId,
          user_id: user.id,
          project_observation_option_id: randomOption?.id || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase error details:", error);
        throw error;
      }

      // Set the newly created observation ID for auto-edit mode
      setNewlyCreatedObservationId(data.id);

      // Reload all sessions to get updated data
      await loadAllSessions();
    } catch (error) {
      console.error("Error creating observation:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      showToast(
        `Error: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`,
        "error"
      );
    }
  };

  // Loading states
  if (authLoading || isLoadingProject || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Cargando sesiones...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            Proyecto no encontrado
          </h2>
          <p className="text-gray-500 mb-4">
            El proyecto solicitado no existe o no tienes acceso.
          </p>
          <Button onClick={() => router.push("/projects")}>
            Volver a Proyectos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => router.push(`/${projectId}/select-date`)}
            variant="ghost"
            size="sm"
            className="mb-6 p-0 h-auto text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={16} className="mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            {project.name}
          </h1>
          <p className="text-gray-500 text-sm">
            Sesiones del{" "}
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("es-ES", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {selectedAgency && ` • ${selectedAgency}`}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Sessions Table */}
          <Collapsible
            open={sessionsTableOpen}
            onOpenChange={setSessionsTableOpen}
            className="space-y-4"
          >
            <div className="flex justify-between items-center">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 p-0 h-auto text-lg font-medium text-gray-900 hover:text-gray-700"
                >
                  <h2>Sesiones</h2>
                  {sessionsTableOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <Button
                onClick={createNewSession}
                disabled={isCreatingSession}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                {isCreatingSession ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Nueva Sesión"
                )}
              </Button>
            </div>
            <CollapsibleContent>
              <SessionsTable
                sessions={sessions}
                selectedSessionId={selectedSessionId}
                onSessionSelect={handleSessionSelect}
                onDeleteSession={handleDeleteSession}
                isProjectCreatorUser={user?.id === project?.created_by}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Questionnaire Form */}
          {(() => {
            if (selectedSessionId) {
              const currentSession = sessions.find(
                (s) => s.id === selectedSessionId
              );
              const isSessionFinished = currentSession?.end_time !== null;

              return (
                <QuestionnaireForm
                  observationOptions={observationOptions}
                  isLoading={isDeletingSession}
                  selectedSessionId={selectedSessionId}
                  isSessionFinished={isSessionFinished}
                  onFinishSession={handleFinishSession}
                  projectId={projectId}
                />
              );
            } else {
              // Show empty questionnaire with new session button
              return (
                <QuestionnaireForm
                  observationOptions={observationOptions}
                  onCreateSession={createNewSession}
                  isCreatingSession={isCreatingSession}
                  projectId={projectId}
                />
              );
            }
          })()}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Eliminar Sesión"
        description="¿Estás seguro de que quieres eliminar esta sesión? Esta acción eliminará la sesión, todas sus observaciones y grabaciones de voz de forma permanente."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDeleteSession}
        variant="destructive"
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
