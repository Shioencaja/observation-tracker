"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, LogOut, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  SessionWithObservations,
  ObservationOption,
} from "@/types/observation";
import AuthForm from "@/components/AuthForm";
import DateSelector from "@/components/DateSelector";
import SessionsTable from "@/components/SessionsTable";
import ObservationsTable from "@/components/ObservationsTable";

export default function Home() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [sessions, setSessions] = useState<SessionWithObservations[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [observationOptions, setObservationOptions] = useState<
    ObservationOption[]
  >([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Get today's date in local timezone
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [newlyCreatedObservationId, setNewlyCreatedObservationId] = useState<
    string | null
  >(null);

  const loadObservationOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("observation_options")
        .select("*")
        .eq("is_visible", true)
        .order("name", { ascending: true });

      if (error) throw error;
      setObservationOptions(data || []);
    } catch (error) {
      console.error("Error loading observation options:", error);
    }
  };

  const loadAllSessions = useCallback(async () => {
    if (!user) return;

    try {
      // Get sessions for the selected date (using local timezone)
      const startOfDay = new Date(selectedDate + "T00:00:00");
      const endOfDay = new Date(selectedDate + "T23:59:59.999");

      const { data: sessionsData, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString())
        .order("start_time", { ascending: false });

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
        setSelectedSessionId(null);
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
      alert(`Unexpected error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedDate]);

  useEffect(() => {
    // Load observation options regardless of user status (they're global now)
    loadObservationOptions();

    if (user) {
      loadAllSessions();
    } else {
      // If no user, stop loading immediately
      setIsLoading(false);
    }
  }, [user, selectedDate, loadAllSessions]);

  const createNewSession = async () => {
    if (!user) return;

    setIsCreatingSession(true);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("sessions")
        .insert({
          user_id: user.id,
          start_time: now,
        })
        .select()
        .single();

      if (error) throw error;

      // Reload all sessions to get the updated list
      await loadAllSessions();

      // Select the newly created session
      setSelectedSessionId(data.id);
    } catch (error) {
      console.error("Error creating session:", error);
      alert("Error al crear sesión");
    } finally {
      setIsCreatingSession(false);
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
          option_ids: randomOption?.id || null,
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
      alert(`Error: ${error instanceof Error ? error.message : "Error desconocido"}`);
    } finally {
      // Observation creation completed
    }
  };

  const clearNewlyCreatedObservationId = () => {
    setNewlyCreatedObservationId(null);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 size={20} className="animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto px-1 sm:px-4">
          <div className="flex h-14 items-center justify-between">
            {/* Logo/Title */}
            <div className="flex items-center">
              <h1 className="text-lg font-semibold sm:text-xl">
                Dependencia del guía
              </h1>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center gap-4">
              <DateSelector
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User size={16} />
                <span className="max-w-32 truncate">{user.email}</span>
              </div>
              <Button
                onClick={signOut}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <LogOut size={16} />
                Salir
              </Button>
            </div>

            {/* Mobile Menu */}
            <div className="flex items-center gap-2 sm:hidden">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Menu size={20} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="end">
                  <div className="flex flex-col gap-3">
                    {/* Date Selector */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">Fecha</h3>
                      <DateSelector
                        selectedDate={selectedDate}
                        onDateChange={setSelectedDate}
                      />
                    </div>

                    {/* User Info and Actions */}
                    <div className="flex flex-col gap-2 pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User size={16} />
                        <span className="truncate">{user.email}</span>
                      </div>
                      <Button
                        onClick={signOut}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 justify-start"
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

      <div className="max-w-6xl mx-auto p-1 sm:p-4 space-y-3 sm:space-y-6">
        <div className="space-y-3 sm:space-y-4">
          {/* Sessions Table */}
          <SessionsTable
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            onSessionSelect={setSelectedSessionId}
            onCreateSession={createNewSession}
            onUpdate={loadAllSessions}
            isCreatingSession={isCreatingSession}
          />

          {/* Observations Table */}
          {selectedSessionId &&
            (() => {
              const currentSession = sessions.find(
                (s) => s.id === selectedSessionId
              );
              return currentSession ? (
                <ObservationsTable
                  observations={currentSession.observations}
                  sessionId={currentSession.id}
                  onUpdate={loadAllSessions}
                  canAddObservations={!currentSession.end_time}
                  onAddObservation={addObservation}
                  newlyCreatedObservationId={newlyCreatedObservationId}
                  onClearNewlyCreatedObservationId={
                    clearNewlyCreatedObservationId
                  }
                />
              ) : null;
            })()}
        </div>
      </div>
    </div>
  );
}
