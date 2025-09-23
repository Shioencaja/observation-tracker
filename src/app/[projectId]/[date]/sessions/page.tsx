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
  }, [searchParams, selectedSessionId]);

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
        handleSessionSelect(null);
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
      showToast(`Error inesperado: ${error}`, "error");
    } finally {
      setIsLoading(false);
    }
  }, [user, project, selectedDate, selectedSessionId, selectedAgency]);

  useEffect(() => {
    // Load observation options when project is available
    if (project) {
      loadObservationOptions();
    }
  }, [project, loadObservationOptions]);

  useEffect(() => {
    // Load sessions when project and date are available
    if (project && selectedDate) {
      loadAllSessions();
    }
  }, [project, selectedDate, loadAllSessions]);

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
          agency: selectedAgency || null,
          start_time: selectedDateTime.toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating session:", error);
        showToast("Error al crear la sesión", "error");
        return;
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

    try {
      // First, get all observations to extract voice recording URLs
      const { data: observations, error: fetchError } = await supabase
        .from("observations")
        .select("response")
        .eq("session_id", sessionToDelete)
        .eq("user_id", user.id);

      if (fetchError) {
        console.error("Error fetching observations:", fetchError);
        showToast("Error al obtener las observaciones", "error");
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
              "Advertencia: No se pudieron eliminar algunas grabaciones de voz",
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
        showToast("Error al eliminar las observaciones", "error");
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
        showToast("Error al eliminar la sesión", "error");
        return;
      }

      // Clear selected session if it was the deleted one
      if (selectedSessionId === sessionToDelete) {
        handleSessionSelect(null);
      }

      // Reload sessions
      await loadAllSessions();
      showToast(
        "Sesión y todas sus observaciones eliminadas exitosamente",
        "success"
      );
    } catch (error) {
      console.error("Unexpected error deleting session:", error);
      showToast("Error inesperado al eliminar la sesión", "error");
    } finally {
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    }
  };

  // Handle questionnaire form submission
  const handleQuestionnaireSave = async (responses: Record<string, any>) => {
    if (!selectedSessionId || !user) return;

    try {
      console.log("Saving questionnaire responses:", responses);

      // Create observations for each response
      const observationPromises = Object.entries(responses).map(
        ([questionId, response]) => {
          // Skip empty responses
          if (!response || (Array.isArray(response) && response.length === 0)) {
            return null;
          }

          return supabase
            .from("observations")
            .insert({
              session_id: selectedSessionId,
              user_id: user.id,
              project_observation_option_id: questionId,
              response: Array.isArray(response)
                ? JSON.stringify(response)
                : String(response),
            })
            .select()
            .single();
        }
      );

      // Filter out null promises and execute all insertions
      const validPromises = observationPromises.filter((p) => p !== null);

      if (validPromises.length === 0) {
        showToast("Por favor, responde al menos una pregunta.", "warning");
        return;
      }

      const results = await Promise.all(validPromises);

      // Check for errors
      const errors = results.filter((result) => result.error);
      if (errors.length > 0) {
        console.error("Errors creating observations:", errors);
        throw new Error("Error al guardar algunas respuestas");
      }

      console.log(
        "Successfully saved observations:",
        results.map((r) => r.data)
      );

      // Reload all sessions to get updated data
      await loadAllSessions();

      showToast("Respuestas guardadas exitosamente!", "success");
    } catch (error) {
      console.error("Error saving questionnaire responses:", error);
      showToast(
        `Error: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`,
        "error"
      );
    }
  };

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
                  onSave={handleQuestionnaireSave}
                  isLoading={false}
                  selectedSessionId={selectedSessionId}
                  isSessionFinished={isSessionFinished}
                  onFinishSession={handleFinishSession}
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
