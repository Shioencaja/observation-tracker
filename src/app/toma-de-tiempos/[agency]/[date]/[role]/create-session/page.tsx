"use client";

import {
  useState,
  useEffect,
  Suspense,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Edit,
  Save,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FullPageLoading } from "@/components/LoadingSpinner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Database } from "@/types/supabase";

type TdtSession = Database["public"]["Tables"]["tdt_sessions"]["Row"];
type TdtObservation = Database["public"]["Tables"]["tdt_observations"]["Row"];
type TdtAgencia = Database["public"]["Tables"]["tdt_agencias"]["Row"];
type ListaAgencia = Database["public"]["Tables"]["lista_agencias"]["Row"];

// Type for an observation with cascading dropdowns
interface Observation {
  id: string;
  dbId: number | null; // Database ID for tdt_observations
  firstDropdown: string; // Maps to lugar
  secondDropdown: string; // Maps to canal
  thirdDropdown: string; // Maps to descripcion
  startTime: string | null; // Maps to inicio
  endTime: string | null; // Maps to fin
  isFinished: boolean;
  comentarios: string | null; // Maps to comentarios from tdt_observations
  posicion: string | null; // Maps to posicion from tdt_observations
  altura: string | null; // Maps to altura from tdt_observations
}

// Type for a session card with multiple observations
interface SessionCard {
  id: string;
  dbId: number | null; // Database ID for tdt_sessions
  observations: Observation[];
  startTime: string | null; // Maps to inicio
  finishTime: string | null; // Maps to fin
  cliente: string | null; // Maps to cliente from tdt_sessions
  created_at?: string; // Creation timestamp for sorting
}

// Cascading options structure from tdt_options
// Structure: lugar -> canal -> descripcion
interface CascadingOptions {
  [lugar: string]: {
    [canal: string]: string[]; // Array of descripciones
  };
}

function CreateSessionPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const agency = params?.agency as string;
  const date = params?.date as string;
  const role = params?.role as string;
  const [selectedAgency, setSelectedAgency] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [agencyCode, setAgencyCode] = useState<number | null>(null);
  const [sessionCards, setSessionCards] = useState<SessionCard[]>([]);
  const [minimizedCards, setMinimizedCards] = useState<Set<string>>(new Set());
  const [finishedCards, setFinishedCards] = useState<Set<string>>(new Set());
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [cascadingOptions, setCascadingOptions] = useState<CascadingOptions>(
    {}
  );
  const [lugares, setLugares] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingObservation, setEditingObservation] = useState<{
    cardId: string;
    observationId: string | null;
  } | null>(null);
  const [dialogFormData, setDialogFormData] = useState<{
    firstDropdown: string;
    secondDropdown: string;
    thirdDropdown: string;
    startTime: string | null;
    comentarios: string;
    posicion: string;
    altura: string;
  }>({
    firstDropdown: "",
    secondDropdown: "",
    thirdDropdown: "",
    startTime: null,
    comentarios: "",
    posicion: "",
    altura: "",
  });
  const [agencyObservation, setAgencyObservation] = useState<string>("");
  const [agencyObservationId, setAgencyObservationId] = useState<number | null>(
    null
  );
  const [isSavingAgencyObservation, setIsSavingAgencyObservation] =
    useState(false);
  const [isAgencyObservationDialogOpen, setIsAgencyObservationDialogOpen] =
    useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sessionCardsRef = useRef(sessionCards);
  const finishedCardsRef = useRef(finishedCards);
  const lastVisibleRef = useRef(Date.now());
  const recentlyCreatedSessionsRef = useRef<Set<number>>(new Set());
  const isCreatingSessionRef = useRef(false);
  const isSavingObservationRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    sessionCardsRef.current = sessionCards;
  }, [sessionCards]);

  useEffect(() => {
    finishedCardsRef.current = finishedCards;
  }, [finishedCards]);

  // Helper to get card finish time
  const getCardFinishTime = (cardId: string): string | null => {
    const card = sessionCards.find((c) => c.id === cardId);
    return card?.finishTime || null;
  };

  // Helper to get card start time
  const getCardStartTime = (cardId: string): string | null => {
    const card = sessionCards.find((c) => c.id === cardId);
    return card?.startTime || null;
  };

  // Helper to check if all observations in a card have started
  const canFinishCard = (cardId: string): boolean => {
    const card = sessionCards.find((c) => c.id === cardId);
    if (!card || card.observations.length === 0) return false;
    return card.observations.every((obs) => obs.startTime !== null);
  };

  // Helper to check if the last observation in a card has started
  const canAddObservation = (cardId: string): boolean => {
    const card = sessionCards.find((c) => c.id === cardId);
    if (!card) return false;
    // Cannot add observations if session is finished
    if (finishedCards.has(cardId)) return false;
    if (card.observations.length === 0) return true; // Can add first observation
    const lastObservation = card.observations[card.observations.length - 1];
    return lastObservation.startTime !== null;
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Prevent body scrolling and set height to 100svh when component mounts
  useEffect(() => {
    // Set html and body to 100svh
    document.documentElement.style.height = "100svh";
    document.documentElement.style.overflow = "hidden";
    document.body.style.height = "100svh";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.height = "";
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.height = "";
    };
  }, []);

  // Handle visibility change - save state and reload page when user comes back to tab
  useEffect(() => {
    let wasHidden = false;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // Mark that the page was hidden
        wasHidden = true;

        // Save state if user is creating or editing
        if (
          isDialogOpen ||
          editingObservation ||
          isAgencyObservationDialogOpen
        ) {
          const stateToSave = {
            isDialogOpen,
            editingObservation,
            dialogFormData,
            isAgencyObservationDialogOpen,
            agencyObservation,
            sessionCards: sessionCards.map((card) => ({
              id: card.id,
              dbId: card.dbId,
              cliente: card.cliente,
            })),
            minimizedCards: Array.from(minimizedCards),
            timestamp: Date.now(),
          };
          sessionStorage.setItem(
            "tdt_create_session_state",
            JSON.stringify(stateToSave)
          );
        }

        // Save recently created sessions to prevent duplicates
        if (recentlyCreatedSessionsRef.current.size > 0) {
          const recentSessions = Array.from(recentlyCreatedSessionsRef.current);
          sessionStorage.setItem(
            "tdt_recent_sessions",
            JSON.stringify({
              sessionIds: recentSessions,
              timestamp: Date.now(),
            })
          );
        }
      } else if (document.visibilityState === "visible" && wasHidden) {
        // Always reload the page when user comes back after leaving
        // State will be restored after reload
        window.location.reload();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    isDialogOpen,
    editingObservation,
    dialogFormData,
    sessionCards,
    isAgencyObservationDialogOpen,
    agencyObservation,
  ]);

  useEffect(() => {
    if (agency && role) {
      // agency is now CODSUCAGE (number as string), parse it
      const agencyCode = parseInt(agency, 10);
      if (isNaN(agencyCode)) {
        // Invalid agency code, redirect back
        router.push("/toma-de-tiempos");
        return;
      }

      // Set agency code directly
      setAgencyCode(agencyCode);

      // Convert role slug back to database format (e.g., "guia" -> "Guía", "gerente" -> "Gerente")
      const roleMap: { [key: string]: string } = {
        guia: "Guía",
        gerente: "Gerente",
      };
      const formattedRole =
        roleMap[role.toLowerCase()] ||
        role.charAt(0).toUpperCase() + role.slice(1);
      setSelectedRole(formattedRole);

      // Load agency name for display
      loadAgencyName(agencyCode);
    } else {
      // If no agency or role is provided, redirect back to selection
      router.push("/toma-de-tiempos");
    }
  }, [agency, role, router]);

  useEffect(() => {
    if (user && selectedRole) {
      loadLugares();
      loadOptions();
    }
  }, [user, selectedRole]);

  useEffect(() => {
    if (
      agencyCode &&
      date &&
      user &&
      user?.email &&
      selectedRole &&
      !authLoading
    ) {
      loadSessions();
      loadAgencyObservation();
    }
  }, [agencyCode, date, user, selectedRole, authLoading]);

  // Ensure agency observations load after sessions finish loading (safety net)
  useEffect(() => {
    if (
      !isLoadingSessions &&
      !authLoading &&
      agencyCode &&
      date &&
      user?.email &&
      selectedRole
    ) {
      // Load agency observations after sessions are loaded
      loadAgencyObservation();
    }
  }, [isLoadingSessions, authLoading, agencyCode, date, user, selectedRole]);

  // Restore saved state and recently created sessions tracking after sessions are loaded
  useEffect(() => {
    if (!isLoadingSessions && sessionCards.length > 0) {
      // Restore recently created sessions tracking
      const recentSessionsData = sessionStorage.getItem("tdt_recent_sessions");
      if (recentSessionsData) {
        try {
          const data = JSON.parse(recentSessionsData);
          // Only restore if within last 30 seconds
          if (
            Date.now() - data.timestamp < 30000 &&
            data.sessionIds.length > 0
          ) {
            data.sessionIds.forEach((id: number) => {
              recentlyCreatedSessionsRef.current.add(id);
              // Remove from tracking after remaining time
              const remainingTime = 30000 - (Date.now() - data.timestamp);
              if (remainingTime > 0) {
                setTimeout(() => {
                  recentlyCreatedSessionsRef.current.delete(id);
                }, remainingTime);
              }
            });
          }
          // Clear after restoring
          sessionStorage.removeItem("tdt_recent_sessions");
        } catch (error) {
          console.error("Error restoring recent sessions:", error);
          sessionStorage.removeItem("tdt_recent_sessions");
        }
      }

      // Restore dialog state
      const savedState = sessionStorage.getItem("tdt_create_session_state");
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          // Only restore if saved within last 30 seconds (to avoid stale state)
          if (Date.now() - state.timestamp < 30000) {
            // Restore agency observation dialog if it was open
            if (state.isAgencyObservationDialogOpen) {
              if (state.agencyObservation !== undefined) {
                setAgencyObservation(state.agencyObservation);
              }
              setIsAgencyObservationDialogOpen(true);
            }

            // Restore main observation dialog if it was open
            if (state.isDialogOpen || state.editingObservation) {
              // Find the card that was being edited (if it still exists)
              if (state.editingObservation) {
                // Try to find card by ID first
                let card = sessionCards.find(
                  (c) => c.id === state.editingObservation.cardId
                );

                // If not found by ID, try to find by dbId (in case IDs changed after reload)
                if (!card && state.editingObservation.cardId) {
                  const savedCardId = state.editingObservation.cardId;
                  const dbIdMatch = savedCardId.match(/card-(\d+)/);
                  if (dbIdMatch) {
                    const savedDbId = parseInt(dbIdMatch[1]);
                    card = sessionCards.find((c) => c.dbId === savedDbId);
                  }
                }

                // If still not found and it was a new observation, try to find the most recent card
                if (!card && !state.editingObservation.observationId) {
                  // Find the most recently created card (first in array since sorted newest first)
                  card = sessionCards[0];
                }

                if (card) {
                  // If we found a card but the ID changed, update the editingObservation
                  const updatedEditingObservation = {
                    cardId: card.id,
                    observationId: state.editingObservation.observationId,
                  };

                  // If editing an existing observation, verify it still exists
                  if (state.editingObservation.observationId) {
                    const observation = card.observations.find(
                      (obs) => obs.id === state.editingObservation.observationId
                    );
                    if (!observation) {
                      // Observation doesn't exist anymore, clear saved state
                      sessionStorage.removeItem("tdt_create_session_state");
                      return;
                    }
                  }

                  // Restore dialog state
                  setDialogFormData(state.dialogFormData);
                  setEditingObservation(updatedEditingObservation);
                  setIsDialogOpen(true);
                } else {
                  // Card doesn't exist anymore, clear saved state
                  sessionStorage.removeItem("tdt_create_session_state");
                  return;
                }
              } else if (state.isDialogOpen) {
                // Dialog was open but no editing observation, restore form data
                if (state.dialogFormData) {
                  setDialogFormData(state.dialogFormData);
                }
                setIsDialogOpen(true);
              }
            }

            // Clear saved state after restoring
            sessionStorage.removeItem("tdt_create_session_state");
          } else {
            // State is too old, clear it
            sessionStorage.removeItem("tdt_create_session_state");
          }
        } catch (error) {
          console.error("Error restoring saved state:", error);
          sessionStorage.removeItem("tdt_create_session_state");
        }
      }
    }
  }, [isLoadingSessions, sessionCards]);

  const loadLugares = async () => {
    if (!selectedRole) {
      setLugares([]);
      return;
    }

    try {
      // Load unique lugares from tdt_options filtered by role
      const { data: optionsData, error: optionsError } = await supabase
        .from("tdt_options")
        .select("lugar")
        .eq("rol", selectedRole)
        .not("lugar", "is", null);

      if (optionsError) {
        console.error("Error loading lugares:", optionsError);
        setLugares([]);
        return;
      }

      if (optionsData && optionsData.length > 0) {
        // Get unique lugares and sort them
        const uniqueLugares = Array.from(
          new Set(optionsData.map((item) => item.lugar).filter(Boolean))
        ).sort();
        setLugares(uniqueLugares);
      } else {
        setLugares([]);
      }
    } catch (error) {
      console.error("Error loading lugares:", error);
      setLugares([]);
    }
  };

  const loadOptions = async () => {
    if (!selectedRole) {
      return;
    }

    try {
      // Load options from tdt_options filtered by role
      const { data: optionsData, error: optionsError } = await supabase
        .from("tdt_options")
        .select("*")
        .eq("rol", selectedRole);

      if (optionsError) {
        console.error("Error loading options:", optionsError);
        return;
      }

      if (!optionsData || optionsData.length === 0) {
        setCascadingOptions({});
        return;
      }

      // Build cascading structure: lugar -> canal -> descripcion
      const cascading: CascadingOptions = {};

      optionsData.forEach((option) => {
        const lugar = option.lugar;
        const canal = option.canal;
        const descripcion = option.descripción;

        // Skip if no lugar is specified
        if (!lugar) {
          return;
        }

        // Initialize the lugar entry if it doesn't exist
        if (!cascading[lugar]) {
          cascading[lugar] = {};
        }

        // If canal exists, add it to the structure
        if (canal) {
          // Initialize the canal entry if it doesn't exist
          if (!cascading[lugar][canal]) {
            cascading[lugar][canal] = [];
          }

          // If descripcion exists, add it to the canal's descripciones array
          if (descripcion && !cascading[lugar][canal].includes(descripcion)) {
            cascading[lugar][canal].push(descripcion);
          }
        } else if (descripcion) {
          // If no canal but has descripcion, use a placeholder "Sin canal"
          const placeholderCanal = "Sin canal";
          if (!cascading[lugar][placeholderCanal]) {
            cascading[lugar][placeholderCanal] = [];
          }

          if (!cascading[lugar][placeholderCanal].includes(descripcion)) {
            cascading[lugar][placeholderCanal].push(descripcion);
          }
        }
      });

      // Sort all descripciones arrays alphabetically
      Object.keys(cascading).forEach((lugar) => {
        Object.keys(cascading[lugar]).forEach((canal) => {
          cascading[lugar][canal].sort();
        });
      });

      setCascadingOptions(cascading);
    } catch (error) {
      console.error("Error loading options:", error);
      setCascadingOptions({});
    }
  };

  const loadAgencyName = async (agencyCode: number) => {
    try {
      // Load lista_agencias to get the agency name for display
      const { data: listaAgenciaData, error: listaAgenciaError } =
        await supabase
          .from("lista_agencias")
          .select("DESSUCAGE")
          .eq("CODSUCAGE", agencyCode)
          .single();

      if (listaAgenciaError) {
        console.error("Error loading agency name:", listaAgenciaError);
        // Set a fallback name if we can't load it
        setSelectedAgency(`Agencia ${agencyCode}`);
        return;
      }

      if (listaAgenciaData?.DESSUCAGE) {
        setSelectedAgency(listaAgenciaData.DESSUCAGE);
      } else {
        setSelectedAgency(`Agencia ${agencyCode}`);
      }
    } catch (error) {
      console.error("Error loading agency name:", error);
      setSelectedAgency(`Agencia ${agencyCode}`);
    }
  };

  const loadSessions = async () => {
    if (!agencyCode || !date || !selectedRole || !user?.email) {
      return;
    }

    try {
      setIsLoadingSessions(true);

      // Parse the date and create date range for the day
      // created_at is stored in UTC, so we need to account for timezone
      // Peruvian timezone is UTC-5, so we need to query a wider range
      // Start: date at 00:00:00 in Peru = date-1 at 19:00:00 UTC (if date is in Peru)
      // End: date at 23:59:59 in Peru = date+1 at 04:59:59 UTC
      // But to be safe, let's query the entire day in both timezones
      const startOfDayPeru = `${date}T00:00:00.000-05:00`;
      const endOfDayPeru = `${date}T23:59:59.999-05:00`;
      // Also try UTC range (5 hours ahead)
      const startOfDayUTC = `${date}T05:00:00.000Z`; // 00:00 Peru = 05:00 UTC
      const endOfDayUTC = `${date}T23:59:59.999Z`; // This covers until 18:59 Peru time
      const endOfDayUTCNext = `${date}T23:59:59.999Z`; // Actually need next day 04:59:59 UTC

      // Try querying with Peruvian timezone first
      // Filter by user's email to only show sessions created by the current user
      let { data: sessionsData, error: sessionsError } = await supabase
        .from("tdt_sessions")
        .select("*")
        .eq("agencia", agencyCode)
        .eq("rol", selectedRole)
        .eq("created_by", user.email)
        .gte("created_at", startOfDayPeru)
        .lte("created_at", endOfDayPeru)
        .order("created_at", { ascending: false });

      // If no results, try with a wider range or without timezone
      if ((!sessionsData || sessionsData.length === 0) && !sessionsError) {
        // Try querying all sessions for the agency/role and filter by date in JavaScript
        // Filter by user's email to only show sessions created by the current user
        const { data: allSessionsData, error: allSessionsError } =
          await supabase
            .from("tdt_sessions")
            .select("*")
            .eq("agencia", agencyCode)
            .eq("rol", selectedRole)
            .eq("created_by", user.email)
            .order("created_at", { ascending: false });

        if (!allSessionsError && allSessionsData) {
          // Filter by date in JavaScript
          // Sessions are stored in UTC, so we need to check both UTC date and Peru timezone date
          sessionsData = allSessionsData.filter((session) => {
            if (!session.created_at) return false;
            const sessionDate = new Date(session.created_at);

            // Check UTC date (how it's stored)
            const sessionDateUTC = sessionDate.toISOString().split("T")[0];

            // Check Peruvian timezone date (how user sees it)
            const sessionDatePeru = sessionDate.toLocaleDateString("en-CA", {
              timeZone: "America/Lima",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            });

            // Also check if the session date in UTC could represent the target date in Peru
            // A session created on date-1 in UTC (late evening) might be date in Peru
            // A session created on date in UTC (early morning) might be date-1 in Peru
            // So we check if either matches
            const matches = sessionDateUTC === date || sessionDatePeru === date;

            return matches;
          });
        } else {
          sessionsError = allSessionsError;
        }
      }

      if (sessionsError) {
        console.error("Error loading sessions:", sessionsError);
        throw sessionsError;
      }

      if (!sessionsData || sessionsData.length === 0) {
        setSessionCards([]);
        setIsLoadingSessions(false);
        return;
      }

      // Load observations for all sessions
      const sessionIds = sessionsData.map((s) => s.id);
      const { data: observationsData, error: observationsError } =
        await supabase
          .from("tdt_observations")
          .select("*")
          .in("tdt_session", sessionIds)
          .order("inicio", { ascending: true });

      if (observationsError) {
        console.error("Error loading observations:", observationsError);
        throw observationsError;
      }

      // Transform database data to SessionCard format
      const cards: SessionCard[] = sessionsData.map((session) => {
        const sessionObservations = (observationsData || []).filter(
          (obs) => obs.tdt_session === session.id
        );

        const observations: Observation[] = sessionObservations.map((obs) => ({
          id: `obs-${obs.id}`,
          dbId: obs.id,
          firstDropdown: obs.lugar || "",
          secondDropdown: obs.canal || "",
          thirdDropdown: obs.descripcion || "",
          startTime: obs.inicio,
          endTime: obs.fin,
          isFinished: obs.fin !== null,
          comentarios: obs.comentarios || null,
          posicion: obs.posicion || null,
          altura: obs.altura || null,
        }));

        return {
          id: `card-${session.id}`,
          dbId: session.id,
          observations,
          startTime: session.inicio,
          finishTime: session.fin,
          cliente: session.cliente,
          created_at: session.created_at, // Store created_at for sorting
        };
      });

      // Sort cards by creation date (newer first)
      // Use created_at if available, otherwise use startTime
      cards.sort((a, b) => {
        const aTime = a.created_at
          ? new Date(a.created_at).getTime()
          : a.startTime
          ? new Date(a.startTime).getTime()
          : 0;
        const bTime = b.created_at
          ? new Date(b.created_at).getTime()
          : b.startTime
          ? new Date(b.startTime).getTime()
          : 0;
        return bTime - aTime; // Descending order (newer first)
      });

      setSessionCards(cards);

      // Restore minimizedCards from sessionStorage if available
      let restoredMinimized: Set<string> | null = null;
      try {
        const savedState = sessionStorage.getItem("tdt_create_session_state");
        if (savedState) {
          const state = JSON.parse(savedState);
          if (state.minimizedCards && Array.isArray(state.minimizedCards)) {
            // Map old card IDs to new card IDs if needed
            const minimizedSet = new Set<string>();
            state.minimizedCards.forEach((oldCardId: string) => {
              // Try to find matching card by old ID
              let card = cards.find((c) => c.id === oldCardId);

              // If not found, try to match by dbId (extract from old ID)
              if (!card && oldCardId.startsWith("card-")) {
                const dbIdMatch = oldCardId.match(/card-(\d+)/);
                if (dbIdMatch) {
                  const savedDbId = parseInt(dbIdMatch[1]);
                  card = cards.find((c) => c.dbId === savedDbId);
                }
              }

              if (card) {
                minimizedSet.add(card.id);
              }
            });
            restoredMinimized = minimizedSet;
          }
        }
      } catch (error) {
        console.error("Error restoring minimized cards:", error);
      }

      // Set finished cards
      const finished = new Set<string>();
      // Set minimized cards - use restored state if available, otherwise minimize all
      const minimized = restoredMinimized || new Set<string>();
      cards.forEach((card) => {
        // If no restored state, minimize all cards by default
        if (!restoredMinimized) {
          minimized.add(card.id);
        }
        if (card.finishTime) {
          finished.add(card.id);
        }
      });
      setMinimizedCards(minimized);
      setFinishedCards(finished);
    } catch (error) {
      console.error("Error loading sessions:", error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadAgencyObservation = async () => {
    if (!agencyCode || !date || !selectedRole || !user?.email) {
      console.log("loadAgencyObservation: Missing required params", {
        agencyCode,
        date,
        selectedRole,
        userEmail: user?.email,
      });
      return;
    }

    try {
      console.log("loadAgencyObservation: Loading observations", {
        agencyCode,
        date,
        selectedRole,
        userEmail: user.email,
      });

      // Calculate date range for the day in Peru timezone
      const startOfDayPeru = new Date(`${date}T00:00:00-05:00`).toISOString();
      const endOfDayPeru = new Date(`${date}T23:59:59-05:00`).toISOString();

      // First try with date range query
      let { data: observationsData, error: observationsError } = await supabase
        .from("tdt_agencia_observation")
        .select("*")
        .eq("CODSUCAGE", agencyCode)
        .eq("rol", selectedRole)
        .eq("created_by", user.email)
        .gte("created_at", startOfDayPeru)
        .lte("created_at", endOfDayPeru)
        .order("created_at", { ascending: false });

      // If no results, try querying all observations for this agency/role and filter by date in JavaScript
      if (
        (!observationsData || observationsData.length === 0) &&
        !observationsError
      ) {
        console.log(
          "loadAgencyObservation: No results with date range, trying wider query"
        );
        const { data: allObservationsData, error: allObservationsError } =
          await supabase
            .from("tdt_agencia_observation")
            .select("*")
            .eq("CODSUCAGE", agencyCode)
            .eq("rol", selectedRole)
            .eq("created_by", user.email)
            .order("created_at", { ascending: false });

        if (!allObservationsError && allObservationsData) {
          // Filter by date in JavaScript (similar to how we filter sessions)
          observationsData = allObservationsData.filter((obs) => {
            if (!obs.created_at) return false;
            const obsDate = new Date(obs.created_at);

            // Check UTC date (how it's stored)
            const obsDateUTC = obsDate.toISOString().split("T")[0];

            // Check Peruvian timezone date (how user sees it)
            const obsDatePeru = obsDate.toLocaleDateString("en-CA", {
              timeZone: "America/Lima",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            });

            // Check if either matches
            const matches = obsDateUTC === date || obsDatePeru === date;
            return matches;
          });
        } else {
          observationsError = allObservationsError;
        }
      }

      if (observationsError) {
        console.error("Error loading agency observation:", observationsError);
        return;
      }

      console.log("loadAgencyObservation: Found observations", {
        count: observationsData?.length || 0,
        observations: observationsData,
      });

      if (observationsData && observationsData.length > 0) {
        // Get the most recent observation (first in array since sorted descending)
        const matchingObservation = observationsData[0];
        console.log(
          "loadAgencyObservation: Setting observation",
          matchingObservation
        );
        setAgencyObservation(matchingObservation.observaciones || "");
        setAgencyObservationId(matchingObservation.id);
      } else {
        console.log("loadAgencyObservation: No matching observations found");
        setAgencyObservation("");
        setAgencyObservationId(null);
      }
    } catch (error) {
      console.error("Error loading agency observation:", error);
    }
  };

  const saveAgencyObservation = async () => {
    if (!agencyCode || !date || !selectedRole || !user?.email) {
      return;
    }

    try {
      setIsSavingAgencyObservation(true);

      if (agencyObservationId) {
        // Update existing observation
        const { error: updateError } = await supabase
          .from("tdt_agencia_observation")
          .update({
            observaciones: agencyObservation || null,
          })
          .eq("id", agencyObservationId);

        if (updateError) {
          console.error("Error updating agency observation:", updateError);
          alert("Error al guardar las observaciones");
          return;
        }
      } else {
        // Check if there's already an observation for this date before creating
        // This prevents duplicates if the date filter didn't catch it
        const { data: existingObservations, error: checkError } = await supabase
          .from("tdt_agencia_observation")
          .select("*")
          .eq("CODSUCAGE", agencyCode)
          .eq("rol", selectedRole)
          .eq("created_by", user.email)
          .order("created_at", { ascending: false });

        if (!checkError && existingObservations) {
          // Filter by date in JavaScript
          const matchingObservation = existingObservations.find((obs) => {
            if (!obs.created_at) return false;
            const obsDate = new Date(obs.created_at);
            const obsDatePeru = obsDate.toLocaleDateString("en-CA", {
              timeZone: "America/Lima",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            });
            return obsDatePeru === date;
          });

          if (matchingObservation) {
            // Update the existing observation instead of creating a new one
            const { error: updateError } = await supabase
              .from("tdt_agencia_observation")
              .update({
                observaciones: agencyObservation || null,
              })
              .eq("id", matchingObservation.id);

            if (updateError) {
              console.error("Error updating agency observation:", updateError);
              alert("Error al guardar las observaciones");
              return;
            }

            setAgencyObservationId(matchingObservation.id);
            return;
          }
        }

        // Create new observation if none exists for this date
        const { data: newObservation, error: insertError } = await supabase
          .from("tdt_agencia_observation")
          .insert({
            CODSUCAGE: agencyCode,
            rol: selectedRole,
            observaciones: agencyObservation || null,
            created_by: user.email,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating agency observation:", insertError);
          alert("Error al guardar las observaciones");
          return;
        }

        if (newObservation) {
          setAgencyObservationId(newObservation.id);
        }
      }
    } catch (error) {
      console.error("Error saving agency observation:", error);
      alert("Error al guardar las observaciones");
    } finally {
      setIsSavingAgencyObservation(false);
    }
  };

  const handleBack = () => {
    router.push("/toma-de-tiempos");
  };

  const handleCreateSession = useCallback(async () => {
    console.log("handleCreateSession called", { agencyCode, selectedRole });

    // Prevent duplicate creation
    if (isCreatingSessionRef.current) {
      console.log(
        "handleCreateSession: Already creating a session, ignoring duplicate call"
      );
      return;
    }

    if (!agencyCode || !selectedRole) {
      console.log("handleCreateSession: Missing agencyCode or selectedRole");
      return;
    }

    // Check for recently created sessions to prevent duplicates
    const recentSessionsData = sessionStorage.getItem("tdt_recent_sessions");
    if (recentSessionsData) {
      try {
        const data = JSON.parse(recentSessionsData);
        // If sessions were created within last 5 seconds, don't create another
        if (Date.now() - data.timestamp < 5000 && data.sessionIds.length > 0) {
          console.log(
            "handleCreateSession: Recent session detected, preventing duplicate"
          );
          return;
        }
      } catch (error) {
        console.error("Error checking recent sessions:", error);
      }
    }

    isCreatingSessionRef.current = true;

    try {
      console.log("handleCreateSession: Starting try block");
      // Collapse all existing session cards using refs for current state
      const currentCards = sessionCardsRef.current;
      const currentFinished = finishedCardsRef.current;
      console.log("handleCreateSession: Current cards", currentCards.length);
      setMinimizedCards((prev) => {
        const newSet = new Set(prev);
        currentCards.forEach((card) => {
          if (!currentFinished.has(card.id)) {
            // Only collapse if not finished (finished ones can't be collapsed anyway)
            newSet.add(card.id);
          }
        });
        return newSet;
      });

      // Create session in database
      const startTime = getPeruvianTimeISO();
      console.log("handleCreateSession: startTime", startTime);
      if (!user?.email) {
        console.log("handleCreateSession: No user email");
        alert("Error: No se pudo obtener el email del usuario");
        return;
      }

      // Check if a session was just created (prevent duplicates)
      const recentSessions = currentCards.filter((card) => {
        if (!card.startTime) return false;
        const cardTime = new Date(card.startTime).getTime();
        const now = Date.now();
        // Check if session was created within last 5 seconds
        return Math.abs(now - cardTime) < 5000;
      });

      if (recentSessions.length > 0) {
        console.log(
          "handleCreateSession: Recent session detected, preventing duplicate"
        );
        alert(
          "Una sesión fue creada recientemente. Por favor, espera unos segundos."
        );
        isCreatingSessionRef.current = false;
        return;
      }

      // Calculate cliente number based on existing sessions for this date
      const existingSessionsCount = currentCards.length;
      const clienteNumber = existingSessionsCount + 1;
      const cliente = `Cliente ${clienteNumber}`;
      console.log("handleCreateSession: About to insert session", {
        agencia: agencyCode,
        rol: selectedRole,
        inicio: startTime,
        cliente,
        created_by: user.email,
      });

      // Add a small delay to ensure browser is ready after tab switch
      // If tab was recently visible, test the connection first with a simple query
      const wasRecentlyVisible =
        document.visibilityState === "visible" &&
        Date.now() - lastVisibleRef.current < 10000;

      if (wasRecentlyVisible) {
        // Test connection with a simple query to wake it up
        console.log(
          "handleCreateSession: Testing connection after tab switch..."
        );
        try {
          await Promise.race([
            supabase.from("tdt_sessions").select("id").limit(1),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Connection test timeout")),
                2000
              )
            ),
          ]);
          console.log("handleCreateSession: Connection test successful");
        } catch (error) {
          console.warn(
            "handleCreateSession: Connection test failed, proceeding anyway",
            error
          );
        }
        // Small delay after connection test
        await new Promise((resolve) => setTimeout(resolve, 100));
      } else if (document.visibilityState === "visible") {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Create session with cliente included in the initial insert
      console.log("handleCreateSession: Awaiting database insert...", {
        wasRecentlyVisible,
        timeSinceVisible: Date.now() - lastVisibleRef.current,
      });

      const insertPromise = supabase
        .from("tdt_sessions")
        .insert({
          agencia: agencyCode,
          rol: selectedRole,
          inicio: startTime,
          fin: null,
          cliente: cliente,
          created_by: user.email,
        })
        .select()
        .single();

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Database insert timeout after 10 seconds")),
          10000
        )
      );

      let newSession, sessionError;
      try {
        const result = await Promise.race([insertPromise, timeoutPromise]);
        newSession = result.data;
        sessionError = result.error;
        console.log("handleCreateSession: Database insert completed", {
          newSession,
          sessionError,
        });
      } catch (error) {
        console.error(
          "handleCreateSession: Database insert failed or timed out",
          error
        );
        alert("Error al crear la sesión. Por favor, intenta de nuevo.");
        isCreatingSessionRef.current = false;
        return;
      }

      if (sessionError) {
        console.error("Error creating session:", sessionError);
        alert("Error al crear la sesión");
        isCreatingSessionRef.current = false;
        return;
      }

      // Update the cliente value to use the database ID
      const clienteWithId = `Cliente ${newSession.id}`;
      const updatePromise = supabase
        .from("tdt_sessions")
        .update({ cliente: clienteWithId })
        .eq("id", newSession.id);

      const updateTimeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Database update timeout after 10 seconds")),
          10000
        )
      );

      let updateError;
      try {
        const updateResult = await Promise.race([
          updatePromise,
          updateTimeoutPromise,
        ]);
        updateError = updateResult.error;
        if (updateError) {
          console.warn("Error updating cliente:", updateError);
          // Continue anyway, we'll use the ID-based cliente in local state
        }
      } catch (error) {
        console.warn("Error updating cliente:", error);
        // Continue anyway, we'll use the ID-based cliente in local state
      }

      const newCard: SessionCard = {
        id: `card-${newSession.id}`,
        dbId: newSession.id,
        observations: [],
        startTime: newSession.inicio,
        finishTime: null,
        cliente: clienteWithId,
        created_at: newSession.created_at || new Date().toISOString(),
      };

      // Track recently created session to prevent duplicates on reload
      if (newSession.id) {
        recentlyCreatedSessionsRef.current.add(newSession.id);
        // Remove from tracking after 30 seconds
        setTimeout(() => {
          recentlyCreatedSessionsRef.current.delete(newSession.id);
        }, 30000);
      }

      setSessionCards((prev) => [newCard, ...prev]);

      // Open dialog to create first observation
      setEditingObservation({ cardId: newCard.id, observationId: null });
      setDialogFormData({
        firstDropdown: "",
        secondDropdown: "",
        thirdDropdown: "",
        startTime: startTime, // Set start time when dialog opens
        comentarios: "",
        posicion: "",
        altura: "",
      });
      setIsDialogOpen(true);

      // Scroll to top after a short delay to ensure DOM update
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }, 0);

      // Clear the flag after successful creation
      isCreatingSessionRef.current = false;
    } catch (error) {
      console.error("Error creating session:", error);
      alert("Error al crear la sesión");
      isCreatingSessionRef.current = false;
    }
  }, [agencyCode, selectedRole, user?.email]);

  const handleToggleMinimize = (cardId: string) => {
    // Allow toggling even if card is finished (users can view observations)
    setMinimizedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const handleFinishSession = async (cardId: string) => {
    console.log("handleFinishSession called", cardId);
    // Check if all observations have started using current state
    const card = sessionCards.find((c) => c.id === cardId);
    console.log("handleFinishSession: Found card", {
      card,
      cardId,
      sessionCardsLength: sessionCards.length,
    });
    if (!card || !card.dbId) {
      console.log("handleFinishSession: Card not found or no dbId", {
        card,
        cardId,
      });
      return;
    }

    if (!canFinishCard(cardId)) {
      console.log("handleFinishSession: Cannot finish card", cardId);
      return; // Don't finish if not all observations have started
    }

    try {
      console.log("handleFinishSession: Starting try block");
      const finishTimestamp = getPeruvianTimeISO();
      console.log("handleFinishSession: finishTimestamp", finishTimestamp);

      // Add a small delay to ensure browser is ready after tab switch
      // If tab was recently visible, test the connection first with a simple query
      const wasRecentlyVisible =
        document.visibilityState === "visible" &&
        Date.now() - lastVisibleRef.current < 10000;

      if (wasRecentlyVisible) {
        // Test connection with a simple query to wake it up
        console.log(
          "handleFinishSession: Testing connection after tab switch..."
        );
        try {
          await Promise.race([
            supabase.from("tdt_sessions").select("id").limit(1),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Connection test timeout")),
                2000
              )
            ),
          ]);
          console.log("handleFinishSession: Connection test successful");
        } catch (error) {
          console.warn(
            "handleFinishSession: Connection test failed, proceeding anyway",
            error
          );
        }
        // Small delay after connection test
        await new Promise((resolve) => setTimeout(resolve, 100));
      } else if (document.visibilityState === "visible") {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Update session in database
      console.log("handleFinishSession: About to update session in database", {
        dbId: card.dbId,
        fin: finishTimestamp,
        wasRecentlyVisible,
        timeSinceVisible: Date.now() - lastVisibleRef.current,
      });
      console.log("handleFinishSession: Awaiting database update...");

      // Add timeout to detect hanging requests
      const updatePromise = supabase
        .from("tdt_sessions")
        .update({ fin: finishTimestamp })
        .eq("id", card.dbId);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Database update timeout after 10 seconds")),
          10000
        )
      );

      let sessionError;
      try {
        const result = await Promise.race([updatePromise, timeoutPromise]);
        sessionError = result.error;
        console.log("handleFinishSession: Database update completed", {
          sessionError,
        });
      } catch (error) {
        console.error(
          "handleFinishSession: Database update failed or timed out",
          error
        );
        alert("Error al finalizar la sesión. Por favor, intenta de nuevo.");
        return;
      }

      if (sessionError) {
        console.error("Error finishing session:", sessionError);
        alert("Error al finalizar la sesión");
        return;
      }

      // Update all unfinished observations in database
      const unfinishedObservations = card.observations.filter(
        (obs) => !obs.isFinished
      );
      if (unfinishedObservations.length > 0) {
        const observationIds = unfinishedObservations
          .map((obs) => obs.dbId)
          .filter((id): id is number => id !== null);

        if (observationIds.length > 0) {
          const { error: observationsError } = await supabase
            .from("tdt_observations")
            .update({ fin: finishTimestamp })
            .in("id", observationIds);

          if (observationsError) {
            console.error("Error finishing observations:", observationsError);
          }
        }
      }

      // Update local state using functional updates
      setSessionCards((prevCards) =>
        prevCards.map((c) =>
          c.id === cardId
            ? {
                ...c,
                finishTime: finishTimestamp,
                observations: c.observations.map((obs) =>
                  obs.isFinished
                    ? obs
                    : {
                        ...obs,
                        isFinished: true,
                        endTime: obs.endTime || finishTimestamp,
                      }
                ),
              }
            : c
        )
      );

      setFinishedCards((prev) => new Set(prev).add(cardId));
      setMinimizedCards((prev) => new Set(prev).add(cardId));
    } catch (error) {
      console.error("Error finishing session:", error);
      alert("Error al finalizar la sesión");
    }
  };

  const handleAddObservation = (cardId: string) => {
    // Check if the previous observation has started
    if (!canAddObservation(cardId)) {
      return; // Don't add if previous observation hasn't started
    }

    // Open dialog to create new observation
    setEditingObservation({ cardId, observationId: null });
    setDialogFormData({
      firstDropdown: "",
      secondDropdown: "",
      thirdDropdown: "",
      startTime: getPeruvianTimeISO(), // Set start time when dialog opens
      comentarios: "",
      posicion: "",
      altura: "",
    });
    setIsDialogOpen(true);
  };

  const handleEditObservation = (cardId: string, observationId: string) => {
    const card = sessionCards.find((c) => c.id === cardId);
    const observation = card?.observations.find(
      (obs) => obs.id === observationId
    );

    if (observation) {
      setEditingObservation({ cardId, observationId });
      setDialogFormData({
        firstDropdown: observation.firstDropdown,
        secondDropdown: observation.secondDropdown,
        thirdDropdown: observation.thirdDropdown,
        startTime: observation.startTime, // Keep existing start time when editing
        comentarios: observation.comentarios || "",
        posicion: observation.posicion || "",
        altura: observation.altura || "",
      });
      setIsDialogOpen(true);
    }
  };

  const handleSaveObservation = async () => {
    console.log("handleSaveObservation called", editingObservation);

    // Prevent duplicate saves
    if (isSavingObservationRef.current) {
      console.log(
        "handleSaveObservation: Already saving an observation, ignoring duplicate call"
      );
      return;
    }

    console.log(
      "handleSaveObservation: sessionCards length",
      sessionCards.length
    );
    console.log("handleSaveObservation: dialogFormData", dialogFormData);
    if (!editingObservation) {
      console.log("handleSaveObservation: No editingObservation");
      return;
    }

    const { cardId, observationId } = editingObservation;

    isSavingObservationRef.current = true;
    console.log("handleSaveObservation: Looking for card", cardId);
    const card = sessionCards.find((c) => c.id === cardId);
    console.log("handleSaveObservation: Found card", card);
    if (!card || !card.dbId) {
      console.log("handleSaveObservation: Card not found or no dbId", {
        card,
        cardId,
        allCardIds: sessionCards.map((c) => c.id),
      });
      return;
    }

    try {
      // If tab was recently visible, test the connection first with a simple query
      const wasRecentlyVisible =
        document.visibilityState === "visible" &&
        Date.now() - lastVisibleRef.current < 10000;

      if (wasRecentlyVisible) {
        // Test connection with a simple query to wake it up
        console.log(
          "handleSaveObservation: Testing connection after tab switch..."
        );
        try {
          await Promise.race([
            supabase.from("tdt_observations").select("id").limit(1),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Connection test timeout")),
                2000
              )
            ),
          ]);
          console.log("handleSaveObservation: Connection test successful");
        } catch (error) {
          console.warn(
            "handleSaveObservation: Connection test failed, proceeding anyway",
            error
          );
        }
        // Small delay after connection test
        await new Promise((resolve) => setTimeout(resolve, 100));
      } else if (document.visibilityState === "visible") {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      console.log("handleSaveObservation: Starting try block", {
        observationId,
        card,
        wasRecentlyVisible,
        timeSinceVisible: Date.now() - lastVisibleRef.current,
      });
      if (observationId) {
        // Editing existing observation
        console.log("handleSaveObservation: Editing existing observation");
        const observation = card.observations.find(
          (obs) => obs.id === observationId
        );
        console.log("handleSaveObservation: Found observation", observation);
        if (!observation || !observation.dbId) {
          console.log(
            "handleSaveObservation: Observation not found or no dbId"
          );
          isSavingObservationRef.current = false;
          return;
        }

        // Update observation in database
        console.log(
          "handleSaveObservation: About to update observation in database",
          {
            dbId: observation.dbId,
            updateData: {
              lugar: dialogFormData.firstDropdown || null,
              canal: dialogFormData.secondDropdown || null,
              descripcion: dialogFormData.thirdDropdown || null,
              inicio: dialogFormData.startTime || observation.startTime,
              comentarios: dialogFormData.comentarios || null,
              posicion: dialogFormData.posicion || null,
              altura: dialogFormData.altura || null,
            },
          }
        );

        const updatePromise = supabase
          .from("tdt_observations")
          .update({
            lugar: dialogFormData.firstDropdown || null,
            canal: dialogFormData.secondDropdown || null,
            descripcion: dialogFormData.thirdDropdown || null,
            inicio: dialogFormData.startTime || observation.startTime,
            comentarios: dialogFormData.comentarios || null,
            posicion: dialogFormData.posicion || null,
            altura: dialogFormData.altura || null,
          })
          .eq("id", observation.dbId);

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Database update timeout after 10 seconds")),
            10000
          )
        );

        console.log("handleSaveObservation: Awaiting database update...");
        let updateError;
        try {
          const result = await Promise.race([updatePromise, timeoutPromise]);
          updateError = result.error;
          console.log("handleSaveObservation: Database update completed", {
            updateError,
          });
        } catch (error) {
          console.error(
            "handleSaveObservation: Database update failed or timed out",
            error
          );
          alert(
            "Error al actualizar la observación. Por favor, intenta de nuevo."
          );
          isSavingObservationRef.current = false;
          return;
        }

        if (updateError) {
          console.error("Error updating observation:", updateError);
          alert("Error al actualizar la observación");
          isSavingObservationRef.current = false;
          return;
        }

        // Update local state using functional updates
        console.log("handleSaveObservation: About to update local state");
        setSessionCards((prevCards) =>
          prevCards.map((c) =>
            c.id === cardId
              ? {
                  ...c,
                  observations: c.observations.map((obs) =>
                    obs.id === observationId
                      ? {
                          ...obs,
                          firstDropdown: dialogFormData.firstDropdown,
                          secondDropdown: dialogFormData.secondDropdown,
                          thirdDropdown: dialogFormData.thirdDropdown,
                          startTime: dialogFormData.startTime || obs.startTime,
                          comentarios: dialogFormData.comentarios || null,
                          posicion: dialogFormData.posicion || null,
                          altura: dialogFormData.altura || null,
                        }
                      : obs
                  ),
                }
              : c
          )
        );
        console.log(
          "handleSaveObservation: Local state updated, closing dialog"
        );
        setIsDialogOpen(false);
        setEditingObservation(null);
      } else {
        // Creating new observation
        console.log("handleSaveObservation: Creating new observation");

        // Check if a similar observation was just created for this card (prevent duplicates)
        const recentObservations = card.observations.filter((obs) => {
          if (!obs.startTime) return false;
          const obsTime = new Date(obs.startTime).getTime();
          const now = Date.now();
          // Check if observation was created within last 5 seconds
          return Math.abs(now - obsTime) < 5000;
        });

        if (recentObservations.length > 0) {
          // Check if any recent observation has the same data
          const hasDuplicate = recentObservations.some(
            (obs) =>
              obs.firstDropdown === dialogFormData.firstDropdown &&
              obs.secondDropdown === dialogFormData.secondDropdown &&
              obs.thirdDropdown === dialogFormData.thirdDropdown
          );

          if (hasDuplicate) {
            console.log(
              "handleSaveObservation: Duplicate observation detected, preventing creation"
            );
            alert("Esta observación ya fue creada recientemente.");
            isSavingObservationRef.current = false;
            return;
          }
        }

        const startTime = dialogFormData.startTime || getPeruvianTimeISO();
        console.log("handleSaveObservation: startTime", startTime);
        console.log("handleSaveObservation: dialogFormData values", {
          firstDropdown: dialogFormData.firstDropdown,
          secondDropdown: dialogFormData.secondDropdown,
          thirdDropdown: dialogFormData.thirdDropdown,
        });

        // Create observation in database
        console.log("handleSaveObservation: About to insert observation", {
          tdt_session: card.dbId,
          lugar: dialogFormData.firstDropdown,
          canal: dialogFormData.secondDropdown,
          descripcion: dialogFormData.thirdDropdown,
        });

        const insertPromise = supabase
          .from("tdt_observations")
          .insert({
            tdt_session: card.dbId,
            lugar: dialogFormData.firstDropdown || null,
            canal: dialogFormData.secondDropdown || null,
            descripcion: dialogFormData.thirdDropdown || null,
            inicio: startTime,
            fin: null,
            comentarios: dialogFormData.comentarios || null,
            posicion: dialogFormData.posicion || null,
            altura: dialogFormData.altura || null,
          })
          .select()
          .single();

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Database insert timeout after 10 seconds")),
            10000
          )
        );

        console.log("handleSaveObservation: Awaiting database insert...");
        let newObservation, insertError;
        try {
          const result = await Promise.race([insertPromise, timeoutPromise]);
          newObservation = result.data;
          insertError = result.error;
          console.log("handleSaveObservation: Database insert completed", {
            newObservation,
            insertError,
          });
        } catch (error) {
          console.error(
            "handleSaveObservation: Database insert failed or timed out",
            error
          );
          alert("Error al crear la observación. Por favor, intenta de nuevo.");
          isSavingObservationRef.current = false;
          return;
        }

        if (insertError) {
          console.error("Error creating observation:", insertError);
          alert("Error al crear la observación");
          isSavingObservationRef.current = false;
          return;
        }
        console.log(
          "handleSaveObservation: Observation created successfully",
          newObservation
        );

        const newObs: Observation = {
          id: `obs-${newObservation.id}`,
          dbId: newObservation.id,
          firstDropdown: dialogFormData.firstDropdown,
          secondDropdown: dialogFormData.secondDropdown,
          thirdDropdown: dialogFormData.thirdDropdown,
          startTime: newObservation.inicio,
          endTime: null,
          isFinished: false,
          comentarios: dialogFormData.comentarios || null,
          posicion: dialogFormData.posicion || null,
          altura: dialogFormData.altura || null,
        };

        // Update local state using functional updates
        setSessionCards((prevCards) =>
          prevCards.map((c) =>
            c.id === cardId
              ? { ...c, observations: [...c.observations, newObs] }
              : c
          )
        );
      }

      // Close dialog and reset
      console.log("handleSaveObservation: Closing dialog and resetting");
      setIsDialogOpen(false);
      setEditingObservation(null);
      setDialogFormData({
        firstDropdown: "",
        secondDropdown: "",
        thirdDropdown: "",
        startTime: null,
        comentarios: "",
        posicion: "",
        altura: "",
      });
      console.log("handleSaveObservation: Completed successfully");
      isSavingObservationRef.current = false;
    } catch (error) {
      console.error("Error saving observation:", error);
      alert("Error al guardar la observación");
      isSavingObservationRef.current = false;
    }
  };

  const handleCancelDialog = () => {
    setIsDialogOpen(false);
    setEditingObservation(null);
    setDialogFormData({
      firstDropdown: "",
      secondDropdown: "",
      thirdDropdown: "",
      startTime: null,
      comentarios: "",
      posicion: "",
      altura: "",
    });
  };

  const handleDeleteObservation = async () => {
    if (!editingObservation || !editingObservation.observationId) return;

    const { cardId, observationId } = editingObservation;
    const card = sessionCards.find((c) => c.id === cardId);
    const observation = card?.observations.find(
      (obs) => obs.id === observationId
    );

    if (!observation || !observation.dbId) return;

    try {
      // Delete observation from database
      const { error: deleteError } = await supabase
        .from("tdt_observations")
        .delete()
        .eq("id", observation.dbId);

      if (deleteError) {
        console.error("Error deleting observation:", deleteError);
        alert("Error al eliminar la observación");
        return;
      }

      // Remove the observation from the card
      setSessionCards(
        sessionCards.map((c) =>
          c.id === cardId
            ? {
                ...c,
                observations: c.observations.filter(
                  (obs) => obs.id !== observationId
                ),
              }
            : c
        )
      );

      // Close dialog and reset
      setIsDialogOpen(false);
      setEditingObservation(null);
      setDialogFormData({
        firstDropdown: "",
        secondDropdown: "",
        thirdDropdown: "",
        startTime: null,
        comentarios: "",
        posicion: "",
        altura: "",
      });
    } catch (error) {
      console.error("Error deleting observation:", error);
      alert("Error al eliminar la observación");
    }
  };

  const handleRemoveObservation = async (
    cardId: string,
    observationId: string
  ) => {
    const card = sessionCards.find((c) => c.id === cardId);
    const observation = card?.observations.find(
      (obs) => obs.id === observationId
    );

    if (!observation || !observation.dbId) return;

    try {
      // Delete observation from database
      const { error: deleteError } = await supabase
        .from("tdt_observations")
        .delete()
        .eq("id", observation.dbId);

      if (deleteError) {
        console.error("Error deleting observation:", deleteError);
        alert("Error al eliminar la observación");
        return;
      }

      // Remove the observation from the card
      setSessionCards(
        sessionCards.map((c) =>
          c.id === cardId
            ? {
                ...c,
                observations: c.observations.filter(
                  (obs) => obs.id !== observationId
                ),
              }
            : c
        )
      );
    } catch (error) {
      console.error("Error deleting observation:", error);
      alert("Error al eliminar la observación");
    }
  };

  const handleRemoveCard = async (cardId: string) => {
    const card = sessionCards.find((c) => c.id === cardId);
    if (!card || !card.dbId) return;

    try {
      // Delete session from database (cascade will delete observations)
      const { error: deleteError } = await supabase
        .from("tdt_sessions")
        .delete()
        .eq("id", card.dbId);

      if (deleteError) {
        console.error("Error deleting session:", deleteError);
        alert("Error al eliminar la sesión");
        return;
      }

      // Remove from local state
      setSessionCards(sessionCards.filter((c) => c.id !== cardId));
      // Also remove from minimized and finished sets
      setMinimizedCards((prev) => {
        const newSet = new Set(prev);
        newSet.delete(cardId);
        return newSet;
      });
      setFinishedCards((prev) => {
        const newSet = new Set(prev);
        newSet.delete(cardId);
        return newSet;
      });
    } catch (error) {
      console.error("Error deleting session:", error);
      alert("Error al eliminar la sesión");
    }
  };

  const handleDialogFirstDropdownChange = (value: string) => {
    setDialogFormData({
      ...dialogFormData,
      firstDropdown: value,
      // Clear dependent dropdowns when lugar changes
      secondDropdown: "",
      thirdDropdown: "",
      // Clear posicion and altura when lugar changes
      posicion: "",
      altura: "",
    });
  };

  const handleDialogSecondDropdownChange = (value: string) => {
    setDialogFormData({
      ...dialogFormData,
      secondDropdown: value,
      thirdDropdown: "", // Reset dependent dropdown
    });
  };

  const handleDialogThirdDropdownChange = (value: string) => {
    setDialogFormData({
      ...dialogFormData,
      thirdDropdown: value,
    });
  };

  const handleDialogPosicionChange = (value: string) => {
    setDialogFormData({
      ...dialogFormData,
      posicion: value,
      // Clear altura when posicion changes (unless it's "Sentado")
      altura: value === "Sentado" ? dialogFormData.altura : "",
    });
  };

  const handleDialogAlturaChange = (value: string) => {
    setDialogFormData({
      ...dialogFormData,
      altura: value,
    });
  };

  const handleFinishObservation = async (
    cardId: string,
    observationId: string
  ) => {
    const card = sessionCards.find((c) => c.id === cardId);
    const observation = card?.observations.find(
      (obs) => obs.id === observationId
    );

    if (!observation || !observation.dbId) return;

    try {
      const endTime = getPeruvianTimeISO();

      // Update observation in database
      const { error: updateError } = await supabase
        .from("tdt_observations")
        .update({ fin: endTime })
        .eq("id", observation.dbId);

      if (updateError) {
        console.error("Error finishing observation:", updateError);
        alert("Error al finalizar la observación");
        return;
      }

      // Update local state
      setSessionCards(
        sessionCards.map((c) =>
          c.id === cardId
            ? {
                ...c,
                observations: c.observations.map((obs) =>
                  obs.id === observationId
                    ? {
                        ...obs,
                        isFinished: true,
                        endTime: endTime,
                      }
                    : obs
                ),
              }
            : c
        )
      );
    } catch (error) {
      console.error("Error finishing observation:", error);
      alert("Error al finalizar la observación");
    }
  };

  // Helper function to get current time in Peruvian timezone as ISO string with timezone
  // Returns format: "YYYY-MM-DDTHH:mm:ss.sss-05:00" for timestamptz
  const getPeruvianTimeISO = (): string => {
    const now = new Date();

    // Get the current time components in Peruvian timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const year = parts.find((p) => p.type === "year")?.value || "0";
    const month = parts.find((p) => p.type === "month")?.value || "0";
    const day = parts.find((p) => p.type === "day")?.value || "0";
    const hour = parts.find((p) => p.type === "hour")?.value || "0";
    const minute = parts.find((p) => p.type === "minute")?.value || "0";
    const second = parts.find((p) => p.type === "second")?.value || "0";

    // Get milliseconds
    const ms = now.getMilliseconds().toString().padStart(3, "0");

    // Format as ISO string with Peruvian timezone offset (-05:00)
    // Format: YYYY-MM-DDTHH:mm:ss.sss-05:00
    return `${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}-05:00`;
  };

  const formatTime = (isoString: string | null): string => {
    if (!isoString) return "";
    // Parse the timestamp - it may be in UTC or with timezone
    const date = new Date(isoString);
    // Format in Peruvian timezone
    return date.toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "America/Lima",
    });
  };

  // Get second level options (canal) - filtered by lugar selection
  const getSecondLevelOptions = (lugarValue: string): string[] => {
    if (!lugarValue || !cascadingOptions[lugarValue]) {
      return [];
    }
    // Get canales for the selected lugar, sorted alphabetically
    const options = Object.keys(cascadingOptions[lugarValue]).sort();
    return options;
  };

  // Get third level options (descripcion) based on lugar and canal selection
  const getThirdLevelOptions = (
    lugarValue: string,
    canalValue: string
  ): string[] => {
    if (
      !lugarValue ||
      !canalValue ||
      !cascadingOptions[lugarValue] ||
      !cascadingOptions[lugarValue][canalValue]
    ) {
      return [];
    }
    // Get descripciones for the selected lugar and canal, sorted alphabetically
    const options = cascadingOptions[lugarValue][canalValue] || [];
    return [...options].sort();
  };

  // Get dialog second level options (canal) - filtered by selected lugar
  const dialogSecondLevelOptions = useMemo(() => {
    return getSecondLevelOptions(dialogFormData.firstDropdown);
  }, [dialogFormData.firstDropdown, cascadingOptions]);

  // Get dialog third level options (descripcion) - filtered by selected lugar and canal
  const dialogThirdLevelOptions = useMemo(() => {
    return getThirdLevelOptions(
      dialogFormData.firstDropdown,
      dialogFormData.secondDropdown
    );
  }, [
    dialogFormData.firstDropdown,
    dialogFormData.secondDropdown,
    cascadingOptions,
  ]);

  // Convert arrays to ComboboxOption format
  const lugarOptions: ComboboxOption[] = useMemo(() => {
    return [...lugares].sort().map((lugar) => ({
      value: lugar,
      label: lugar,
    }));
  }, [lugares]);

  const canalOptions: ComboboxOption[] = useMemo(() => {
    return [...dialogSecondLevelOptions].sort().map((canal) => ({
      value: canal,
      label: canal,
    }));
  }, [dialogSecondLevelOptions]);

  const descripcionOptions: ComboboxOption[] = useMemo(() => {
    return [...dialogThirdLevelOptions].sort().map((descripcion) => ({
      value: descripcion,
      label: descripcion,
    }));
  }, [dialogThirdLevelOptions]);

  if (authLoading || isLoadingSessions) {
    return <FullPageLoading text="Cargando..." />;
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="h-[calc(100%-64px)] bg-white flex flex-col overflow-hidden">
      {/* Fixed Header */}
      <div className="bg-white border-b border-gray-200 z-10">
        <div className="flex justify-between items-center max-w-4xl mx-auto px-4 py-4">
          <Button
            onClick={handleBack}
            variant="ghost"
            size="sm"
            className=" p-0 h-auto text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={16} className="mr-2" />
            Volver
          </Button>
          {selectedAgency && selectedRole && (
            <p className="text-gray-500 text-sm">
              Agencia: {selectedAgency} | Rol: {selectedRole}
            </p>
          )}
        </div>
      </div>

      {/* Scrollable Cards Container */}
      <div
        ref={scrollContainerRef}
        className="flex justify-center h-full overflow-y-auto min-h-0"
      >
        <div className="w-full max-w-4xl px-6 py-6">
          {/* Session Cards */}
          <div className="w-full space-y-4 pb-40">
            {sessionCards.map((card, index) => {
              const isMinimized = minimizedCards.has(card.id);
              const isFinished = finishedCards.has(card.id);
              return (
                <Card key={card.id} className="relative">
                  <CardHeader
                    className={`pb-0 sm:pb-0 ${
                      isMinimized ? "gap-0 sm:gap-0" : ""
                    }`}
                    style={{ paddingBottom: 0 }}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="flex sm:items-center sm:gap-8 flex-col sm:flex-row gap-2 cursor-pointer"
                        onClick={(e) => {
                          // Only collapse if clicking on the title area, not on buttons
                          if (
                            (e.target as HTMLElement).tagName !== "BUTTON" &&
                            !(e.target as HTMLElement).closest("button") &&
                            !(e.target as HTMLElement).closest(
                              '[data-slot="badge"]'
                            )
                          ) {
                            handleToggleMinimize(card.id);
                          }
                        }}
                      >
                        <CardTitle className="text-lg">
                          {card.dbId
                            ? `Cliente ${card.dbId}`
                            : `Cliente ${sessionCards.length - index}`}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        {isMinimized && !isFinished && (
                          <Button
                            type="button"
                            onClick={(e) => {
                              console.log("Finalizar clicked", card.id, e);
                              e.stopPropagation();
                              e.preventDefault();
                              handleFinishSession(card.id);
                            }}
                            onMouseUp={(e) => {
                              console.log("Finalizar mouseUp", card.id, e);
                              e.stopPropagation();
                              e.preventDefault();
                              handleFinishSession(card.id);
                            }}
                            variant="default"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={!canFinishCard(card.id)}
                            style={{ pointerEvents: "auto" }}
                          >
                            Finalizar
                          </Button>
                        )}
                        {isFinished && (
                          <div className="h-2 w-2 rounded-full bg-green-600"></div>
                        )}
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleMinimize(card.id);
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                        >
                          {isMinimized ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronUp size={16} />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {!isMinimized && (
                    <CardContent>
                      <div className="space-y-4">
                        {/* Card timestamps */}
                        <div className="flex sm:items-center sm:gap-8 flex-col sm:flex-row gap-2 pb-2 border-b">
                          {getCardStartTime(card.id) && (
                            <span className="text-xs text-gray-500">
                              Inicio: {formatTime(getCardStartTime(card.id))}
                            </span>
                          )}
                          {isFinished && getCardFinishTime(card.id) && (
                            <span className="text-xs text-gray-500">
                              Fin: {formatTime(getCardFinishTime(card.id))}
                            </span>
                          )}
                        </div>
                        {card.observations.map((observation, obsIndex) => {
                          return (
                            <div
                              key={observation.id}
                              className="border rounded-lg p-4 space-y-4"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="flex sm:items-center sm:gap-8 flex-col sm:flex-row gap-2">
                                  <span className="text-sm font-medium text-gray-700">
                                    {observation.thirdDropdown ||
                                      `Observación ${obsIndex + 1}`}
                                  </span>
                                  {observation.startTime && (
                                    <span className="text-xs text-gray-500">
                                      Inicio:{" "}
                                      {formatTime(observation.startTime)}
                                    </span>
                                  )}
                                  {observation.endTime && (
                                    <span className="text-xs text-gray-500">
                                      Fin: {formatTime(observation.endTime)}
                                    </span>
                                  )}
                                  {observation.posicion && (
                                    <span className="text-xs text-gray-500">
                                      Posición: {observation.posicion}
                                    </span>
                                  )}
                                  {observation.altura && (
                                    <span className="text-xs text-gray-500">
                                      Altura: {observation.altura}
                                    </span>
                                  )}
                                </div>
                                {observation.comentarios && (
                                  <div className="text-xs text-gray-600 mt-1 italic">
                                    {observation.comentarios}
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditObservation(
                                        card.id,
                                        observation.id
                                      );
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                  >
                                    <Edit size={14} className="mr-1" />
                                    Editar
                                  </Button>
                                  {!observation.isFinished &&
                                    observation.startTime && (
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleFinishObservation(
                                            card.id,
                                            observation.id
                                          );
                                        }}
                                        variant="default"
                                        size="sm"
                                        className="h-7 text-xs"
                                      >
                                        Finalizar
                                      </Button>
                                    )}
                                  {observation.isFinished && (
                                    <Badge
                                      variant="default"
                                      className="bg-green-600 hover:bg-green-700 text-xs"
                                    >
                                      Finalizada
                                    </Badge>
                                  )}
                                  {card.observations.length > 1 &&
                                    !observation.isFinished && (
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveObservation(
                                            card.id,
                                            observation.id
                                          );
                                        }}
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                                      >
                                        <X size={14} />
                                      </Button>
                                    )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => handleAddObservation(card.id)}
                            variant="outline"
                            className="w-full border-dashed"
                            disabled={!canAddObservation(card.id)}
                          >
                            <Plus size={16} className="mr-2" />
                            Agregar Observación
                          </Button>
                          {card.observations.length === 0 && !isFinished && (
                            <Button
                              onClick={() => handleRemoveCard(card.id)}
                              variant="outline"
                              className="w-full border-dashed text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Eliminar Sesión
                            </Button>
                          )}
                          {card.observations.length > 0 && !isFinished && (
                            <Button
                              type="button"
                              onClick={(e) => {
                                console.log(
                                  "Finalizar Sesión clicked",
                                  card.id,
                                  e
                                );
                                e.stopPropagation();
                                e.preventDefault();
                                handleFinishSession(card.id);
                              }}
                              onMouseUp={(e) => {
                                console.log(
                                  "Finalizar Sesión mouseUp",
                                  card.id,
                                  e
                                );
                                e.stopPropagation();
                                e.preventDefault();
                                handleFinishSession(card.id);
                              }}
                              className="w-full"
                              disabled={!canFinishCard(card.id)}
                              style={{ pointerEvents: "auto" }}
                            >
                              Finalizar Sesión
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}

            {sessionCards.length === 0 && (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-gray-500">
                  Haz clic en "Crear Sesión" para agregar una nueva sesión con
                  opciones en cascada.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed bottom buttons */}
      <div
        className="bg-white border-t border-gray-200 shadow-lg z-50 fixed bottom-0 left-0 right-0"
        style={{ zIndex: 50 }}
      >
        <div className="max-w-4xl mx-auto px-2 sm:px-6 py-4">
          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={(e) => {
                console.log("Crear Sesión clicked (native)", e);
                e.stopPropagation();
                e.preventDefault();
                handleCreateSession();
              }}
              onMouseUp={(e) => {
                console.log("Crear Sesión mouseUp (native)", e);
                e.stopPropagation();
                e.preventDefault();
                handleCreateSession();
              }}
              className="flex-1 bg-gray-900 hover:bg-gray-800 text-white inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors h-10 rounded-md px-8"
              style={{
                pointerEvents: "auto",
                position: "relative",
                zIndex: 51,
              }}
            >
              <Plus size={14} className="sm:size-4 mr-1 sm:mr-2 shrink-0" />
              <span className="text-xs sm:text-base">Crear Sesión</span>
            </button>
            <Button
              onClick={() => setIsAgencyObservationDialogOpen(true)}
              variant="outline"
              size="lg"
              className="flex-1 text-gray-700 hover:text-gray-900"
            >
              <Edit size={14} className="sm:size-4 mr-1 sm:mr-2 shrink-0" />
              <span className="text-xs sm:text-base">Observaciones</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Observation Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            handleCancelDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingObservation?.observationId
                ? "Editar Observación"
                : "Crear Observación"}
            </DialogTitle>
            <DialogDescription>
              Selecciona las opciones en cascada para la observación
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* First Dropdown - Lugar */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Lugar *
              </label>
              <Combobox
                options={lugarOptions}
                value={dialogFormData.firstDropdown}
                onValueChange={handleDialogFirstDropdownChange}
                placeholder="Seleccionar lugar..."
                searchPlaceholder="Buscar lugar..."
                emptyText="No se encontraron lugares"
                className="w-full"
              />
            </div>

            {/* Posicion Radio Group - Only show when Lugar is "Mesa de Servicio" */}
            {dialogFormData.firstDropdown === "Mesa de Servicio" && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Posición
                </label>
                <RadioGroup
                  value={dialogFormData.posicion}
                  onValueChange={handleDialogPosicionChange}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Parado" id="posicion-parado" />
                    <Label
                      htmlFor="posicion-parado"
                      className="font-normal cursor-pointer"
                    >
                      Parado
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Sentado" id="posicion-sentado" />
                    <Label
                      htmlFor="posicion-sentado"
                      className="font-normal cursor-pointer"
                    >
                      Sentado
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Altura Radio Group - Only show when Posicion is "Sentado" */}
            {dialogFormData.posicion === "Sentado" && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Altura
                </label>
                <RadioGroup
                  value={dialogFormData.altura}
                  onValueChange={handleDialogAlturaChange}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Mesa Alta" id="altura-alta" />
                    <Label
                      htmlFor="altura-alta"
                      className="font-normal cursor-pointer"
                    >
                      Mesa Alta
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Mesa Baja" id="altura-baja" />
                    <Label
                      htmlFor="altura-baja"
                      className="font-normal cursor-pointer"
                    >
                      Mesa Baja
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Second Dropdown - Canal (Filtered by Lugar) */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Canal *
              </label>
              <Combobox
                options={canalOptions}
                value={dialogFormData.secondDropdown}
                onValueChange={handleDialogSecondDropdownChange}
                placeholder={
                  !dialogFormData.firstDropdown
                    ? "Selecciona un lugar primero"
                    : canalOptions.length > 0
                    ? "Seleccionar canal..."
                    : "No hay canales disponibles"
                }
                searchPlaceholder="Buscar canal..."
                emptyText={
                  !dialogFormData.firstDropdown
                    ? "Selecciona un lugar primero"
                    : canalOptions.length === 0
                    ? "No se encontraron canales"
                    : "No se encontraron canales"
                }
                disabled={!dialogFormData.firstDropdown || !selectedRole}
                className="w-full"
              />
            </div>

            {/* Third Dropdown - Descripción */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Descripción *
              </label>
              <Combobox
                options={descripcionOptions}
                value={dialogFormData.thirdDropdown}
                onValueChange={handleDialogThirdDropdownChange}
                placeholder="Seleccionar descripción..."
                searchPlaceholder="Buscar descripción..."
                emptyText={
                  dialogFormData.secondDropdown
                    ? "No se encontraron descripciones"
                    : "Selecciona un canal primero"
                }
                disabled={!dialogFormData.secondDropdown}
                className="w-full"
              />
            </div>

            {/* Comentarios */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Comentarios
              </label>
              <Textarea
                value={dialogFormData.comentarios}
                onChange={(e) =>
                  setDialogFormData({
                    ...dialogFormData,
                    comentarios: e.target.value,
                  })
                }
                placeholder="Agregar comentarios sobre esta observación..."
                className="w-full min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            {editingObservation?.observationId ? (
              <Button
                onClick={handleDeleteObservation}
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 w-full sm:w-auto"
              >
                Eliminar
              </Button>
            ) : (
              <div className="w-full sm:w-auto" />
            )}
            <button
              type="button"
              onClick={(e) => {
                console.log("Guardar clicked (native)", e);
                e.stopPropagation();
                e.preventDefault();
                handleSaveObservation();
              }}
              onMouseUp={(e) => {
                console.log("Guardar mouseUp (native)", e);
                e.stopPropagation();
                e.preventDefault();
                handleSaveObservation();
              }}
              className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 px-4 py-2"
              style={{
                pointerEvents: "auto",
                position: "relative",
                zIndex: 51,
              }}
            >
              Guardar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agency Observation Dialog */}
      <Dialog
        open={isAgencyObservationDialogOpen}
        onOpenChange={setIsAgencyObservationDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Observaciones</DialogTitle>
            <DialogDescription>
              Agrega observaciones sobre esta agencia para la fecha y rol
              seleccionados
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              value={agencyObservation}
              onChange={(e) => setAgencyObservation(e.target.value)}
              placeholder="Agregar observaciones sobre esta agencia y fecha..."
              className="w-full min-h-[200px]"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsAgencyObservationDialogOpen(false)}
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                await saveAgencyObservation();
                setIsAgencyObservationDialogOpen(false);
              }}
              disabled={isSavingAgencyObservation}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              {isSavingAgencyObservation ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Guardar Observaciones
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CreateSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
      }
    >
      <CreateSessionPageContent />
    </Suspense>
  );
}
