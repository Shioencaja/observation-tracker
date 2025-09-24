"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Search,
  Filter,
  X,
  MoreVertical,
  Trash2,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaginationWrapper } from "@/components/ui/pagination-wrapper";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { FullPageLoading } from "@/components/LoadingSpinner";
import { usePagination } from "@/hooks/use-pagination";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ToastContainer } from "@/components/ui/toast";

interface Session {
  id: string;
  user_id: string;
  project_id: string;
  agency: string | null;
  alias: string | null;
  start_time: string;
  end_time: string | null;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Client-side cache for sessions data
const sessionsCache = new Map<
  string,
  { project: Project; sessions: Session[] }
>();

// Helper functions for formatting
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatTime = (timeString: string) => {
  return new Date(timeString).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getSessionStatus = (session: Session) => {
  if (session.end_time) {
    return { label: "Completada", variant: "secondary" as const };
  }
  return { label: "En Progreso", variant: "outline" as const };
};

export default function SessionsPage() {
  return (
    <Suspense fallback={<FullPageLoading text="Cargando sesiones..." />}>
      <SessionsContent />
    </Suspense>
  );
}

function SessionsContent() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [selectedAgency, setSelectedAgency] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      message: string;
      type: "success" | "error" | "info" | "warning";
    }>
  >([]);

  // Get unique agencies and dates for filters
  const uniqueAgencies = Array.from(
    new Set(
      sessions
        .map((s) => s.agency)
        .filter((agency): agency is string => Boolean(agency))
    )
  ).sort();
  const uniqueDates = Array.from(
    new Set(sessions.map((s) => formatDate(s.created_at)))
  ).sort();

  // Filter sessions based on search and filters
  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      activeSearchTerm === "" ||
      (session.alias &&
        session.alias.toLowerCase().includes(activeSearchTerm.toLowerCase())) ||
      (session.agency &&
        session.agency.toLowerCase().includes(activeSearchTerm.toLowerCase()));

    const matchesAgency =
      selectedAgency === "all" || session.agency === selectedAgency;
    const matchesDate =
      selectedDate === "all" || formatDate(session.created_at) === selectedDate;

    return matchesSearch && matchesAgency && matchesDate;
  });

  // Pagination for sessions
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedSessions,
    goToPage,
  } = usePagination({
    data: filteredSessions,
    itemsPerPage: 6, // Reduced for mobile
  });

  // Fetch user session
  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error);
        router.push("/login");
      } else {
        setUser(user);
      }
      setAuthLoading(false);
    }
    getUser();
  }, [router]);

  // Load project and sessions data
  const loadSessionsData = useCallback(async () => {
    if (!projectId || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log("🔍 Starting sessions load for project:", projectId);

      // Check cache first
      const cachedData = sessionsCache.get(projectId);
      if (cachedData) {
        setProject(cachedData.project);
        setSessions(cachedData.sessions);
        setIsLoading(false);
        console.log(
          "✅ Sessions data loaded from cache for project:",
          projectId
        );
        return;
      }

      // Load project info
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) {
        throw projectError;
      }

      console.log("📊 Project loaded:", projectData);
      setProject(projectData);

      // Load sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("sessions")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (sessionsError) {
        throw sessionsError;
      }

      console.log("📅 Sessions loaded:", sessionsData?.length || 0);
      setSessions(sessionsData || []);

      // Cache the data
      sessionsCache.set(projectId, {
        project: projectData,
        sessions: sessionsData || [],
      });

      console.log(
        "✅ Sessions data loaded successfully for project:",
        projectId
      );
    } catch (err) {
      console.error("❌ Error loading sessions data:", err);
      setError("Error al cargar las sesiones");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, user]);

  useEffect(() => {
    console.log("🔍 useEffect triggered:", {
      authLoading,
      user: !!user,
      projectId,
    });
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (projectId) {
        loadSessionsData();
      } else {
        setError("ID de proyecto no proporcionado.");
        setIsLoading(false);
      }
    }
  }, [authLoading, user, projectId, router, loadSessionsData]);

  // Reload data when page becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && projectId) {
        console.log("🔄 Page became visible, reloading sessions data");
        loadSessionsData();
      }
    };

    const handleFocus = () => {
      if (user && projectId) {
        console.log("🔄 Window focused, reloading sessions data");
        loadSessionsData();
      }
    };

    // Listen for page visibility changes and window focus
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user, projectId, loadSessionsData]);

  if (isLoading || authLoading) {
    return <FullPageLoading text="Cargando sesiones..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                sessionsCache.delete(projectId);
                loadSessionsData();
              }}
            >
              Reintentar
            </Button>
            <Button
              variant="link"
              onClick={() => router.push("/projects")}
              className="ml-2"
            >
              Volver a Proyectos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Proyecto no encontrado</CardTitle>
            <CardDescription>
              El proyecto con el ID {projectId} no existe o no tienes acceso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/projects")}>
              Volver a Proyectos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSessionClick = (sessionId: string) => {
    router.push(`/${projectId}/sessions/${sessionId}`);
  };

  const handleSearch = () => {
    setActiveSearchTerm(searchTerm);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setActiveSearchTerm("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

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

  // Handle session actions
  const handleDeleteSession = (sessionId: string) => {
    // Check if user is the project creator
    if (user?.id !== project?.created_by) {
      showToast("No tienes permisos para eliminar sesiones", "error");
      return;
    }

    setSessionToDelete(sessionId);
    setDeleteDialogOpen(true);
  };

  const handleExportSession = (sessionId: string) => {
    // Check if user is the project creator
    if (user?.id !== project?.created_by) {
      showToast("No tienes permisos para exportar sesiones", "error");
      return;
    }

    // TODO: Implement export functionality
    showToast("Función de exportación en desarrollo", "info");
  };

  // Format response for CSV export (show actual values, empty if no response)
  const formatResponseForCSV = (response: unknown, questionType: string) => {
    if (response === null || response === undefined) return "";

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
        // If it's a string that's not "true"/"false", return as is
        return typeof response === "string" ? response : "";

      case "radio":
        // For radio questions, return the selected option text directly
        return typeof response === "string" ? response : "";

      case "checkbox":
        // Try to parse as JSON if it's a string
        let checkboxData = response;
        if (typeof response === "string") {
          checkboxData = parseJsonSafely(response);
        }

        if (Array.isArray(checkboxData)) {
          return checkboxData.length > 0 ? checkboxData.join(", ") : "";
        }
        return "";

      case "number":
      case "counter":
        if (typeof response === "number") {
          return response.toString();
        }
        // Handle string numbers
        if (typeof response === "string" && !isNaN(Number(response))) {
          return response;
        }
        return "";

      case "timer":
        // Try to parse as JSON if it's a string
        let timerData = response;
        if (typeof response === "string") {
          timerData = parseJsonSafely(response);
        }

        if (Array.isArray(timerData)) {
          return timerData
            .map(
              (cycle: { alias?: string; seconds?: number }, index: number) =>
                `${cycle.alias || `Ciclo ${index + 1}`}: ${
                  cycle.seconds
                    ? formatTimeFromSeconds(cycle.seconds)
                    : "Sin duración"
                }`
            )
            .join(" | ");
        }
        return "";

      case "voice":
        // Handle voice responses with audio URL
        if (typeof response === "string" && response.includes("[Audio:")) {
          const audioUrlMatch = response.match(/\[Audio: (.*?)\]/);
          if (audioUrlMatch) {
            return "Audio grabado";
          }
        }
        return "";

      default:
        return typeof response === "string"
          ? response
          : JSON.stringify(response);
    }
  };

  // Format time helper function for seconds
  const formatTimeFromSeconds = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Export all filtered sessions to CSV
  const handleExportAllSessions = async () => {
    try {
      // Check if user is the project creator
      if (user?.id !== project?.created_by) {
        showToast("No tienes permisos para exportar sesiones", "error");
        return;
      }

      if (filteredSessions.length === 0) {
        showToast("No hay sesiones para exportar", "warning");
        return;
      }

      // First, get all observations for all filtered sessions
      const sessionIds = filteredSessions.map((session) => session.id);
      console.log("🔍 CSV Export - Loading observations for sessions:", {
        sessionCount: sessionIds.length,
      });

      const { data: allObservations, error: obsError } = await supabase
        .from("observations")
        .select(
          `
          id,
          session_id,
          response,
          created_at,
          project_observation_options (
            name,
            question_type
          )
        `
        )
        .in("session_id", sessionIds)
        .order("created_at", { ascending: true });

      console.log("🔍 CSV Export - Raw observations from database:", {
        totalObservations: allObservations?.length || 0,
      });

      // Get user emails for all session creators using the same approach as create project
      const uniqueUserIds = Array.from(
        new Set(filteredSessions.map((session) => session.user_id))
      );

      // Use the same RPC function as create project page
      const { data: usersData, error: usersError } = await supabase.rpc(
        "get_all_users"
      );

      if (usersError) {
        console.error("Error loading users:", usersError);
        showToast("Error al cargar los usuarios", "error");
        return;
      }

      // Create a map of user_id to email
      const userEmailMap = new Map<string, string>();
      (usersData || []).forEach((user: { user_id: string; email: string }) => {
        userEmailMap.set(
          user.user_id,
          user.email || `Usuario ${user.user_id.substring(0, 8)}`
        );
      });

      if (obsError) {
        console.error("Error loading observations:", obsError);
        showToast("Error al cargar las observaciones", "error");
        return;
      }

      // Group observations by session
      const observationsBySession: Record<
        string,
        Array<{
          id: string;
          session_id: string;
          response: unknown;
          created_at: string;
          question_name: string;
          question_type: string;
        }>
      > = {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (allObservations || []).forEach((obs: any) => {
        if (!observationsBySession[obs.session_id]) {
          observationsBySession[obs.session_id] = [];
        }
        observationsBySession[obs.session_id].push({
          id: obs.id,
          session_id: obs.session_id,
          response: obs.response,
          created_at: obs.created_at,
          question_name: obs.project_observation_options?.name || "Unknown",
          question_type:
            obs.project_observation_options?.question_type || "unknown",
        });
      });

      console.log("🔍 CSV Export - Observations grouped by session:", {
        sessionsWithObservations: Object.keys(observationsBySession).length,
        totalObservations: Object.values(observationsBySession).reduce(
          (sum, obs) => sum + obs.length,
          0
        ),
      });

      // Prepare CSV headers for questions as rows format
      const csvHeaders = [
        "ID de Sesión",
        "Fecha",
        "Pregunta",
        "Respuesta",
      ];

      // Create CSV data with questions as rows
      const csvData: Array<string[]> = [];

      filteredSessions.forEach((session) => {
        // Format date in Peru timezone (UTC-5)
        const sessionDate = new Date(session.start_time);
        const peruDate = new Date(sessionDate.getTime() - (5 * 60 * 60 * 1000)); // Convert to Peru time
        const formattedDate = peruDate.toLocaleDateString("es-PE", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          timeZone: "America/Lima"
        });

        // Get observations for this session
        const sessionObservations = observationsBySession[session.id] || [];

        if (sessionObservations.length > 0) {
          // Add a row for each observation (question-response pair)
          sessionObservations.forEach((obs) => {
            csvData.push([
              session.id,
              formattedDate,
              obs.question_name,
              String(formatResponseForCSV(obs.response, obs.question_type)),
            ]);
          });
        } else {
          // If no observations, add a row indicating no data
          csvData.push([
            session.id,
            formattedDate,
            "Sin datos",
            "No hay observaciones registradas",
          ]);
        }
      });

      // Create CSV content
      const csvContent = [
        csvHeaders.join(","),
        ...csvData.map((row) =>
          row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `sesiones-${project.name}-${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(
        `Exportadas ${csvData.length} observaciones de ${filteredSessions.length} sesiones exitosamente`,
        "success"
      );
    } catch (error) {
      console.error("Error exporting sessions:", error);
      showToast("Error al exportar las sesiones", "error");
    }
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete || !user) return;

    console.log("🗑️ Starting session deletion:", sessionToDelete);
    try {
      // First, verify the session exists and belongs to the project
      const { data: sessionData, error: sessionCheckError } = await supabase
        .from("sessions")
        .select("id, user_id, project_id, end_time")
        .eq("id", sessionToDelete)
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

      // Project creator can delete any session in their project
      // No need to check if sessionData.user_id === user.id

      // If session is not ended, end it first before deletion
      if (!sessionData.end_time) {
        console.log(
          "⏹️ Session is not ended, ending it first:",
          sessionToDelete
        );
        const { error: endSessionError } = await supabase
          .from("sessions")
          .update({ end_time: new Date().toISOString() })
          .eq("id", sessionToDelete)
          .eq("project_id", project.id);

        if (endSessionError) {
          console.error("Error ending session:", endSessionError);
          showToast(
            `Error al finalizar la sesión antes de eliminar: ${endSessionError.message}`,
            "error"
          );
          return;
        }
        console.log("✅ Session ended successfully before deletion");
      }

      // Get all observations to extract voice recording URLs
      const { data: observations, error: fetchError } = await supabase
        .from("observations")
        .select("response")
        .eq("session_id", sessionToDelete);

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
            .remove(
              voiceRecordings.filter(
                (filename): filename is string => filename !== null
              )
            );

          if (storageError) {
            console.error("Error deleting voice recordings:", storageError);
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
        .eq("session_id", sessionToDelete);

      if (obsError) {
        console.error("Error deleting observations:", obsError);
        if (obsError.code === "23503") {
          showToast(
            "No se pueden eliminar las observaciones debido a restricciones de integridad de datos",
            "error"
          );
        } else if (obsError.code === "42501") {
          showToast(
            "No tienes permisos para eliminar las observaciones de este proyecto",
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
      console.log("🗑️ Deleting session from database:", sessionToDelete);
      const { error: sessionError } = await supabase
        .from("sessions")
        .delete()
        .eq("id", sessionToDelete)
        .eq("project_id", project.id); // Ensure session belongs to this project

      if (sessionError) {
        console.error("Error deleting session:", sessionError);
        if (sessionError.code === "23503") {
          showToast(
            "No se puede eliminar la sesión debido a restricciones de integridad de datos",
            "error"
          );
        } else if (sessionError.code === "42501") {
          showToast(
            "No tienes permisos para eliminar sesiones en este proyecto",
            "error"
          );
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

      console.log("✅ Session deleted successfully");

      // Clear cache to ensure fresh data is loaded
      sessionsCache.delete(projectId);
      console.log("🗑️ Cache cleared for project:", projectId);

      // Reload sessions
      await loadSessionsData();
      showToast(
        "Sesión finalizada y eliminada exitosamente junto con todas sus observaciones",
        "success"
      );
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
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
            <Button
              onClick={() => router.push("/projects")}
              variant="ghost"
              size="sm"
              className="h-8 sm:h-9 text-xs sm:text-sm"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Volver</span>
            </Button>
            <div className="text-right flex-1">
              <p className="text-xs text-muted-foreground mb-1">
                Sesiones del proyecto
              </p>
              <div className="flex items-center justify-end gap-2">
                <h1 className="text-base sm:text-xl font-semibold text-foreground truncate">
                  {project.name}
                </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    sessionsCache.delete(projectId);
                    loadSessionsData();
                  }}
                  disabled={isLoading}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  title="Actualizar lista"
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Search className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-4 space-y-3">
          {/* Search Bar */}
          <div className="relative w-full">
            <Input
              placeholder="Buscar sesiones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pr-20 border-gray-200 focus:border-gray-400 focus:ring-gray-400 h-9 text-sm"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSearch}
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                title="Buscar"
              >
                <Search className="h-4 w-4" />
              </Button>
              {(searchTerm || activeSearchTerm) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSearch}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  title="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filter Toggle, Export Button and Count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <Filter className="h-3 w-3 mr-1" />
                    Filtros
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="start">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Filtros</h4>

                    {/* Agency Filter */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Agencia
                      </Label>
                      <Select
                        value={selectedAgency}
                        onValueChange={setSelectedAgency}
                      >
                        <SelectTrigger className="w-full h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            Todas las agencias
                          </SelectItem>
                          {uniqueAgencies.map((agency) => (
                            <SelectItem key={agency} value={agency}>
                              {agency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Filter */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Fecha
                      </Label>
                      <Select
                        value={selectedDate}
                        onValueChange={setSelectedDate}
                      >
                        <SelectTrigger className="w-full h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las fechas</SelectItem>
                          {uniqueDates.map((date) => (
                            <SelectItem key={date} value={date}>
                              {date}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Clear Filters */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedAgency("all");
                        setSelectedDate("all");
                      }}
                      className="h-8 text-sm text-gray-600"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Limpiar filtros
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Export Button - Only for project creators */}
              {user?.id === project?.created_by && (
                <Button
                  onClick={handleExportAllSessions}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={filteredSessions.length === 0}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Exportar CSV
                </Button>
              )}
            </div>

            <span className="text-xs text-gray-500">
              {filteredSessions.length} de {sessions.length} sesiones
            </span>
          </div>
        </div>

        {/* Sessions List */}
        <div className="space-y-3 sm:space-y-6">
          <div>
            {sessions.length > 0 ? (
              <>
                {/* Mobile Card Layout */}
                <div className="block sm:hidden space-y-2">
                  {paginatedSessions.map((session) => {
                    const status = getSessionStatus(session);
                    return (
                      <Card
                        key={session.id}
                        className="cursor-pointer hover:shadow-sm transition-shadow border-gray-200"
                        onClick={() => handleSessionClick(session.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium text-sm truncate pr-2">
                              {session.alias ||
                                `Sesión ${session.id.substring(0, 6)}`}
                            </h3>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={status.variant}
                                className="text-xs flex-shrink-0 h-5"
                              >
                                {status.label === "Completada"
                                  ? "✓"
                                  : status.label === "En Progreso"
                                  ? "⏳"
                                  : "○"}
                              </Badge>
                              {/* Only show three-dot menu if user is project creator */}
                              {user?.id === project?.created_by && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="w-48"
                                  >
                                    {/* Export button - Only for project creators */}
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleExportSession(session.id);
                                      }}
                                    >
                                      <Download className="mr-2 h-4 w-4" />
                                      Exportar sesión
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {/* Delete button - Only for project creators */}
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSession(session.id);
                                      }}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Eliminar sesión
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(session.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate max-w-20">
                                {session.agency || "Sin agencia"}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden sm:block">
                  <div className="rounded-md border border-gray-200">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sesión</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Hora</TableHead>
                          <TableHead>Agencia</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="w-8"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedSessions.map((session) => {
                          const status = getSessionStatus(session);
                          return (
                            <TableRow
                              key={session.id}
                              className="hover:bg-muted/50 transition-colors cursor-pointer h-12"
                              onClick={() => handleSessionClick(session.id)}
                            >
                              <TableCell className="font-medium">
                                {session.alias ||
                                  `Sesión ${session.id.substring(0, 8)}`}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(session.created_at)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatTime(session.start_time)}
                                {session.end_time &&
                                  ` - ${formatTime(session.end_time)}`}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {session.agency || "Sin agencia"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={status.variant}
                                  className="text-xs"
                                >
                                  {status.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {/* Only show three-dot menu if user is project creator */}
                                {user?.id === project?.created_by ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="w-48"
                                    >
                                      {/* Export button - Only for project creators */}
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleExportSession(session.id);
                                        }}
                                      >
                                        <Download className="mr-2 h-4 w-4" />
                                        Exportar sesión
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      {/* Delete button - Only for project creators */}
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteSession(session.id);
                                        }}
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Eliminar sesión
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : (
                                  <div className="h-8 w-8"></div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {/* Fill remaining rows to maintain fixed height */}
                        {Array.from({
                          length: Math.max(0, 6 - paginatedSessions.length),
                        }).map((_, index) => (
                          <TableRow key={`empty-${index}`} className="h-12">
                            <TableCell colSpan={6} className="h-12"></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-4 sm:py-8">
                <p className="text-muted-foreground mb-3 text-sm sm:text-base">
                  {filteredSessions.length === 0 && sessions.length > 0
                    ? "No se encontraron sesiones con los filtros aplicados"
                    : "No hay sesiones registradas"}
                </p>
                <Button asChild size="sm" className="text-sm">
                  <Link href={`/questionnaire?project=${projectId}`}>
                    Crear Primera Sesión
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-3 sm:mt-6">
              <PaginationWrapper
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Eliminar sesión"
        description="¿Estás seguro de que quieres eliminar esta sesión? Esta acción también eliminará todas las observaciones y grabaciones de voz asociadas. Esta acción no se puede deshacer."
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
