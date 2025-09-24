"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertCircle,
  Trash2,
  MoreVertical,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, User, Calendar } from "lucide-react";
import { formatTime } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import {
  validateSessionAccess,
  redirectToLogin,
  redirectToProjects,
} from "@/lib/auth-utils";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ToastContainer } from "@/components/ui/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
// Temporarily removed auth-utils imports
import {
  Project,
  Session,
  Observation,
  SessionWithObservations,
} from "@/types/observation";

interface ObservationWithDetails extends Observation {
  project_observation_options?: {
    name: string;
    question_type: string;
  };
  question_name?: string;
  question_type?: string;
}

export default function SessionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const sessionId = params.sessionId as string;
  const projectId = params.projectId as string;

  // Debug params
  console.log("🔍 Params Debug:", {
    projectId,
    sessionId,
    allParams: params,
  });

  // Fallback authentication check
  const [fallbackUser, setFallbackUser] = useState<any>(null);
  const [fallbackLoading, setFallbackLoading] = useState(true);

  const [session, setSession] = useState<SessionWithObservations | null>(null);
  const [observations, setObservations] = useState<ObservationWithDetails[]>(
    []
  );
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isValidatingAuth, setIsValidatingAuth] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sessionCreator, setSessionCreator] = useState<any>(null);
  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      message: string;
      type: "success" | "error" | "info" | "warning";
    }>
  >([]);

  // Auth check - use fallback if AuthContext is not working
  const currentUser = user || fallbackUser;
  const currentLoading = authLoading || fallbackLoading;

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

  // Get session creator information using RPC function
  const getSessionCreator = async (session: any) => {
    console.log("🔍 Getting session creator for session:", session);

    // Note: user_email field doesn't exist in database schema

    // Check if it's the current user
    if (currentUser && currentUser.id === session?.user_id) {
      console.log("✅ Using current user as creator:", currentUser.email);
      return {
        email:
          currentUser.email || `Usuario ${session.user_id.substring(0, 8)}`,
        full_name: null,
      };
    }

    // Try to get user email using RPC function (same as project settings)
    try {
      console.log(
        "🔍 Fetching user email via RPC for user_id:",
        session?.user_id
      );
      const { data: userEmails, error: emailError } = await supabase.rpc(
        "get_user_emails",
        { user_ids: [session?.user_id] }
      );

      if (emailError) {
        console.error("❌ Error fetching user email via RPC:", emailError);
      } else if (userEmails && userEmails.length > 0) {
        const userEmail = userEmails[0];
        console.log("✅ Found user email via RPC:", userEmail);
        return {
          email: userEmail.email,
          full_name: null,
        };
      }
    } catch (error) {
      console.error("❌ Error in RPC call:", error);
    }

    // Fallback to user ID if nothing found
    console.warn("❌ Could not get session creator info, using fallback");
    return {
      email: `Usuario ${session?.user_id?.substring(0, 8) || "Unknown"}`,
      full_name: null,
    };
  };

  // Finish session function
  const handleFinishSession = async () => {
    if (!currentSession || !currentUser) return;

    console.log("⏹️ Starting session finish process:", currentSession.id);

    // Check if user is the project creator (can finish any session in the project)
    if (currentUser.id !== project?.created_by) {
      showToast(
        "Solo el creador del proyecto puede finalizar sesiones",
        "error"
      );
      return;
    }

    // Check if session is already finished
    if (currentSession.end_time) {
      showToast("Esta sesión ya está finalizada", "info");
      return;
    }

    setIsFinishing(true);
    try {
      // First, verify the session exists and belongs to the project
      const { data: sessionData, error: sessionCheckError } = await supabase
        .from("sessions")
        .select("id, user_id, project_id, end_time")
        .eq("id", currentSession.id)
        .eq("project_id", project.id) // Ensure session belongs to this project
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

      // Project creator can finish any session in their project
      // No need to check if sessionData.user_id === currentUser.id

      if (sessionData.end_time) {
        showToast("Esta sesión ya está finalizada", "info");
        return;
      }

      // Update the session with end_time (project creator can finish any session in their project)
      const { error } = await supabase
        .from("sessions")
        .update({ end_time: new Date().toISOString() })
        .eq("id", currentSession.id)
        .eq("project_id", project.id); // Ensure session belongs to this project

      if (error) {
        console.error("Error finishing session:", error);
        if (error.code === "23503") {
          showToast(
            "No se puede finalizar la sesión debido a restricciones de integridad de datos",
            "error"
          );
        } else if (error.code === "42501") {
          showToast(
            "No tienes permisos para finalizar sesiones en este proyecto",
            "error"
          );
        } else if (error.code === "PGRST116") {
          showToast("La sesión no existe o ya fue eliminada", "error");
        } else {
          showToast(`Error al finalizar la sesión: ${error.message}`, "error");
        }
        return;
      }

      console.log("✅ Session finished successfully");

      // Update local session state
      setSession({
        ...currentSession,
        end_time: new Date().toISOString(),
      });

      showToast("Sesión finalizada exitosamente", "success");
    } catch (error) {
      console.error("Unexpected error finishing session:", error);
      if (error instanceof Error) {
        showToast(
          `Error inesperado al finalizar la sesión: ${error.message}`,
          "error"
        );
      } else {
        showToast(
          "Error inesperado al finalizar la sesión. Intenta nuevamente.",
          "error"
        );
      }
    } finally {
      setIsFinishing(false);
    }
  };

  // Debug authentication
  console.log("🔍 SessionDetails Debug:", {
    user: user ? { id: user.id, email: user.email } : null,
    fallbackUser: fallbackUser
      ? { id: fallbackUser.id, email: fallbackUser.email }
      : null,
    currentUser: currentUser
      ? { id: currentUser.id, email: currentUser.email }
      : null,
    authLoading,
    fallbackLoading,
    currentLoading,
    sessionId,
    projectId,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      console.log("🔍 Fallback auth check:", currentUser);
      setFallbackUser(currentUser);
      setFallbackLoading(false);
    };
    checkAuth();
  }, []);

  // Handle redirect if not authenticated
  useEffect(() => {
    if (typeof window !== "undefined" && !authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  // Validate authentication and session access
  useEffect(() => {
    const validateAccess = async () => {
      if (!currentUser || !sessionId || !projectId) return;

      setIsValidatingAuth(true);
      setAuthError(null);

      try {
        // Validate session access
        const validation = await validateSessionAccess(projectId, sessionId);

        if (!validation.hasAccess) {
          setAuthError(validation.error || "Error de autenticación");
          redirectToLogin();
          return;
        }

        if (!validation.hasAccess) {
          setAuthError(validation.error || "Sin acceso a la sesión");
          redirectToProjects();
          return;
        }

        // Set project and session data
        if (validation.project) {
          setProject(validation.project);
        }
        if (validation.session) {
          setSession(validation.session);
        }
      } catch (error) {
        console.error("Error validating session access:", error);
        setAuthError("Error interno del servidor");
        redirectToProjects();
      } finally {
        setIsValidatingAuth(false);
      }
    };

    if (!currentLoading && currentUser) {
      validateAccess();
    }
  }, [currentLoading, currentUser, sessionId, projectId, router]);

  // Load session data (legacy - will be replaced by auth validation)
  useEffect(() => {
    if (
      !currentLoading &&
      currentUser &&
      sessionId &&
      projectId &&
      !isValidatingAuth &&
      !authError
    ) {
      loadSessionData();
    }
  }, [
    currentLoading,
    currentUser,
    sessionId,
    projectId,
    isValidatingAuth,
    authError,
  ]);

  const loadSessionData = async () => {
    try {
      setIsLoading(true);

      // Load all sessions for navigation
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("sessions")
        .select("*")
        .eq("project_id", projectId)
        .order("start_time", { ascending: false });

      if (sessionsError) {
        throw sessionsError;
      }

      setAllSessions(sessionsData || []);

      // Find and set current session
      const currentSession = sessionsData?.find((s) => s.id === sessionId);
      if (!currentSession) {
        throw new Error("Sesión no encontrada");
      }
      setSession(currentSession);

      // Load current session observations
      const { data: observations, error: obsError } = await supabase
        .from("observations")
        .select(
          `
          id,
          response,
          created_at,
          project_observation_options (
            name,
            question_type
          )
        `
        )
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (obsError) {
        throw obsError;
      }

      // Format observations
      const formattedObservations = observations.map((obs: any) => ({
        id: obs.id,
        session_id: obs.session_id,
        user_id: obs.user_id,
        project_observation_option_id: obs.project_observation_option_id,
        response: obs.response,
        alias: obs.alias,
        created_at: obs.created_at,
        updated_at: obs.updated_at,
        project_observation_options: obs.project_observation_options,
        question_name: obs.project_observation_options?.name || "Unknown",
        question_type:
          obs.project_observation_options?.question_type || "unknown",
      }));

      setObservations(formattedObservations);

      // Get session creator information using RPC function
      const creatorInfo = await getSessionCreator(currentSession);
      setSessionCreator(creatorInfo);

      setIsLoading(false);
    } catch (error) {
      console.error("Error loading session data:", error);
      setError("Error al cargar los datos de la sesión");
      setIsLoading(false);
    }
  };

  // Use the session state directly
  const currentSession = session;

  // Navigation logic
  const currentIndex = allSessions.findIndex((s) => s.id === sessionId);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allSessions.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      const previousSession = allSessions[currentIndex - 1];
      router.push(`/${projectId}/sessions/${previousSession.id}`);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextSession = allSessions[currentIndex + 1];
      router.push(`/${projectId}/sessions/${nextSession.id}`);
    }
  };

  const handleBack = () => {
    router.push(`/${projectId}/sessions`);
  };

  // Delete session functions
  const handleDeleteSession = () => {
    // Check if user is the project creator
    if (currentUser?.id !== project?.created_by) {
      showToast("No tienes permisos para eliminar sesiones", "error");
      return;
    }

    setDeleteDialogOpen(true);
  };

  const confirmDeleteSession = async () => {
    if (!currentUser || !sessionId) return;

    setIsDeleting(true);
    try {
      // First, check if session is ended and end it if not
      if (currentSession && !currentSession.end_time) {
        console.log(
          "⏹️ Session is not ended, ending it first before deletion:",
          sessionId
        );
        const { error: endSessionError } = await supabase
          .from("sessions")
          .update({ end_time: new Date().toISOString() })
          .eq("id", sessionId)
          .eq("user_id", currentUser.id);

        if (endSessionError) {
          console.error("Error ending session:", endSessionError);
          showToast("Error al finalizar la sesión antes de eliminar", "error");
          return;
        }
        console.log("✅ Session ended successfully before deletion");
      }

      // Get all observations to extract voice recording URLs
      const { data: observations, error: fetchError } = await supabase
        .from("observations")
        .select("response")
        .eq("session_id", sessionId)
        .eq("user_id", currentUser.id);

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
        .eq("session_id", sessionId)
        .eq("user_id", currentUser.id);

      if (obsError) {
        console.error("Error deleting observations:", obsError);
        showToast("Error al eliminar las observaciones", "error");
        return;
      }

      // Then delete the session
      const { error: sessionError } = await supabase
        .from("sessions")
        .delete()
        .eq("id", sessionId)
        .eq("user_id", currentUser.id);

      if (sessionError) {
        console.error("Error deleting session:", sessionError);
        showToast("Error al eliminar la sesión", "error");
        return;
      }

      // Redirect to sessions list
      showToast(
        "Sesión finalizada y eliminada exitosamente junto con todas sus observaciones",
        "success"
      );
      setTimeout(() => {
        router.push(`/${projectId}/sessions`);
      }, 1500);
    } catch (error) {
      console.error("Unexpected error deleting session:", error);
      showToast("Error inesperado al eliminar la sesión", "error");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const formatResponse = (response: any, questionType: string) => {
    if (response === null || response === undefined) return "Sin respuesta";

    // Helper function to safely parse JSON
    const parseJsonSafely = (str: string) => {
      try {
        return JSON.parse(str);
      } catch {
        return str;
      }
    };

    switch (questionType) {
      case "text":
      case "string":
        return response;

      case "boolean":
        // For true boolean questions, convert to Sí/No
        if (response === true || response === "true") return "Sí";
        if (response === false || response === "false") return "No";
        // If it's a string that's not "true"/"false", it might be a radio option
        return typeof response === "string" ? response : "Sin respuesta";
        
      case "radio":
        // For radio questions, return the selected option text directly
        return typeof response === "string" ? response : "Sin respuesta";

      case "checkbox":
        // Try to parse as JSON if it's a string
        let checkboxData = response;
        if (typeof response === "string") {
          checkboxData = parseJsonSafely(response);
        }

        if (Array.isArray(checkboxData)) {
          return checkboxData.length > 0
            ? checkboxData.join(", ")
            : "Sin Respuesta";
        }
        return "Sin Respuesta";

      case "number":
      case "counter":
        if (typeof response === "number") {
          return response.toString();
        }
        // Handle string numbers
        if (typeof response === "string" && !isNaN(Number(response))) {
          return response;
        }
        return "Sin valor";

      case "timer":
        // Try to parse as JSON if it's a string
        let timerData = response;
        if (typeof response === "string") {
          timerData = parseJsonSafely(response);
        }

        if (Array.isArray(timerData)) {
          return timerData.map((cycle: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {cycle.alias || `Ciclo ${index + 1}`}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {cycle.seconds ? formatTime(cycle.seconds) : "Sin duración"}
              </span>
            </div>
          ));
        }
        return "Sin ciclos";

      case "voice":
        // Handle voice responses with audio URL
        if (typeof response === "string" && response.includes("[Audio:")) {
          const audioUrlMatch = response.match(/\[Audio: (.*?)\]/);
          if (audioUrlMatch) {
            const audioUrl = audioUrlMatch[1];
            return (
              <div className="flex items-center gap-2">
                <audio controls className="max-w-xs">
                  <source src={audioUrl} type="audio/webm" />
                  <source src={audioUrl} type="audio/wav" />
                  Tu navegador no soporta el elemento de audio.
                </audio>
                <span className="text-xs text-muted-foreground">
                  Audio grabado
                </span>
              </div>
            );
          }
        }
        return "Sin audio grabado";

      default:
        return typeof response === "string"
          ? response
          : JSON.stringify(response);
    }
  };

  // Format response for CSV export (plain text only)
  const formatResponseForCSV = (response: any, questionType: string) => {
    if (response === null || response === undefined) return "Sin respuesta";

    // Helper function to safely parse JSON
    const parseJsonSafely = (str: string) => {
      try {
        return JSON.parse(str);
      } catch {
        return str;
      }
    };

    switch (questionType) {
      case "text":
      case "string":
        return response;

      case "boolean":
        // For true boolean questions, convert to Sí/No
        if (response === true || response === "true") return "Sí";
        if (response === false || response === "false") return "No";
        // If it's a string that's not "true"/"false", it might be a radio option
        return typeof response === "string" ? response : "Sin respuesta";
        
      case "radio":
        // For radio questions, return the selected option text directly
        return typeof response === "string" ? response : "Sin respuesta";

      case "checkbox":
        // Try to parse as JSON if it's a string
        let checkboxData = response;
        if (typeof response === "string") {
          checkboxData = parseJsonSafely(response);
        }

        if (Array.isArray(checkboxData)) {
          return checkboxData.length > 0
            ? checkboxData.join(", ")
            : "Sin Respuesta";
        }
        return "Sin Respuesta";

      case "number":
      case "counter":
        if (typeof response === "number") {
          return response.toString();
        }
        // Handle string numbers
        if (typeof response === "string" && !isNaN(Number(response))) {
          return response;
        }
        return "Sin valor";

      case "timer":
        // Try to parse as JSON if it's a string
        let timerData = response;
        if (typeof response === "string") {
          timerData = parseJsonSafely(response);
        }

        if (Array.isArray(timerData)) {
          return timerData
            .map(
              (cycle: any, index: number) =>
                `${cycle.alias || `Ciclo ${index + 1}`}: ${
                  cycle.seconds ? formatTime(cycle.seconds) : "Sin duración"
                }`
            )
            .join(" | ");
        }
        return "Sin ciclos";

      default:
        return typeof response === "string"
          ? response
          : JSON.stringify(response);
    }
  };

  const getSessionDuration = () => {
    if (!currentSession?.end_time) return "Sesión activa";

    const start = new Date(currentSession.start_time);
    const end = new Date(currentSession.end_time);
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);

    return formatTime(duration);
  };

  // Export session answers to CSV
  const exportSessionAnswers = async () => {
    // Check if user is the project creator
    if (currentUser?.id !== project?.created_by) {
      showToast("No tienes permisos para exportar sesiones", "error");
      return;
    }

    if (!currentSession || !observations.length) {
      alert("No hay datos de sesión o respuestas disponibles para exportar");
      return;
    }

    try {
      // Use the session creator's email (username only)
      let userEmail = sessionCreator?.email
        ? sessionCreator.email.split("@")[0]
        : `Usuario ${currentSession.user_id.substring(0, 8)}`;

      // Create headers with each question as a column
      const headers = [
        "ID de Sesión",
        "Alias de Sesión",
        "Usuario",
        "Fecha de Inicio",
        "Fecha de Fin",
        "Duración",
        ...observations.map((obs) => obs.question_name),
      ];

      // Create data row
      const dataRow = [
        currentSession.id,
        currentSession.alias || "Sin alias",
        userEmail,
        new Date(currentSession.start_time).toLocaleString(),
        currentSession.end_time
          ? new Date(currentSession.end_time!).toLocaleString()
          : "Sesión activa",
        getSessionDuration(),
        ...observations.map((obs) =>
          formatResponseForCSV(obs.response, obs.question_type || "unknown")
        ),
      ];

      // Create CSV content
      const csvContent = [
        headers.join(","),
        dataRow
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
          .join(","),
      ].join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `sesion-${currentSession.alias}-${
          new Date().toISOString().split("T")[0]
        }.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export error:", error);
      alert(
        "Error during export: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  // Temporarily bypass authentication for debugging
  console.log("🔍 Bypassing auth check for debugging");

  // if (currentLoading) {
  //   return <FullPageLoading text="Verificando autenticación..." />;
  // }

  // if (!currentUser) {
  //   return <FullPageLoading text="Redirigiendo al login..." />;
  // }

  // Loading state
  if (isValidatingAuth || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">
            Cargando detalles de sesión...
          </p>
        </div>
      </div>
    );
  }

  // Authentication error
  if (authError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error de Acceso
            </CardTitle>
            <CardDescription>{authError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => redirectToProjects()} className="w-full">
              Volver a Proyectos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !currentSession) {
    return (
      <div className="min-h-screen bg-muted/50">
        <div className="max-w-7xl mx-auto p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || "Sesión no encontrada"}
            </AlertDescription>
          </Alert>
          <Button onClick={handleBack} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-3 py-6 sm:px-6 sm:py-12">
          {/* Header */}
          <div className="mb-3 sm:mb-6">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <Button
                onClick={handleBack}
                variant="ghost"
                size="sm"
                className="p-0 h-auto text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft size={14} className="sm:w-4 sm:h-4" />
              </Button>
              <div className="text-right min-w-0 flex-1 ml-2">
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Detalles de sesión
                </p>
                <h1 className="text-base sm:text-xl font-semibold text-foreground truncate">
                  {currentSession?.alias ||
                    currentSession?.id?.substring(0, 8) ||
                    "Sesión"}
                </h1>
              </div>
            </div>
          </div>

          {/* Navigation and Actions */}
          <div className="mb-3 sm:mb-4 flex items-center justify-between">
            {/* Session Navigation */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={!hasPrevious}
                className="h-6 w-6 sm:h-8 sm:w-8 p-0"
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <span className="text-xs sm:text-sm text-muted-foreground min-w-[40px] sm:min-w-[60px] text-center">
                {currentIndex + 1}/{allSessions.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={!hasNext}
                className="h-6 w-6 sm:h-8 sm:w-8 p-0"
              >
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                >
                  <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setDrawerOpen(true)}>
                  <Info className="mr-2 h-4 w-4" />
                  Información
                </DropdownMenuItem>
                {/* Finish session button - Only for project creators and if session is not finished */}
                {currentUser?.id === project?.created_by &&
                  !currentSession?.end_time && (
                    <DropdownMenuItem
                      onClick={handleFinishSession}
                      disabled={isFinishing}
                      className="text-green-600 focus:text-green-600"
                      title="El creador del proyecto puede finalizar cualquier sesión"
                    >
                      {isFinishing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Clock className="mr-2 h-4 w-4" />
                      )}
                      {isFinishing ? "Finalizando..." : "Finalizar sesión"}
                    </DropdownMenuItem>
                  )}
                {/* Export button - Only for project creators */}
                {currentUser?.id === project?.created_by && (
                  <DropdownMenuItem onClick={exportSessionAnswers}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar sesión
                  </DropdownMenuItem>
                )}
                {/* Only show separator if there are creator-only buttons */}
                {currentUser?.id === project?.created_by && (
                  <DropdownMenuSeparator />
                )}
                {/* Delete button - Only for project creators */}
                {currentUser?.id === project?.created_by && (
                  <DropdownMenuItem
                    onClick={handleDeleteSession}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar sesión
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Session Details */}
          <div className="space-y-3 sm:space-y-6">
            {/* Session Basic Info */}
            <Card className="border-muted/50">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2 sm:gap-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Fecha</p>
                      <p className="font-medium text-xs sm:text-sm truncate">
                        {new Date(currentSession.start_time).toLocaleDateString(
                          "es-ES",
                          {
                            year: "2-digit",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                    <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Usuario</p>
                      <p className="font-medium text-xs sm:text-sm truncate">
                        {sessionCreator?.email
                          ? sessionCreator.email.split("@")[0]
                          : currentSession.user_id.substring(0, 8)}
                      </p>
                    </div>
                  </div>

                  {/* Session Status Badge */}
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Estado</p>
                      <Badge
                        variant={
                          currentSession?.end_time ? "secondary" : "default"
                        }
                        className="text-xs"
                      >
                        {currentSession?.end_time ? "Finalizada" : "Activa"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Observations */}
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base">
                  Respuestas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {observations.length === 0 ? (
                  <div className="text-center py-4 sm:py-6 text-muted-foreground">
                    <p className="text-xs sm:text-sm">
                      No hay respuestas registradas para esta sesión.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {observations.map((observation) => (
                      <Card
                        key={observation.id}
                        className="bg-muted/20 border-muted/50"
                      >
                        <CardContent className="p-2.5 sm:p-3">
                          <div className="mb-1.5 sm:mb-2">
                            <h4 className="font-medium text-xs sm:text-sm text-foreground leading-tight">
                              {observation.question_name}
                            </h4>
                          </div>

                          <div className="bg-background rounded p-2 border border-muted/30">
                            {observation.question_type === "timer" ||
                            observation.question_type === "voice" ? (
                              <div className="space-y-1">
                                {formatResponse(
                                  observation.response,
                                  observation.question_type || "unknown"
                                )}
                              </div>
                            ) : (
                              <p className="text-xs sm:text-sm leading-relaxed">
                                {formatResponse(
                                  observation.response,
                                  observation.question_type || "unknown"
                                )}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Session Info Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader className="pb-3">
            <DrawerTitle className="text-base sm:text-lg">
              Información de la Sesión
            </DrawerTitle>
            <DrawerDescription className="text-sm">
              Detalles completos de la sesión seleccionada
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto">
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Cliente
                    </p>
                    <p className="font-medium text-sm truncate">
                      {currentSession?.alias ||
                        currentSession?.id?.substring(0, 8) ||
                        "Sin alias"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Fecha
                    </p>
                    <p className="font-medium text-sm">
                      {new Date(currentSession?.start_time).toLocaleDateString(
                        "es-ES",
                        {
                          year: "2-digit",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Duración
                    </p>
                    <p className="font-medium text-sm">
                      {getSessionDuration()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Usuario
                    </p>
                    <p className="font-medium text-sm truncate">
                      {sessionCreator?.email
                        ? sessionCreator.email.split("@")[0]
                        : currentSession?.user_id?.substring(0, 8)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

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
    </ErrorBoundary>
  );
}
