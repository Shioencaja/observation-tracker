"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogOut, User, Menu, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { SessionWithObservations, Project } from "@/types/observation";
import { Tables } from "@/types/supabase";
import { Loader2 } from "lucide-react";
import DateSelector from "@/components/DateSelector";
import SessionsTable from "@/components/SessionsTable";
import QuestionnaireForm from "@/components/QuestionnaireForm";
import { FullPageLoading } from "@/components/LoadingSpinner";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function SessionsPage() {
  return (
    <Suspense fallback={<FullPageLoading text="Cargando sesiones..." />}>
      <SessionsPageContent />
    </Suspense>
  );
}

function SessionsPageContent() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [selectedDate, setSelectedDate] = useState(() => {
    // Get date from URL params or default to today
    const dateParam = searchParams.get("date");
    if (dateParam) {
      return dateParam;
    }
    // Always default to today's date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  // Get agency from URL params
  useEffect(() => {
    const agencyParam = searchParams.get("agency");
    if (agencyParam) {
      setSelectedAgency(decodeURIComponent(agencyParam));
    }
  }, [searchParams]);

  // Update selected session when URL params change
  useEffect(() => {
    const sessionParam = searchParams.get("session");
    setSelectedSessionId(sessionParam || null);
  }, [searchParams]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [newlyCreatedObservationId, setNewlyCreatedObservationId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

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
    } catch (error) {
      console.error("Error loading project:", error);
    } finally {
      setIsLoadingProject(false);
    }
  }, [searchParams]);

  const loadObservationOptions = async () => {
    if (!project) return;

    try {
      const { data, error } = await supabase
        .from("project_observation_options")
        .select("*")
        .eq("project_id", project.id)
        .eq("is_visible", true)
        .order("order", { ascending: true });

      if (error) throw error;
      setObservationOptions(data || []);
    } catch (error) {
      console.error("Error loading observation options:", error);
    }
  };

  const loadAllSessions = useCallback(async () => {
    if (!user || !project) return;

    try {
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

      const { data: sessionsData, error: sessionError } = await query.order(
        "start_time",
        { ascending: false }
      );

      if (sessionError) {
        console.error("Session error:", sessionError);
        alert(`Database error: ${sessionError.message}`);
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
          alert(`Database error: ${obsError.message}`);
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
          setSelectedSessionId(sessionsData[0].id);
        }
      } else {
        setSessions([]);
        // Don't reset selectedSessionId if it was already set - preserve user's selection
        // Only reset if there was no session selected before
        if (!selectedSessionId) {
          setSelectedSessionId(null);
        }
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
      alert(`Unexpected error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [user, project, selectedDate, selectedSessionId]);

  useEffect(() => {
    // Load project first
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    // Load observation options when project is available
    if (project) {
      loadObservationOptions();
    }

    if (user && project) {
      loadAllSessions();
    } else {
      // If no user or project, stop loading immediately
      setIsLoading(false);
    }
  }, [user, project, selectedDate, selectedAgency, loadAllSessions]);

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

      if (error) throw error;

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

      // Reload all sessions to get the updated list
      await loadAllSessions();

      // Select the newly created session
      setSelectedSessionId(data.id);
      const params = new URLSearchParams(searchParams.toString());
      params.set("session", data.id);
      router.push(`/sessions?${params.toString()}`);
    } catch (error) {
      console.error("Error creating session:", error);
      alert("Error al crear sesión");
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Navigation functions
  const getCurrentSessionIndex = () => {
    return sessions.findIndex((session) => session.id === selectedSessionId);
  };

  const getPreviousSessionId = () => {
    const currentIndex = getCurrentSessionIndex();
    return currentIndex > 0 ? sessions[currentIndex - 1].id : null;
  };

  const getNextSessionId = () => {
    const currentIndex = getCurrentSessionIndex();
    return currentIndex < sessions.length - 1
      ? sessions[currentIndex + 1].id
      : null;
  };

  const navigateToPreviousSession = () => {
    const previousId = getPreviousSessionId();
    if (previousId) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("session", previousId);
      router.push(`/sessions?${params.toString()}`);
    }
  };

  const navigateToNextSession = () => {
    const nextId = getNextSessionId();
    if (nextId) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("session", nextId);
      router.push(`/sessions?${params.toString()}`);
    }
  };

  const finishSession = async () => {
    if (!selectedSessionId || !user) return;

    try {
      const { error } = await supabase
        .from("sessions")
        .update({
          end_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedSessionId);

      if (error) {
        console.error("Error finishing session:", error);
        throw error;
      }

      console.log("✅ Session finished successfully");
      await loadAllSessions(); // Reload sessions to update the UI
    } catch (error) {
      console.error("Error finishing session:", error);
    }
  };

  const addObservation = async () => {
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
      alert(
        `Error: ${error instanceof Error ? error.message : "Error desconocido"}`
      );
    } finally {
      // Observation creation completed
    }
  };

  const clearNewlyCreatedObservationId = () => {
    setNewlyCreatedObservationId(null);
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    // Update URL to reflect the new date, project, and agency
    if (project) {
      const params = new URLSearchParams({
        date: newDate,
        project: project.id,
      });
      if (selectedAgency) {
        params.set("agency", selectedAgency);
      }
      router.push(`/sessions?${params.toString()}`);
    }
  };

  const handleBackToProjects = () => {
    router.push("/projects");
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (authLoading || isLoading || isLoadingProject) {
    return <FullPageLoading text="Cargando sesiones..." />;
  }

  if (!user || !project) {
    return null; // Will redirect
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        {/* Navbar */}
        <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-6xl mx-auto px-3 sm:px-4">
            <div className="flex h-12 sm:h-14 items-center justify-between">
              {/* Logo/Title */}
              <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                <Button
                  onClick={handleBackToProjects}
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 flex-shrink-0"
                >
                  <ArrowLeft size={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Proyectos</span>
                  <span className="sm:hidden">Proy</span>
                </Button>
                <div className="min-w-0 flex-1">
                  <h1 className="text-sm sm:text-lg font-semibold truncate">
                    {project.name}
                  </h1>
                </div>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden sm:flex items-center gap-4">
                <DateSelector
                  selectedDate={selectedDate}
                  onDateChange={handleDateChange}
                />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User size={16} />
                  <span className="max-w-32 truncate">{user.email}</span>
                </div>
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Salir
                </Button>
              </div>

              {/* Mobile Menu */}
              <div className="flex items-center gap-1 sm:hidden flex-shrink-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-1.5 h-8 w-8">
                      <Menu size={18} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-3" align="end">
                    <div className="flex flex-col gap-3">
                      {/* Date Selector */}
                      <div>
                        <h3 className="text-sm font-medium mb-2">Fecha</h3>
                        <DateSelector
                          selectedDate={selectedDate}
                          onDateChange={handleDateChange}
                        />
                      </div>

                      {/* User Info and Actions */}
                      <div className="flex flex-col gap-2 pt-2 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User size={16} />
                          <span className="truncate">{user.email}</span>
                        </div>
                        <Button
                          onClick={handleSignOut}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 justify-start h-9 text-sm"
                        >
                          <LogOut size={16} />
                          Salir
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto px-4 py-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="space-y-4 sm:space-y-6">
            {/* Sessions Table */}
            <SessionsTable
              sessions={sessions}
              selectedSessionId={selectedSessionId}
              onCreateSession={createNewSession}
              onUpdate={loadAllSessions}
              isCreatingSession={isCreatingSession}
              isProjectCreator={user?.id === project?.created_by}
              isCollapsible={true}
            />

            {/* Questionnaire */}
            {(() => {
              if (selectedSessionId) {
                const currentSession = sessions.find(
                  (s) => s.id === selectedSessionId
                );
                return currentSession ? (
                  <QuestionnaireForm
                    observations={currentSession.observations}
                    sessionId={currentSession.id}
                    projectId={project.id}
                    onUpdate={loadAllSessions}
                    canAddObservations={!currentSession.end_time}
                    onAddObservation={addObservation}
                    newlyCreatedObservationId={newlyCreatedObservationId}
                    onClearNewlyCreatedObservationId={
                      clearNewlyCreatedObservationId
                    }
                    observationOptions={observationOptions}
                    sessionEndTime={currentSession.end_time}
                    currentSessionIndex={getCurrentSessionIndex()}
                    totalSessions={sessions.length}
                    onNavigateToPrevious={navigateToPreviousSession}
                    onNavigateToNext={navigateToNextSession}
                    canNavigateToPrevious={!!getPreviousSessionId()}
                    canNavigateToNext={!!getNextSessionId()}
                    sessionStartTime={currentSession.start_time}
                    selectedSessionId={selectedSessionId}
                    isSessionFinished={currentSession?.end_time !== null}
                    onFinishSession={finishSession}
                  />
                ) : null;
              } else {
                // Show empty questionnaire with new session button
                return (
                  <QuestionnaireForm
                    observationOptions={observationOptions}
                    onCreateSession={createNewSession}
                    isCreatingSession={isCreatingSession}
                    projectId={project?.id}
                  />
                );
              }
            })()}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
