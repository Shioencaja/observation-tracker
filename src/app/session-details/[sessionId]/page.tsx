"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Calendar } from "lucide-react";
import { formatTime } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { FullPageLoading } from "@/components/LoadingSpinner";
import ErrorBoundary from "@/components/ErrorBoundary";

interface Session {
  id: string;
  alias: string;
  start_time: string;
  end_time?: string;
  user_id: string;
  user_email?: string;
}

interface Observation {
  id: string;
  question_id: string;
  question_name: string;
  question_type: string;
  response: any;
  created_at: string;
}

function SessionDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const sessionId = params.sessionId as string;
  const projectId = searchParams.get("project");

  // Debug search params
  console.log("🔍 Search Params Debug:", {
    searchParams: searchParams.toString(),
    projectId,
    sessionId,
    allParams: Object.fromEntries(searchParams.entries()),
  });

  // Fallback authentication check
  const [fallbackUser, setFallbackUser] = useState<any>(null);
  const [fallbackLoading, setFallbackLoading] = useState(true);

  const [session, setSession] = useState<Session | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth check - use fallback if AuthContext is not working
  const currentUser = user || fallbackUser;
  const currentLoading = authLoading || fallbackLoading;

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

  // Load session data
  useEffect(() => {
    if (!currentLoading && currentUser && sessionId && projectId) {
      loadSessionData();
    }
  }, [currentLoading, currentUser, sessionId, projectId]);

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
        question_id: obs.project_observation_options?.name || "Unknown",
        question_name: obs.project_observation_options?.name || "Unknown",
        question_type:
          obs.project_observation_options?.question_type || "unknown",
        response: obs.response,
        created_at: obs.created_at,
      }));

      setObservations(formattedObservations);
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
      router.push(
        `/session-details/${previousSession.id}?project=${projectId}`
      );
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextSession = allSessions[currentIndex + 1];
      router.push(`/session-details/${nextSession.id}?project=${projectId}`);
    }
  };

  const handleBack = () => {
    router.push(`/project-dashboard?project=${projectId}`);
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
    if (!currentSession || !observations.length) {
      alert("No hay datos de sesión o respuestas disponibles para exportar");
      return;
    }

    try {
      // Use the current authenticated user's email if this is their session
      // Otherwise, show a truncated user ID
      let userEmail = currentSession.user_email;
      if (!userEmail && user && currentSession.user_id === user.id) {
        userEmail = user.email;
      } else if (!userEmail) {
        // For other users' sessions, show a truncated user ID
        userEmail = `Usuario ${currentSession.user_id.substring(0, 8)}`;
      }

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
          ? new Date(currentSession.end_time).toLocaleString()
          : "Sesión activa",
        getSessionDuration(),
        ...observations.map((obs) =>
          formatResponseForCSV(obs.response, obs.question_type)
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
  if (isLoading) {
    return <FullPageLoading text="Cargando detalles de sesión..." />;
  }

  // Error state
  if (error || !currentSession) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error || "Sesión no encontrada"}
          </div>
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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Volver al Dashboard</span>
              </Button>

              {/* Navigation and Export */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportSessionAnswers}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>

                <div className="flex items-center gap-2 ml-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={!hasPrevious}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                    {currentIndex + 1} de {allSessions.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={!hasNext}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold">
              Detalles de Sesión
            </h1>
          </div>

          <div className="grid gap-4 sm:gap-6">
            {/* Session Info */}
            <div className="bg-white border rounded-lg p-4 sm:p-6">
              <h2 className="text-lg font-semibold mb-4">
                Información de la Sesión
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{currentSession.alias}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha</p>
                    <p className="font-medium">
                      {new Date(currentSession.start_time).toLocaleDateString(
                        "es-ES",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duración</p>
                    <p className="font-medium">{getSessionDuration()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Usuario</p>
                    <p className="font-medium">
                      {currentSession.user_email ||
                        currentSession.user_id.substring(0, 8)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Observations */}
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Respuestas</h2>

              {observations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay respuestas registradas para esta sesión.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {observations.map((observation) => (
                    <div
                      key={observation.id}
                      className="border rounded-lg p-4 bg-card"
                    >
                      <div className="mb-3">
                        <h4 className="font-medium text-foreground">
                          {observation.question_name}
                        </h4>
                      </div>

                      <div className="bg-muted/30 rounded p-3">
                        {observation.question_type === "timer" ||
                        observation.question_type === "voice" ? (
                          <div className="space-y-1">
                            {formatResponse(
                              observation.response,
                              observation.question_type
                            )}
                          </div>
                        ) : (
                          <p className="text-sm">
                            {formatResponse(
                              observation.response,
                              observation.question_type
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default function SessionDetailsPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <SessionDetailsContent />
    </Suspense>
  );
}
