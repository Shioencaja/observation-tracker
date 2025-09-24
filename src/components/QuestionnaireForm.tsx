"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/types/supabase";
import QuestionRenderer from "./questions/QuestionRenderer";
import { observationService } from "@/services/observation-service";
import { questionService } from "@/services/question-service";
import { useToast } from "@/hooks/use-toast";

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
  // Props for question management
  onQuestionUpdated?: (question: Tables<"project_observation_options">) => void;
  onQuestionDeleted?: (questionId: string) => void;
  onQuestionDuplicated?: (
    question: Tables<"project_observation_options">
  ) => void;
  canManageQuestions?: boolean;
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
  onQuestionUpdated,
  onQuestionDeleted,
  onQuestionDuplicated,
  canManageQuestions = false,
  ...otherProps
}: QuestionnaireFormProps) {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [loadingObservations, setLoadingObservations] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const { toast } = useToast();
  const [isFinishing, setIsFinishing] = useState(false);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<Record<string, any>>({});

  // Convert observation options to questions format
  console.log("🔄 Converting observation options to questions:", {
    observationOptionsCount: observationOptions.length,
    questionsCount: questions.length
  });
  
  const convertedQuestions: Question[] = observationOptions.map((option) => ({
    id: option.id,
    name: option.name,
    question_type: option.question_type,
    options: option.options || [],
  }));

  // Use converted questions if no questions prop provided
  const displayQuestions =
    questions.length > 0 ? questions : convertedQuestions;
    
  console.log("✅ Display questions prepared:", {
    displayQuestionsCount: displayQuestions.length,
    questionTypes: displayQuestions.map(q => q.question_type)
  });

  // Auto-save function
  const autoSave = useCallback(async () => {
    if (isSessionFinished || !selectedSessionId || !hasChanges || isLoading) {
      return;
    }

    setIsAutoSaving(true);
    try {
      // Double-check that session still exists before saving
      if (!selectedSessionId) {
        console.log("Session no longer exists, skipping auto-save");
        return;
      }
      // Save each response as an observation
      for (const [questionId, response] of Object.entries(responses)) {
        if (response !== null && response !== undefined && response !== "") {
          const responseString =
            typeof response === "string" ? response : JSON.stringify(response);

          // Check if this is a voice response and if we're updating an existing one
          const isVoiceResponse = responseString.includes("[Audio:");
          const previousResponse = lastSavedRef.current[questionId];
          const isUpdatingVoice =
            isVoiceResponse &&
            previousResponse &&
            previousResponse !== responseString;

          if (isUpdatingVoice) {
            // Use voice cleanup function for voice recording updates
            const { data: existing } =
              await observationService.getObservationsBySession(
                selectedSessionId
              );
            const existingObservation = existing?.find(
              (obs) => obs.project_observation_option_id === questionId
            );

            if (existingObservation) {
              const { error } =
                await observationService.updateObservationWithVoiceCleanup(
                  existingObservation.id,
                  { response: responseString },
                  previousResponse
                );

              if (error) {
                console.error("Error auto-saving voice observation:", error);
              }
            }
          } else {
            // Use regular upsert for non-voice or new observations
            const { error } = await observationService.upsertObservation({
              session_id: selectedSessionId,
              project_observation_option_id: questionId,
              response: responseString,
            });

            if (error) {
              console.error("Error auto-saving observation:", error);
            }
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
  }, [responses, selectedSessionId, isSessionFinished, hasChanges, isLoading]);

  // Set up auto-save timer
  useEffect(() => {
    if (hasChanges && !isSessionFinished && !isLoading) {
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
  }, [hasChanges, autoSave, isSessionFinished, isLoading]);

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
      // First, save any pending changes using auto-save
      if (hasChanges) {
        await autoSave();
      }

      // Then finish the session (this will NOT trigger additional saves)
      await onFinishSession();
      console.log("✅ Session finished successfully");
    } catch (error) {
      console.error("Error finishing session:", error);
    } finally {
      setIsFinishing(false);
    }
  };

  // Question management handlers
  const handleQuestionUpdated = useCallback(
    async (question: Tables<"project_observation_options">) => {
      if (onQuestionUpdated) {
        onQuestionUpdated(question);
      }
    },
    [onQuestionUpdated]
  );

  const handleQuestionDeleted = useCallback(
    async (questionId: string) => {
      if (onQuestionDeleted) {
        onQuestionDeleted(questionId);
      }
    },
    [onQuestionDeleted]
  );

  const handleQuestionDuplicated = useCallback(
    async (question: Tables<"project_observation_options">) => {
      if (onQuestionDuplicated) {
        onQuestionDuplicated(question);
      }
    },
    [onQuestionDuplicated]
  );

  // Save changes when session changes (cleanup effect)
  useEffect(() => {
    return () => {
      // Save any pending changes when component unmounts or session changes
      if (hasChanges && !isSessionFinished && selectedSessionId) {
        autoSave();
      }
    };
  }, [selectedSessionId, hasChanges, isSessionFinished, autoSave]);

  // Load existing observations when session changes
  useEffect(() => {
    const loadExistingObservations = async () => {
      if (!selectedSessionId || displayQuestions.length === 0) {
        setResponses({});
        setIsInitialLoad(true);
        setHasChanges(false);
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
          setResponses({});
          setHasChanges(false);
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

  // Manual save is now handled by auto-save, so we don't need handleSubmit

  const renderQuestion = (question: Question) => {
    console.log("🔄 Rendering question in QuestionnaireForm:", {
      questionId: question.id,
      questionName: question.name,
      questionType: question.question_type
    });
    
    try {
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
    } catch (error) {
      console.error("❌ Error in renderQuestion:", {
        questionId: question.id,
        questionName: question.name,
        questionType: question.question_type,
        error: error
      });
      
      return (
        <div key={question.id} className="p-4 border border-red-200 bg-red-50 rounded">
          <p className="text-red-600">Error rendering question: {question.name}</p>
        </div>
      );
    }
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
          <div className="space-y-6">
            {(() => {
              console.log("🔄 About to render questions:", {
                displayQuestionsCount: displayQuestions.length,
                questionIds: displayQuestions.map(q => q.id)
              });
              return displayQuestions.map(renderQuestion);
            })()}

            {!isSessionFinished && onFinishSession && (
              <div className="flex justify-center">
                <Button
                  type="button"
                  onClick={handleFinishSession}
                  disabled={isLoading || isFinishing}
                  variant="destructive"
                  className="px-8"
                >
                  {isFinishing ? "Finalizando..." : "Finalizar Sesión"}
                </Button>
              </div>
            )}

            {isSessionFinished && (
              <div className="text-center py-4 text-gray-500 text-sm">
                Esta sesión ha sido finalizada. Las respuestas no se pueden
                editar.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
