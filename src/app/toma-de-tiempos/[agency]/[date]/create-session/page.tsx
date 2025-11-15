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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  firstDropdown: string; // Maps to canal
  secondDropdown: string; // Maps to lugar
  thirdDropdown: string; // Maps to descripcion
  startTime: string | null; // Maps to inicio
  endTime: string | null; // Maps to fin
  isFinished: boolean;
}

// Type for a session card with multiple observations
interface SessionCard {
  id: string;
  dbId: number | null; // Database ID for tdt_sessions
  observations: Observation[];
  startTime: string | null; // Maps to inicio
  finishTime: string | null; // Maps to fin
  cliente: string | null; // Maps to cliente from tdt_sessions
  comentarios: string | null; // Maps to comentarios from tdt_sessions
}

// Cascading options structure from tdt_options
// Structure: canal (first) -> lugar (second) -> descripcion (third)
interface CascadingOptions {
  [canal: string]: {
    [lugar: string]: string[]; // Array of descripciones
  };
}

function CreateSessionPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const agency = params?.agency as string;
  const date = params?.date as string;
  const [selectedAgency, setSelectedAgency] = useState<string>("");
  const [agencyCode, setAgencyCode] = useState<number | null>(null);
  const [sessionCards, setSessionCards] = useState<SessionCard[]>([]);
  const [minimizedCards, setMinimizedCards] = useState<Set<string>>(new Set());
  const [finishedCards, setFinishedCards] = useState<Set<string>>(new Set());
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [cascadingOptions, setCascadingOptions] = useState<CascadingOptions>({});
  const [firstLevelOptions, setFirstLevelOptions] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [savingComments, setSavingComments] = useState<Set<string>>(new Set());
  const [editingObservation, setEditingObservation] = useState<{
    cardId: string;
    observationId: string | null;
  } | null>(null);
  const [dialogFormData, setDialogFormData] = useState<{
    firstDropdown: string;
    secondDropdown: string;
    thirdDropdown: string;
    startTime: string | null;
  }>({
    firstDropdown: "",
    secondDropdown: "",
    thirdDropdown: "",
    startTime: null,
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
    if (agency) {
      // Convert slug back to readable format (e.g., "santo-domingo" -> "Santo Domingo")
      const formattedAgency = agency
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      setSelectedAgency(formattedAgency);
      loadAgencyCode(agency, formattedAgency);
    } else {
      // If no agency is provided, redirect back to selection
      router.push("/toma-de-tiempos");
    }
  }, [agency, router]);

  useEffect(() => {
    if (user) {
      loadOptions();
    }
  }, [user]);

  useEffect(() => {
    if (agencyCode && date && user) {
      loadSessions();
    }
  }, [agencyCode, date, user]);

  const loadOptions = async () => {
    try {
      // Load all options from tdt_options
      const { data: optionsData, error: optionsError } = await supabase
        .from("tdt_options")
        .select("*");

      if (optionsError) {
        console.error("Error loading options:", optionsError);
        return;
      }

      if (!optionsData || optionsData.length === 0) {
        setCascadingOptions({});
        setFirstLevelOptions([]);
        return;
      }

      // Build cascading structure: canal -> lugar -> descripcion
      const cascading: CascadingOptions = {};
      const firstLevelSet = new Set<string>();

      optionsData.forEach((option) => {
        const canal = option.canal;
        const lugar = option.lugar;
        const descripcion = option.descripción;

        // Skip if no canal (first level is required)
        if (!canal) return;

        firstLevelSet.add(canal);

        if (!cascading[canal]) {
          cascading[canal] = {};
        }

        // If lugar exists, add it as second level
        if (lugar) {
          if (!cascading[canal][lugar]) {
            cascading[canal][lugar] = [];
          }

          // If descripcion exists, add it as third level
          if (descripcion) {
            if (!cascading[canal][lugar].includes(descripcion)) {
              cascading[canal][lugar].push(descripcion);
            }
          }
        } else if (descripcion) {
          // If no lugar but has descripcion, treat descripcion as third level
          // Use a special placeholder "Sin lugar" for the second level
          const placeholderLugar = "Sin lugar";
          if (!cascading[canal][placeholderLugar]) {
            cascading[canal][placeholderLugar] = [];
          }
          if (!cascading[canal][placeholderLugar].includes(descripcion)) {
            cascading[canal][placeholderLugar].push(descripcion);
          }
        }
      });

      setCascadingOptions(cascading);
      setFirstLevelOptions(Array.from(firstLevelSet).sort());
    } catch (error) {
      console.error("Error loading options:", error);
      setCascadingOptions({});
      setFirstLevelOptions([]);
    }
  };

  const loadAgencyCode = async (agencySlug: string, formattedAgency: string) => {
    try {
      // Load tdt_agencias and lista_agencias to find the agency code
      const { data: tdtAgenciasData, error: tdtAgenciasError } = await supabase
        .from("tdt_agencias")
        .select("*, lista_agencias(*)");

      if (tdtAgenciasError) {
        console.error("Error loading tdt_agencias:", tdtAgenciasError);
        return;
      }

      if (!tdtAgenciasData) return;

      // Find the agency that matches the formatted name
      const normalizedSlug = agencySlug.toLowerCase();

      for (const tdtAgencia of tdtAgenciasData) {
        const listaAgencia = tdtAgencia.lista_agencias as ListaAgencia | null;
        const agencyName = listaAgencia?.DESSUCAGE || "";
        
        // Check if the agency name matches (case-insensitive)
        const normalizedAgencyName = agencyName.toLowerCase();
        const normalizedAgencySlug = normalizedAgencyName.replace(/\s+/g, "-");
        
        if (
          normalizedAgencyName === formattedAgency.toLowerCase() ||
          normalizedAgencySlug === normalizedSlug
        ) {
          setAgencyCode(tdtAgencia.agencia);
          return;
        }
      }
    } catch (error) {
      console.error("Error loading agency code:", error);
    }
  };

  const loadSessions = async () => {
    if (!agencyCode || !date) return;

    try {
      setIsLoadingSessions(true);

      // Parse the date and create date range for the day
      const dateObj = new Date(date + "T00:00:00");
      const startOfDay = dateObj.toISOString();
      const endOfDay = new Date(date + "T23:59:59.999").toISOString();

      // Load sessions for the date and agency
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("tdt_sessions")
        .select("*")
        .eq("agencia", agencyCode)
        .gte("inicio", startOfDay)
        .lte("inicio", endOfDay)
        .order("inicio", { ascending: false });

      if (sessionsError) {
        console.error("Error loading sessions:", sessionsError);
        throw sessionsError;
      }

      if (!sessionsData || sessionsData.length === 0) {
        setSessionCards([]);
        return;
      }

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
          firstDropdown: obs.canal || "",
          secondDropdown: obs.lugar || "",
          thirdDropdown: obs.descripcion || "",
          startTime: obs.inicio,
          endTime: obs.fin,
          isFinished: obs.fin !== null,
        }));

        return {
          id: `card-${session.id}`,
          dbId: session.id,
          observations,
          startTime: session.inicio,
          finishTime: session.fin,
          cliente: session.cliente,
          comentarios: session.comentarios,
        };
      });

      setSessionCards(cards);
      
      // Set finished cards
      const finished = new Set<string>();
      cards.forEach((card) => {
        if (card.finishTime) {
          finished.add(card.id);
        }
      });
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
    if (!agencyCode) return;

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
      const startTime = new Date().toISOString();
      const { data: newSession, error: sessionError } = await supabase
        .from("tdt_sessions")
        .insert({
          agencia: agencyCode,
          inicio: startTime,
          fin: null,
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
        comentarios: updatedSession?.comentarios || null,
      };
      setSessionCards([...sessionCards, newCard]);

      // Open dialog to create first observation
      setEditingObservation({ cardId: newCard.id, observationId: null });
      setDialogFormData({
        firstDropdown: "",
        secondDropdown: "",
        thirdDropdown: "",
        startTime: startTime, // Set start time when dialog opens
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
      const finishTimestamp = new Date().toISOString();

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
      startTime: new Date().toISOString(), // Set start time when dialog opens
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
            canal: dialogFormData.firstDropdown || null,
            lugar: dialogFormData.secondDropdown || null,
            descripcion: dialogFormData.thirdDropdown || null,
            inicio: dialogFormData.startTime || observation.startTime,
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
                        }
                      : obs
                  ),
                }
              : c
          )
        );
      } else {
        // Creating new observation
        const startTime = dialogFormData.startTime || new Date().toISOString();

        // Create observation in database
        const { data: newObservation, error: insertError } = await supabase
          .from("tdt_observations")
          .insert({
            tdt_session: card.dbId,
            canal: dialogFormData.firstDropdown || null,
            lugar: dialogFormData.secondDropdown || null,
            descripcion: dialogFormData.thirdDropdown || null,
            inicio: startTime,
            fin: null,
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
      firstDropdown: value,
      secondDropdown: "", // Reset dependent dropdowns
      thirdDropdown: "",
      startTime: dialogFormData.startTime, // Preserve start time
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
      const endTime = new Date().toISOString();

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

  const formatTime = (isoString: string | null): string => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Get second level options based on first dropdown selection
  const getSecondLevelOptions = (firstValue: string): string[] => {
    if (!firstValue || !cascadingOptions[firstValue]) return [];
    return Object.keys(cascadingOptions[firstValue]).sort();
  };

  // Get third level options based on first and second dropdown selections
  const getThirdLevelOptions = (
    firstValue: string,
    secondValue: string
  ): string[] => {
    if (
      !firstValue ||
      !secondValue ||
      !cascadingOptions[firstValue] ||
      !cascadingOptions[firstValue][secondValue]
    ) {
      return [];
    }
    return cascadingOptions[firstValue][secondValue];
  };

  // Get dialog second level options
  const dialogSecondLevelOptions = useMemo(() => {
    return getSecondLevelOptions(dialogFormData.firstDropdown);
  }, [dialogFormData.firstDropdown, cascadingOptions]);

  // Get dialog third level options
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
          {selectedAgency && (
            <p className="text-gray-500 text-sm">Agencia: {selectedAgency}</p>
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
                        {/* Comments textarea */}
                        <div className="space-y-2">
                          <Label htmlFor={`comments-${card.id}`} className="text-sm font-medium">
                            Comentarios
                          </Label>
                          <Textarea
                            id={`comments-${card.id}`}
                            placeholder="Agregar comentarios adicionales sobre la sesión..."
                            value={card.comentarios || ""}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              // Update local state immediately
                              setSessionCards(
                                sessionCards.map((c) =>
                                  c.id === card.id
                                    ? { ...c, comentarios: newValue }
                                    : c
                                )
                              );
                            }}
                            className="min-h-24 resize-y"
                          />
                          <Button
                            onClick={async () => {
                              if (!card.dbId) return;
                              setSavingComments((prev) => new Set(prev).add(card.id));
                              try {
                                const { error } = await supabase
                                  .from("tdt_sessions")
                                  .update({ comentarios: card.comentarios || null })
                                  .eq("id", card.dbId);

                                if (error) {
                                  console.error("Error saving comments:", error);
                                  alert("Error al guardar los comentarios");
                                }
                              } catch (error) {
                                console.error("Error saving comments:", error);
                                alert("Error al guardar los comentarios");
                              } finally {
                                setSavingComments((prev) => {
                                  const newSet = new Set(prev);
                                  newSet.delete(card.id);
                                  return newSet;
                                });
                              }
                            }}
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto"
                            disabled={savingComments.has(card.id)}
                          >
                            {savingComments.has(card.id) ? (
                              <>
                                <Loader2 size={14} className="mr-2 animate-spin" />
                                Guardando...
                              </>
                            ) : (
                              <>
                                <Save size={14} className="mr-2" />
                                Guardar Comentarios
                              </>
                            )}
                          </Button>
                        </div>
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
            {/* First Dropdown */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Primera Opción *
              </label>
              <Select
                value={dialogFormData.firstDropdown}
                onValueChange={handleDialogFirstDropdownChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {firstLevelOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Second Dropdown */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Segunda Opción *
              </label>
              <Select
                value={dialogFormData.secondDropdown}
                onValueChange={handleDialogSecondDropdownChange}
                disabled={!dialogFormData.firstDropdown}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {dialogSecondLevelOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Third Dropdown */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Tercera Opción *
              </label>
              <Select
                value={dialogFormData.thirdDropdown}
                onValueChange={handleDialogThirdDropdownChange}
                disabled={!dialogFormData.secondDropdown}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {dialogThirdLevelOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

