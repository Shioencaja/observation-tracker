"use client";

import { useState, useEffect, Suspense, useMemo, useRef } from "react";
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
}

// Type for a session card with multiple observations
interface SessionCard {
  id: string;
  dbId: number | null; // Database ID for tdt_sessions
  observations: Observation[];
  startTime: string | null; // Maps to inicio
  finishTime: string | null; // Maps to fin
  cliente: string | null; // Maps to cliente from tdt_sessions
}

// Cascading options structure from tdt_options
// Structure: canal -> descripcion
// Note: lugar comes from tdt_lugar table and is completely independent
interface CascadingOptions {
  [canal: string]: string[]; // Array of descripciones directly
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
  const [cascadingOptions, setCascadingOptions] = useState<CascadingOptions>({});
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
  }>({
    firstDropdown: "",
    secondDropdown: "",
    thirdDropdown: "",
    startTime: null,
    comentarios: "",
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
    if (!card || card.observations.length === 0) return true; // Can add first observation
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

  useEffect(() => {
    if (agency && role) {
      // Convert slug back to readable format (e.g., "santo-domingo" -> "Santo Domingo")
      const formattedAgency = agency
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      setSelectedAgency(formattedAgency);
      // Convert role slug back to database format (e.g., "guia" -> "Guía", "gerente" -> "Gerente")
      const roleMap: { [key: string]: string } = {
        guia: "Guía",
        gerente: "Gerente",
      };
      const formattedRole = roleMap[role.toLowerCase()] || role.charAt(0).toUpperCase() + role.slice(1);
      console.log("Role mapping:", { urlRole: role, formattedRole });
      setSelectedRole(formattedRole);
      loadAgencyCode(agency, formattedAgency);
    } else {
      // If no agency or role is provided, redirect back to selection
      router.push("/toma-de-tiempos");
    }
  }, [agency, role, router]);

  useEffect(() => {
    if (user) {
      loadLugares();
    }
  }, [user]);

  useEffect(() => {
    if (user && selectedRole) {
      loadOptions();
    }
  }, [user, selectedRole]);

  useEffect(() => {
    if (agencyCode && date && user && selectedRole) {
      loadSessions();
    }
  }, [agencyCode, date, user, selectedRole]);

  const loadLugares = async () => {
    try {
      // Load lugares from tdt_lugar table
      const { data: lugaresData, error: lugaresError } = await supabase
        .from("tdt_lugar")
        .select("lugar")
        .order("lugar");

      if (lugaresError) {
        console.error("Error loading lugares:", lugaresError);
        return;
      }

      if (lugaresData && lugaresData.length > 0) {
        const lugaresList = lugaresData.map((item) => item.lugar).sort();
        setLugares(lugaresList);
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
      console.log("loadOptions: No selectedRole, returning early");
      return;
    }
    
    console.log("loadOptions: Starting to load options for role:", selectedRole);
    
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

      console.log("loadOptions: Raw options data from database:", optionsData);
      console.log("loadOptions: Number of options:", optionsData?.length || 0);

      if (!optionsData || optionsData.length === 0) {
        console.log("loadOptions: No options data, setting empty cascading options");
        setCascadingOptions({});
        return;
      }

      // Build cascading structure: canal -> descripcion
      // Note: lugar is completely independent and comes from tdt_lugar table
      // The cascading structure is used for canal -> descripcion only
      const cascading: CascadingOptions = {};

      optionsData.forEach((option, index) => {
        const canal = option.canal;
        const descripcion = option.descripción;
        
        console.log(`loadOptions: Processing option ${index}:`, { canal, descripcion, fullOption: option });

        // If canal exists, add it to the structure
        if (canal) {
          // Initialize the canal entry if it doesn't exist
          if (!cascading[canal]) {
            cascading[canal] = [];
            console.log(`loadOptions: Created new canal entry: ${canal}`);
          }
          
          // If descripcion exists, add it to the canal's descripciones array
          if (descripcion && !cascading[canal].includes(descripcion)) {
            cascading[canal].push(descripcion);
            console.log(`loadOptions: Added descripcion "${descripcion}" to canal "${canal}"`);
          }
          // Note: Even if there's no descripcion, the canal is still added to the structure
          // so it will appear in the dropdown
        } else if (descripcion) {
          // If no canal but has descripcion, use a placeholder "Sin canal"
          const placeholderCanal = "Sin canal";
          if (!cascading[placeholderCanal]) {
            cascading[placeholderCanal] = [];
            console.log(`loadOptions: Created placeholder canal entry: ${placeholderCanal}`);
          }
          
          if (!cascading[placeholderCanal].includes(descripcion)) {
            cascading[placeholderCanal].push(descripcion);
            console.log(`loadOptions: Added descripcion "${descripcion}" to placeholder canal`);
          }
        } else {
          console.log(`loadOptions: Option ${index} has neither canal nor descripcion, skipping`);
        }
      });

      console.log("loadOptions: Final cascading structure:", cascading);
      console.log("loadOptions: Canal keys:", Object.keys(cascading));
      setCascadingOptions(cascading);
    } catch (error) {
      console.error("Error loading options:", error);
      setCascadingOptions({});
    }
  };

  const loadAgencyCode = async (agencySlug: string, formattedAgency: string) => {
    console.log("loadAgencyCode: Starting", { agencySlug, formattedAgency });
    try {
      // Load tdt_agencias and lista_agencias to find the agency code
      const { data: tdtAgenciasData, error: tdtAgenciasError } = await supabase
        .from("tdt_agencias")
        .select("*, lista_agencias(*)");

      if (tdtAgenciasError) {
        console.error("Error loading tdt_agencias:", tdtAgenciasError);
        return;
      }

      console.log("loadAgencyCode: tdt_agencias data", tdtAgenciasData);

      if (!tdtAgenciasData) {
        console.log("loadAgencyCode: No tdt_agencias data");
        return;
      }

      // Find the agency that matches the formatted name
      const normalizedSlug = agencySlug.toLowerCase();
      console.log("loadAgencyCode: Looking for match", { normalizedSlug, formattedAgency });

      for (const tdtAgencia of tdtAgenciasData) {
        const listaAgencia = tdtAgencia.lista_agencias as ListaAgencia | null;
        const agencyName = listaAgencia?.DESSUCAGE || "";
        const codSucAge = listaAgencia?.CODSUCAGE;
        
        // Check if the agency name matches (case-insensitive)
        const normalizedAgencyName = agencyName.toLowerCase();
        const normalizedAgencySlug = normalizedAgencyName.replace(/\s+/g, "-");
        
        console.log("loadAgencyCode: Checking", {
          agencyName,
          codSucAge,
          tdtAgenciaAgencia: tdtAgencia.agencia,
          normalizedAgencyName,
          normalizedAgencySlug,
          matchesFormatted: normalizedAgencyName === formattedAgency.toLowerCase(),
          matchesSlug: normalizedAgencySlug === normalizedSlug,
        });
        
        if (
          normalizedAgencyName === formattedAgency.toLowerCase() ||
          normalizedAgencySlug === normalizedSlug
        ) {
          // Use CODSUCAGE directly as it's the primary key
          const agencyCodeValue = codSucAge ?? tdtAgencia.agencia;
          console.log("loadAgencyCode: Match found! Setting agency code to", agencyCodeValue, "(CODSUCAGE)");
          setAgencyCode(agencyCodeValue);
          return;
        }
      }
      
      console.log("loadAgencyCode: No matching agency found");
    } catch (error) {
      console.error("Error loading agency code:", error);
    }
  };

  const loadSessions = async () => {
    if (!agencyCode || !date || !selectedRole || !user?.email) {
      console.log("loadSessions: Missing required values", { agencyCode, date, selectedRole, userEmail: user?.email });
      return;
    }

    console.log("loadSessions: Starting to load sessions", { agencyCode, date, selectedRole, userEmail: user.email });

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

      console.log("loadSessions: Query parameters", {
        agencia: agencyCode,
        rol: selectedRole,
        date,
        startOfDayPeru,
        endOfDayPeru,
        startOfDayUTC,
      });

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

      console.log("loadSessions: Query result (Peru timezone)", { sessionsData: sessionsData?.length || 0, error: sessionsError });

      // If no results, try with a wider range or without timezone
      if ((!sessionsData || sessionsData.length === 0) && !sessionsError) {
        console.log("loadSessions: Trying query with date only (no time filter)");
        // Try querying all sessions for the agency/role and filter by date in JavaScript
        // Filter by user's email to only show sessions created by the current user
        const { data: allSessionsData, error: allSessionsError } = await supabase
          .from("tdt_sessions")
          .select("*")
          .eq("agencia", agencyCode)
          .eq("rol", selectedRole)
          .eq("created_by", user.email)
          .order("created_at", { ascending: false });

        if (!allSessionsError && allSessionsData) {
          console.log("loadSessions: All sessions for agency/role", allSessionsData.length);
          // Filter by date in JavaScript
          // Sessions are stored in UTC, so we need to check both UTC date and Peru timezone date
          sessionsData = allSessionsData.filter((session) => {
            if (!session.created_at) return false;
            const sessionDate = new Date(session.created_at);
            
            // Check UTC date (how it's stored)
            const sessionDateUTC = sessionDate.toISOString().split('T')[0];
            
            // Check Peruvian timezone date (how user sees it)
            const sessionDatePeru = sessionDate.toLocaleDateString('en-CA', { 
              timeZone: 'America/Lima',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });
            
            // Also check if the session date in UTC could represent the target date in Peru
            // A session created on date-1 in UTC (late evening) might be date in Peru
            // A session created on date in UTC (early morning) might be date-1 in Peru
            // So we check if either matches
            const matches = sessionDateUTC === date || sessionDatePeru === date;
            
            console.log("loadSessions: Comparing dates", { 
              sessionDate: session.created_at, 
              sessionDateUTC, 
              sessionDatePeru, 
              targetDate: date,
              matches
            });
            
            return matches;
          });
          console.log("loadSessions: Filtered sessions by date", sessionsData.length);
        } else {
          sessionsError = allSessionsError;
        }
      }

      console.log("loadSessions: Query result", { sessionsData, error: sessionsError });

      if (sessionsError) {
        console.error("Error loading sessions:", sessionsError);
        throw sessionsError;
      }

      if (!sessionsData || sessionsData.length === 0) {
        console.log("loadSessions: No sessions found for the given criteria");
        setSessionCards([]);
        setIsLoadingSessions(false);
        return;
      }

      console.log("loadSessions: Found sessions", sessionsData.length);

      // Load observations for all sessions
      const sessionIds = sessionsData.map((s) => s.id);
      const { data: observationsData, error: observationsError } = await supabase
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
        }));

        return {
          id: `card-${session.id}`,
          dbId: session.id,
          observations,
          startTime: session.inicio,
          finishTime: session.fin,
          cliente: session.cliente,
        };
      });

      console.log("loadSessions: Transformed cards", cards.length);
      setSessionCards(cards);
      
      // Set finished cards
      const finished = new Set<string>();
      // Set all cards as minimized on load
      const minimized = new Set<string>();
      cards.forEach((card) => {
        minimized.add(card.id);
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

  const handleBack = () => {
    router.push("/toma-de-tiempos");
  };

  const handleCreateSession = async () => {
    if (!agencyCode || !selectedRole) return;

    try {
      // Collapse all existing session cards
      setMinimizedCards((prev) => {
        const newSet = new Set(prev);
        sessionCards.forEach((card) => {
          if (!finishedCards.has(card.id)) {
            // Only collapse if not finished (finished ones can't be collapsed anyway)
            newSet.add(card.id);
          }
        });
        return newSet;
      });

      // Create session in database
      const startTime = getPeruvianTimeISO();
      if (!user?.email) {
        alert("Error: No se pudo obtener el email del usuario");
        return;
      }

      const { data: newSession, error: sessionError } = await supabase
        .from("tdt_sessions")
        .insert({
          agencia: agencyCode,
          rol: selectedRole,
          inicio: startTime,
          fin: null,
          created_by: user.email,
        })
        .select()
        .single();

      if (sessionError) {
        console.error("Error creating session:", sessionError);
        alert("Error al crear la sesión");
        return;
      }

      // Calculate cliente number based on existing sessions for this date
      const existingSessionsCount = sessionCards.length;
      const clienteNumber = existingSessionsCount + 1;
      const cliente = `Cliente ${clienteNumber}`;

      // Update the session with the cliente
      const { data: updatedSession, error: updateError } = await supabase
        .from("tdt_sessions")
        .update({ cliente })
        .eq("id", newSession.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating session cliente:", updateError);
        // Continue anyway, cliente will be null
      }

      const newCard: SessionCard = {
        id: `card-${newSession.id}`,
        dbId: newSession.id,
        observations: [],
        startTime: newSession.inicio,
        finishTime: null,
        cliente: updatedSession?.cliente || cliente,
      };
      setSessionCards([...sessionCards, newCard]);

      // Open dialog to create first observation
      setEditingObservation({ cardId: newCard.id, observationId: null });
      setDialogFormData({
        firstDropdown: "",
        secondDropdown: "",
        thirdDropdown: "",
        startTime: startTime, // Set start time when dialog opens
        comentarios: "",
      });
      setIsDialogOpen(true);

      // Scroll to top after a short delay to ensure DOM update
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }, 0);
    } catch (error) {
      console.error("Error creating session:", error);
      alert("Error al crear la sesión");
    }
  };

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
    // Check if all observations have started
    if (!canFinishCard(cardId)) {
      return; // Don't finish if not all observations have started
    }

    const card = sessionCards.find((c) => c.id === cardId);
    if (!card || !card.dbId) return;

    try {
      const finishTimestamp = getPeruvianTimeISO();

      // Update session in database
      const { error: sessionError } = await supabase
        .from("tdt_sessions")
        .update({ fin: finishTimestamp })
        .eq("id", card.dbId);

      if (sessionError) {
        console.error("Error finishing session:", sessionError);
        alert("Error al finalizar la sesión");
        return;
      }

      // Update all unfinished observations in database
      const unfinishedObservations = card.observations.filter((obs) => !obs.isFinished);
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

      // Update local state
      setSessionCards(
        sessionCards.map((c) =>
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
      });
      setIsDialogOpen(true);
    }
  };

  const handleSaveObservation = async () => {
    if (!editingObservation) return;

    const { cardId, observationId } = editingObservation;
    const card = sessionCards.find((c) => c.id === cardId);
    if (!card || !card.dbId) return;

    try {
      if (observationId) {
        // Editing existing observation
        const observation = card.observations.find((obs) => obs.id === observationId);
        if (!observation || !observation.dbId) return;

        // Update observation in database
        const { error: updateError } = await supabase
          .from("tdt_observations")
          .update({
            lugar: dialogFormData.firstDropdown || null,
            canal: dialogFormData.secondDropdown || null,
            descripcion: dialogFormData.thirdDropdown || null,
            inicio: dialogFormData.startTime || observation.startTime,
            comentarios: dialogFormData.comentarios || null,
          })
          .eq("id", observation.dbId);

        if (updateError) {
          console.error("Error updating observation:", updateError);
          alert("Error al actualizar la observación");
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
                          firstDropdown: dialogFormData.firstDropdown,
                          secondDropdown: dialogFormData.secondDropdown,
                          thirdDropdown: dialogFormData.thirdDropdown,
                          startTime: dialogFormData.startTime || obs.startTime,
                          comentarios: dialogFormData.comentarios || null,
                        }
                      : obs
                  ),
                }
              : c
          )
        );
      } else {
        // Creating new observation
        const startTime = dialogFormData.startTime || getPeruvianTimeISO();

        // Create observation in database
        const { data: newObservation, error: insertError } = await supabase
          .from("tdt_observations")
          .insert({
            tdt_session: card.dbId,
            lugar: dialogFormData.firstDropdown || null,
            canal: dialogFormData.secondDropdown || null,
            descripcion: dialogFormData.thirdDropdown || null,
            inicio: startTime,
            fin: null,
            comentarios: dialogFormData.comentarios || null,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating observation:", insertError);
          alert("Error al crear la observación");
          return;
        }

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
        };

        // Update local state
        setSessionCards(
          sessionCards.map((c) =>
            c.id === cardId
              ? { ...c, observations: [...c.observations, newObs] }
              : c
          )
        );
      }

      // Close dialog and reset
      setIsDialogOpen(false);
      setEditingObservation(null);
      setDialogFormData({
        firstDropdown: "",
        secondDropdown: "",
        thirdDropdown: "",
        startTime: null,
        comentarios: "",
      });
    } catch (error) {
      console.error("Error saving observation:", error);
      alert("Error al guardar la observación");
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
    });
  };

  const handleDeleteObservation = async () => {
    if (!editingObservation || !editingObservation.observationId) return;

    const { cardId, observationId } = editingObservation;
    const card = sessionCards.find((c) => c.id === cardId);
    const observation = card?.observations.find((obs) => obs.id === observationId);

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
      });
    } catch (error) {
      console.error("Error deleting observation:", error);
      alert("Error al eliminar la observación");
    }
  };

  const handleRemoveObservation = async (cardId: string, observationId: string) => {
    const card = sessionCards.find((c) => c.id === cardId);
    const observation = card?.observations.find((obs) => obs.id === observationId);

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
      // Don't reset second/third dropdowns since lugar is independent
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

  const handleFinishObservation = async (cardId: string, observationId: string) => {
    const card = sessionCards.find((c) => c.id === cardId);
    const observation = card?.observations.find((obs) => obs.id === observationId);

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

  // Get second level options (canal) - independent of lugar selection
  const getSecondLevelOptions = useMemo(() => {
    const options = Object.keys(cascadingOptions).sort();
    console.log("Computing second level options from cascadingOptions:", cascadingOptions);
    console.log("Result:", options);
    return options;
  }, [cascadingOptions]);

  // Get third level options (descripcion) based on canal selection
  const getThirdLevelOptions = (canalValue: string): string[] => {
    if (!canalValue || !cascadingOptions[canalValue]) {
      return [];
    }
    // Get descripciones directly for the selected canal
    return cascadingOptions[canalValue] || [];
  };

  // Get dialog second level options (canal) - use the memoized value directly
  const dialogSecondLevelOptions = getSecondLevelOptions;

  // Get dialog third level options (descripcion)
  const dialogThirdLevelOptions = useMemo(() => {
    return getThirdLevelOptions(dialogFormData.secondDropdown);
  }, [dialogFormData.secondDropdown, cascadingOptions]);

  // Convert arrays to ComboboxOption format
  const lugarOptions: ComboboxOption[] = useMemo(() => {
    return lugares.map((lugar) => ({
      value: lugar,
      label: lugar,
    }));
  }, [lugares]);

  const canalOptions: ComboboxOption[] = useMemo(() => {
    return dialogSecondLevelOptions.map((canal) => ({
      value: canal,
      label: canal,
    }));
  }, [dialogSecondLevelOptions]);

  const descripcionOptions: ComboboxOption[] = useMemo(() => {
    return dialogThirdLevelOptions.map((descripcion) => ({
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
        <div className="h-full w-full max-w-4xl px-6 py-6">
          {/* Session Cards */}
          <div className="w-full space-y-4">
            {[...sessionCards].reverse().map((card, index) => {
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
                          {card.cliente || `Cliente ${sessionCards.length - index}`}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        {isMinimized && !isFinished && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFinishSession(card.id);
                            }}
                            variant="default"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={!canFinishCard(card.id)}
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
                                </div>
                                {observation.comentarios && (
                                  <div className="text-xs text-gray-600 mt-1 italic">
                                    {observation.comentarios}
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  {!observation.isFinished && !isFinished && (
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
                                  )}
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
                                    !isFinished &&
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
                        {!isFinished && (
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
                            {card.observations.length === 0 && (
                              <Button
                                onClick={() => handleRemoveCard(card.id)}
                                variant="outline"
                                className="w-full border-dashed text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                Eliminar Sesión
                              </Button>
                            )}
                            {card.observations.length > 0 && (
                              <Button
                                onClick={() => handleFinishSession(card.id)}
                                className="w-full"
                                disabled={!canFinishCard(card.id)}
                              >
                                Finalizar Sesión
                              </Button>
                            )}
                          </div>
                        )}
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

      {/* Fixed bottom button */}
      <div className="bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Button
            onClick={handleCreateSession}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white"
            size="lg"
          >
            <Plus size={16} className="mr-2" />
            Crear Sesión
          </Button>
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

            {/* Second Dropdown - Canal (Independent of Lugar) */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Canal *
              </label>
              <Combobox
                options={canalOptions}
                value={dialogFormData.secondDropdown}
                onValueChange={handleDialogSecondDropdownChange}
                placeholder={
                  selectedRole
                    ? canalOptions.length > 0
                      ? "Seleccionar canal..."
                      : "Cargando opciones..."
                    : "Selecciona un rol primero"
                }
                searchPlaceholder="Buscar canal..."
                emptyText={
                  selectedRole
                    ? canalOptions.length === 0
                      ? "Cargando opciones..."
                      : "No se encontraron canales"
                    : "Selecciona un rol primero"
                }
                disabled={!selectedRole}
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
            <Button
              onClick={handleSaveObservation}
              disabled={
                !dialogFormData.firstDropdown ||
                !dialogFormData.secondDropdown ||
                !dialogFormData.thirdDropdown
              }
              className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white"
            >
              Guardar
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

