"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/types/supabase";
import QuestionRenderer from "./questions/QuestionRenderer";
import { observationService } from "@/services/observation-service";
import { questionService } from "@/services/question-service";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface Question {
  id: string;
  name: string;
  question_type: string;
  options: string[];
  is_mandatory?: boolean;
  depends_on_question_id?: string | null;
  depends_on_answer?: string | null;
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
  isProjectFinished?: boolean;
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
  projectId,
  isSessionFinished = false,
  onFinishSession,
  onCreateSession,
  isCreatingSession = false,
  isProjectFinished = false,
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
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const lastSavedRef = useRef<Record<string, any>>({});

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Convert observation options to questions format
  const convertedQuestions = useMemo(() => {
    return observationOptions.map((option) => ({
      id: option.id,
      name: option.name,
      question_type: option.question_type,
      options: option.options || [],
      is_mandatory: option.is_mandatory,
      depends_on_question_id: option.depends_on_question_id,
      depends_on_answer: option.depends_on_answer,
    }));
  }, [observationOptions]);

  // Use converted questions if no questions prop provided
  const allQuestions = useMemo(() => {
    return questions.length > 0 ? questions : convertedQuestions;
  }, [questions, convertedQuestions]);

  // Filter questions based on conditional logic
  const displayQuestions = useMemo(() => {
    const filtered = allQuestions.filter((question, index) => {
      // Always show if no conditional logic
      if (!question.depends_on_question_id) {
        return true;
      }

      // Get the question this depends on by ID
      const dependencyQuestion = allQuestions.find(
        (q) => q.id === question.depends_on_question_id
      );

      if (!dependencyQuestion) {
        return true; // Show if dependency not found
      }

      // Get the response for the dependency question
      const dependencyResponse = responses[dependencyQuestion.id];

      const shouldShow = dependencyResponse === question.depends_on_answer;

      // Check if the response matches the required answer
      return shouldShow;
    });

    return filtered;
  }, [allQuestions, responses]);

  // Note: Autosave functionality has been completely disabled
  // Users must manually save their changes using the save button

  // Check for changes
  useEffect(() => {
    const hasActualChanges =
      JSON.stringify(responses) !== JSON.stringify(lastSavedRef.current);
    setHasChanges(hasActualChanges);
  }, [responses]);

  // Validate mandatory questions are answered
  const validateAllQuestions = useCallback(() => {
    const errors: Record<string, string> = {};

    displayQuestions.forEach((question) => {
      // Only validate if question is mandatory
      if (!question.is_mandatory) {
        return;
      }

      const response = responses[question.id];

      // Check if mandatory question is not answered
      if (
        !response ||
        (typeof response === "string" && response.trim() === "") ||
        (Array.isArray(response) && response.length === 0) ||
        response === null ||
        response === undefined
      ) {
        errors[question.id] = `${question.name} es obligatorio`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [responses, displayQuestions]);

  // Check if all mandatory questions are answered
  const areAllQuestionsAnswered = useCallback(() => {
    return displayQuestions.every((question) => {
      // Skip validation for optional questions
      if (!question.is_mandatory) {
        return true;
      }

      const response = responses[question.id];
      return (
        response &&
        !(typeof response === "string" && response.trim() === "") &&
        !(Array.isArray(response) && response.length === 0) &&
        response !== null &&
        response !== undefined
      );
    });
  }, [responses, displayQuestions]);

  // Manual save function - no validation required
  const handleManualSave = async () => {
    if (!selectedSessionId || isSessionFinished) return;

    setIsManualSaving(true);
    try {
      // Save all responses (no validation required for manual save)
      if (!currentUserId || !projectId) {
        toast({
          title: "Error al guardar",
          description:
            "No se pudo obtener la información del usuario o proyecto",
          variant: "destructive",
        });
        return;
      }

      for (const [questionId, response] of Object.entries(responses)) {
        if (response !== null && response !== undefined && response !== "") {
          const responseString =
            typeof response === "string" ? response : JSON.stringify(response);

          const { data, error } = await observationService.upsertObservation({
            session_id: selectedSessionId,
            project_observation_option_id: questionId,
            response: responseString,
            project_id: projectId,
            user_id: currentUserId,
            agency: null, // Add agency field
            alias: null, // Add alias field
          });

          if (error) {
            console.error("Error saving observation:", error);
            toast({
              title: "Error al guardar",
              description: `Error al guardar la pregunta: ${error.message}`,
              variant: "destructive",
            });
            return;
          }
        }
      }

      // Update last saved state
      lastSavedRef.current = { ...responses };
      setHasChanges(false);
      setValidationErrors({});

      toast({
        title: "Guardado exitoso",
        description: "Todas las respuestas han sido guardadas correctamente.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error during manual save:", error);
      toast({
        title: "Error al guardar",
        description: "Ocurrió un error inesperado al guardar las respuestas.",
        variant: "destructive",
      });
    } finally {
      setIsManualSaving(false);
    }
  };

  // Finish session function
  const handleFinishSession = async () => {
    if (!onFinishSession || isSessionFinished) return;

    // First validate all questions are answered
    if (!validateAllQuestions()) {
      toast({
        title: "No se puede finalizar la sesión",
        description:
          "Por favor completa todas las preguntas requeridas antes de finalizar la sesión.",
        variant: "destructive",
      });
      return;
    }

    // Then save any pending changes
    if (hasChanges) {
      await handleManualSave();
      // Wait a bit for save to complete
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setIsFinishing(true);
    try {
      // Then finish the session
      await onFinishSession();
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

  // Note: Autosave on session changes has been disabled
  // Users must manually save their changes

  // Load existing observations when session changes
  useEffect(() => {
    const loadExistingObservations = async () => {
      if (!selectedSessionId || allQuestions.length === 0) {
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
  }, [selectedSessionId, allQuestions.length]);

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
    const hasError = validationErrors[question.id];
    const isRequired =
      !isSessionFinished &&
      !["timer", "counter", "string"].includes(question.question_type);

    try {
      return (
        <div key={question.id} className={hasError ? "space-y-1" : ""}>
          <QuestionRenderer
            question={question}
            value={responses[question.id]}
            onChange={(value) => {
              handleResponseChange(question.id, value);
              // Clear validation error when user starts typing
              if (hasError) {
                setValidationErrors((prev) => {
                  const newErrors = { ...prev };
                  delete newErrors[question.id];
                  return newErrors;
                });
              }
            }}
            required={isRequired}
            disabled={isSessionFinished}
          />
          {hasError && <p className="text-sm text-red-600 mt-1">{hasError}</p>}
        </div>
      );
    } catch (error) {
      console.error("❌ Error in renderQuestion:", {
        questionId: question.id,
        questionName: question.name,
        questionType: question.question_type,
        error: error,
      });

      return (
        <div
          key={question.id}
          className="p-4 border border-red-200 bg-red-50 rounded"
        >
          <p className="text-red-600">
            Error rendering question: {question.name}
          </p>
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
            {isManualSaving && (
              <span className="text-blue-600">💾 Guardando manualmente...</span>
            )}
            {selectedSessionId &&
              !hasChanges &&
              !isAutoSaving &&
              !isManualSaving &&
              !isSessionFinished &&
              areAllQuestionsAnswered() && (
                <span className="text-green-600">✓ Listo para finalizar</span>
              )}
            {!hasChanges &&
              !isAutoSaving &&
              !isManualSaving &&
              !isSessionFinished &&
              !areAllQuestionsAnswered() && (
                <span className="text-orange-600">
                  ⚠️ Preguntas requeridas pendientes para finalizar
                </span>
              )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!selectedSessionId ? (
          // Empty state - no session selected
          <div className="text-center py-12">
            {onCreateSession && (
              <Button
                onClick={onCreateSession}
                disabled={isCreatingSession || isProjectFinished}
                size="lg"
                className="px-8"
                title={
                  isProjectFinished
                    ? "No se pueden crear sesiones en proyectos finalizados"
                    : ""
                }
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
              return displayQuestions.map(renderQuestion);
            })()}

            {!isSessionFinished && (
              <div className="flex flex-col items-center gap-4">
                {/* Manual Save Button */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={handleManualSave}
                    disabled={isManualSaving || isLoading || !hasChanges}
                    variant="outline"
                    className="px-6"
                  >
                    {isManualSaving ? "Guardando..." : "Guardar (Opcional)"}
                  </Button>

                  {/* Finish Session Button */}
                  {onFinishSession && (
                    <Button
                      type="button"
                      onClick={handleFinishSession}
                      disabled={
                        isLoading || isFinishing || !areAllQuestionsAnswered()
                      }
                      variant="destructive"
                      className="px-6"
                    >
                      {isFinishing ? "Finalizando..." : "Finalizar Sesión"}
                    </Button>
                  )}
                </div>

                {/* Status Messages */}
                <div className="text-center text-sm text-gray-600">
                  {!areAllQuestionsAnswered() && (
                    <p className="text-orange-600">
                      ⚠️ Completa las preguntas requeridas (boolean, radio,
                      checkbox, voice) para poder finalizar la sesión
                    </p>
                  )}
                  {areAllQuestionsAnswered() && hasChanges && (
                    <p className="text-blue-600">
                      💾 Guarda los cambios antes de finalizar la sesión
                    </p>
                  )}
                  {areAllQuestionsAnswered() && !hasChanges && (
                    <p className="text-green-600">
                      ✅ Todas las preguntas requeridas completadas y guardadas
                    </p>
                  )}
                </div>
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
