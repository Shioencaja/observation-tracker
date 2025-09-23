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
            <Button onClick={() => loadSessionsData()}>Reintentar</Button>
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
    setSessionToDelete(sessionId);
    setDeleteDialogOpen(true);
  };

  const handleExportSession = () => {
    // Check if user is the project creator
    if (user?.id !== project?.created_by) {
      showToast("No tienes permisos para exportar sesiones", "error");
      return;
    }

    // TODO: Implement export functionality
    showToast("Función de exportación en desarrollo", "info");
  };

  // Format response for CSV export (plain text only)
  const formatResponseForCSV = (response: unknown, questionType: string) => {
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
      case "radio":
        return response ? "Sí" : "No";

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
              (cycle: { alias?: string; seconds?: number }, index: number) =>
                `${cycle.alias || `Ciclo ${index + 1}`}: ${
                  cycle.seconds
                    ? formatTimeFromSeconds(cycle.seconds)
                    : "Sin duración"
                }`
            )
            .join(" | ");
        }
        return "Sin ciclos";

      case "voice":
        // Handle voice responses with audio URL
        if (typeof response === "string" && response.includes("[Audio:")) {
          const audioUrlMatch = response.match(/\[Audio: (.*?)\]/);
          if (audioUrlMatch) {
            return "Audio grabado";
          }
        }
        return "Sin audio grabado";

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

      // Get all unique question names for headers
      const allQuestionNames = new Set<string>();
      Object.values(observationsBySession).forEach((observations) => {
        observations.forEach((obs) => {
          allQuestionNames.add(obs.question_name);
        });
      });

      const questionNames = Array.from(allQuestionNames);

      // Prepare CSV headers
      const csvHeaders = [
        "ID de Sesión",
        "Alias",
        "Usuario",
        "Fecha de Inicio",
        "Fecha de Fin",
        "Duración",
        "Agencia",
        "Estado",
        ...questionNames,
      ];

      // Create CSV data
      const csvData = filteredSessions.map((session) => {
        const status = getSessionStatus(session);
        const startTime = new Date(session.start_time).toLocaleString("es-ES");
        const endTime = session.end_time
          ? new Date(session.end_time).toLocaleString("es-ES")
          : "Sesión activa";

        // Calculate duration
        let duration = "Sesión activa";
        if (session.end_time) {
          const start = new Date(session.start_time);
          const end = new Date(session.end_time);
          const durationMs = end.getTime() - start.getTime();
          const hours = Math.floor(durationMs / (1000 * 60 * 60));
          const minutes = Math.floor(
            (durationMs % (1000 * 60 * 60)) / (1000 * 60)
          );
          const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
          duration = `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }

        // Get user email or truncated ID
        const userEmail =
          user?.email || `Usuario ${session.user_id.substring(0, 8)}`;

        // Get observations for this session
        const sessionObservations = observationsBySession[session.id] || [];
        const observationMap = sessionObservations.reduce(
          (acc, obs) => {
            acc[obs.question_name] = obs;
            return acc;
          },
          {} as Record<
            string,
            {
              id: string;
              session_id: string;
              response: unknown;
              created_at: string;
              question_name: string;
              question_type: string;
            }
          >
        );

        // Create base row
        const baseRow = [
          session.id,
          session.alias || `Sesión ${session.id.substring(0, 8)}`,
          userEmail,
          startTime,
          endTime,
          duration,
          session.agency || "Sin agencia",
          status.label,
        ];

        // Add observation responses in the same order as headers
        const observationResponses = questionNames.map((questionName) => {
          const obs = observationMap[questionName];
          if (obs) {
            return formatResponseForCSV(obs.response, obs.question_type);
          }
          return "Sin respuesta";
        });

        return [...baseRow, ...observationResponses];
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
        `Exportadas ${filteredSessions.length} sesiones exitosamente`,
        "success"
      );
    } catch (error) {
      console.error("Error exporting sessions:", error);
      showToast("Error al exportar las sesiones", "error");
    }
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
            .remove(
              voiceRecordings.filter(
                (filename): filename is string => filename !== null
              )
            );

          if (storageError) {
            console.error("Error deleting voice recordings:", storageError);
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

      // Reload sessions
      await loadSessionsData();
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
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">
                Sesiones del proyecto
              </p>
              <h1 className="text-base sm:text-xl font-semibold text-foreground truncate">
                {project.name}
              </h1>
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
                                  {user?.id === project?.created_by && (
                                    <DropdownMenuItem
                                      onClick={handleExportSession}
                                    >
                                      <Download className="mr-2 h-4 w-4" />
                                      Exportar sesión
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDeleteSession(session.id)
                                    }
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar sesión
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
                                    {user?.id === project?.created_by && (
                                      <DropdownMenuItem
                                        onClick={handleExportSession}
                                      >
                                        <Download className="mr-2 h-4 w-4" />
                                        Exportar sesión
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleDeleteSession(session.id)
                                      }
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Eliminar sesión
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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
