"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/types/supabase";
import QuestionRenderer from "./questions/QuestionRenderer";
import { observationService } from "@/services/observation-service";

interface Question {
        id: string;
  name: string;
  question_type: string;
  options: string[];
}

interface QuestionnaireFormProps {
  questions?: Question[];
  onSave?: (responses: Record<string, any>) => void;
  isLoading?: boolean;
  // Additional props that might be passed from the pages
  observations?: any[];
  sessionId?: string;
  projectId?: string;
  onUpdate?: () => Promise<void>;
  canAddObservations?: boolean;
  onAddObservation?: () => Promise<void>;
  sessionStartTime?: string | null;
  newlyCreatedObservationId?: string | null;
  onClearNewlyCreatedObservationId?: () => void;
  observationOptions?: Tables<"project_observation_options">[];
  sessionEndTime?: string | null;
  currentSessionIndex?: number;
  totalSessions?: number;
  onNavigateToPrevious?: () => void;
  onNavigateToNext?: () => void;
  canNavigateToPrevious?: boolean;
  canNavigateToNext?: boolean;
  // New props for session state
  selectedSessionId?: string;
  isSessionFinished?: boolean;
  onFinishSession?: () => Promise<void>;
  // Props for empty state
  onCreateSession?: () => Promise<void>;
  isCreatingSession?: boolean;
}

export default function QuestionnaireForm({
  questions = [],
  onSave = () => {},
  isLoading = false,
  observationOptions = [],
  selectedSessionId,
  isSessionFinished = false,
  onFinishSession,
  onCreateSession,
  isCreatingSession = false,
  ...otherProps
}: QuestionnaireFormProps) {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [loadingObservations, setLoadingObservations] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<Record<string, any>>({});

  // Convert observation options to questions format
  const convertedQuestions: Question[] = observationOptions.map((option) => ({
    id: option.id,
    name: option.name,
    question_type: option.question_type,
    options: option.options || [],
  }));

  // Use converted questions if no questions prop provided
  const displayQuestions =
    questions.length > 0 ? questions : convertedQuestions;

  // Auto-save function
  const autoSave = useCallback(async () => {
    if (isSessionFinished || !selectedSessionId || !hasChanges) {
      return;
    }

    setIsAutoSaving(true);
    try {
      // Save each response as an observation
      for (const [questionId, response] of Object.entries(responses)) {
        if (response !== null && response !== undefined && response !== "") {
          const { error } = await observationService.upsertObservation({
            session_id: selectedSessionId,
            project_observation_option_id: questionId,
            response:
              typeof response === "string"
                ? response
                : JSON.stringify(response),
          });

          if (error) {
            console.error("Error auto-saving observation:", error);
          }
        }
      }

      // Update last saved state
      lastSavedRef.current = { ...responses };
      setHasChanges(false);
      console.log("✅ Auto-saved questionnaire responses");
    } catch (error) {
      console.error("Error during auto-save:", error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [responses, selectedSessionId, isSessionFinished, hasChanges]);

  // Set up auto-save timer
  useEffect(() => {
    if (hasChanges && !isSessionFinished) {
      // Clear existing timer
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }

      // Set new timer for 10 seconds
      autoSaveRef.current = setTimeout(() => {
        autoSave();
      }, 10000);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
    };
  }, [hasChanges, autoSave, isSessionFinished]);

  // Check for changes
  useEffect(() => {
    const hasActualChanges =
      JSON.stringify(responses) !== JSON.stringify(lastSavedRef.current);
    setHasChanges(hasActualChanges);
  }, [responses]);

  // Finish session function
  const handleFinishSession = async () => {
    if (!onFinishSession || isSessionFinished) return;

    setIsFinishing(true);
    try {
      // First, save any pending changes
      if (hasChanges) {
        await autoSave();
      }

      // Then finish the session
      await onFinishSession();
      console.log("✅ Session finished successfully");
    } catch (error) {
      console.error("Error finishing session:", error);
    } finally {
      setIsFinishing(false);
    }
  };

  // Load existing observations when session changes
  useEffect(() => {
    const loadExistingObservations = async () => {
      if (!selectedSessionId || displayQuestions.length === 0) {
        setResponses({});
        setIsInitialLoad(true);
        return;
      }

      // Only show loading on initial load
      if (isInitialLoad) {
        setLoadingObservations(true);
      }

      try {
        const { data: observations, error } =
          await observationService.getObservationsBySession(selectedSessionId);

        if (error) {
          console.error("Error loading observations:", error);
          return;
        }

        // Convert observations to responses format
        const existingResponses: Record<string, any> = {};
        observations?.forEach((obs) => {
          // Check if this is a voice response by looking at the raw response
          const isVoiceResponse =
            obs.response &&
            typeof obs.response === "string" &&
            obs.response.includes("[Audio:");

          if (isVoiceResponse) {
            // For voice responses, always use the raw string (don't parse as JSON)
            existingResponses[obs.project_observation_option_id] = obs.response;
          } else {
            try {
              // Try to parse JSON response, fallback to string
              const response = obs.response
                ? JSON.parse(obs.response)
                : obs.response;
              existingResponses[obs.project_observation_option_id] = response;
            } catch {
              // If not JSON, use as string
              existingResponses[obs.project_observation_option_id] =
                obs.response;
            }
          }
        });

        setResponses(existingResponses);
        // Update last saved state to prevent false change detection
        lastSavedRef.current = { ...existingResponses };
        setIsInitialLoad(false);
    } catch (error) {
        console.error("Error loading observations:", error);
      } finally {
        setLoadingObservations(false);
      }
    };

    loadExistingObservations();
  }, [selectedSessionId, displayQuestions.length]);

  const handleResponseChange = (questionId: string, value: any) => {
    // Don't allow changes if session is finished
    if (isSessionFinished) {
      return;
    }

    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(responses);
  };

  const renderQuestion = (question: Question) => {
        return (
      <div key={question.id}>
        <QuestionRenderer
            question={question}
          value={responses[question.id]}
          onChange={(value) => handleResponseChange(question.id, value)}
          required={!isSessionFinished}
          disabled={isSessionFinished}
            />
          </div>
        );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            Cuestionario
            {isSessionFinished && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                (Sesión finalizada - Solo lectura)
              </span>
            )}
          </span>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {hasChanges && !isSessionFinished && (
              <span className="text-orange-600">● Cambios sin guardar</span>
            )}
            {isAutoSaving && (
              <span className="text-blue-600">
                💾 Guardando automáticamente...
              </span>
            )}
            {!hasChanges && !isAutoSaving && !isSessionFinished && (
              <span className="text-green-600">✓ Guardado</span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!selectedSessionId ? (
          // Empty state - no session selected
          <div className="text-center py-12">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Selecciona una sesión para comenzar
              </h3>
              <p className="text-gray-500 mb-6">
                Elige una sesión existente de la tabla superior o crea una nueva
                sesión para empezar a llenar el cuestionario.
              </p>
              </div>
            {onCreateSession && (
              <Button
                onClick={onCreateSession}
                disabled={isCreatingSession}
                size="lg"
                className="px-8"
              >
                {isCreatingSession ? "Creando sesión..." : "Crear Nueva Sesión"}
              </Button>
            )}
                </div>
        ) : loadingObservations ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">
              Cargando respuestas existentes...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {displayQuestions.map(renderQuestion)}

            {!isSessionFinished && (
              <div className="flex gap-3">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Guardando..." : "Guardar Respuestas"}
              </Button>
                {onFinishSession && (
                    <Button
                    type="button"
                    onClick={handleFinishSession}
                    disabled={isLoading || isFinishing}
                    variant="destructive"
                    className="flex-1"
                  >
                    {isFinishing ? "Finalizando..." : "Finalizar Sesión"}
                    </Button>
              )}
            </div>
          )}

            {isSessionFinished && (
              <div className="text-center py-4 text-gray-500 text-sm">
                Esta sesión ha sido finalizada. Las respuestas no se pueden
                editar.
              </div>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
