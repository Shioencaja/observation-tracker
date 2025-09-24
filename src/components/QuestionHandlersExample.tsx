"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/types/supabase";
import { questionService } from "@/services/question-service";
import { useToast } from "@/hooks/use-toast";
import QuestionManager from "./QuestionManager";

interface QuestionHandlersExampleProps {
  projectId: string;
  questions: Tables<"project_observation_options">[];
  onQuestionsChange: (
    questions: Tables<"project_observation_options">[]
  ) => void;
}

export default function QuestionHandlersExample({
  projectId,
  questions,
  onQuestionsChange,
}: QuestionHandlersExampleProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  // Handler for when a question is updated
  const handleQuestionUpdated = useCallback(
    (updatedQuestion: Tables<"project_observation_options">) => {
      const updatedQuestions = questions.map((q) =>
        q.id === updatedQuestion.id ? updatedQuestion : q
      );
      onQuestionsChange(updatedQuestions);

      toast({
        title: "Pregunta actualizada",
        description: `"${updatedQuestion.name}" ha sido actualizada correctamente`,
      });
    },
    [questions, onQuestionsChange, toast]
  );

  // Handler for when a question is deleted
  const handleQuestionDeleted = useCallback(
    (questionId: string) => {
      const deletedQuestion = questions.find((q) => q.id === questionId);
      const updatedQuestions = questions.filter((q) => q.id !== questionId);
      onQuestionsChange(updatedQuestions);

      toast({
        title: "Pregunta eliminada",
        description: `"${
          deletedQuestion?.name || "Pregunta"
        }" ha sido eliminada correctamente`,
      });
    },
    [questions, onQuestionsChange, toast]
  );

  // Handler for when a question is duplicated
  const handleQuestionDuplicated = useCallback(
    (duplicatedQuestion: Tables<"project_observation_options">) => {
      const updatedQuestions = [...questions, duplicatedQuestion];
      onQuestionsChange(updatedQuestions);

      toast({
        title: "Pregunta duplicada",
        description: `"${duplicatedQuestion.name}" ha sido duplicada correctamente`,
      });
    },
    [questions, onQuestionsChange, toast]
  );

  // Handler for creating a new question
  const handleCreateQuestion = useCallback(async () => {
    setIsCreating(true);
    try {
      const newQuestion = await questionService.createQuestion({
        name: "Nueva pregunta",
        question_type: "string",
        project_id: projectId,
        is_visible: true,
        order: questions.length + 1,
      });

      const updatedQuestions = [...questions, newQuestion];
      onQuestionsChange(updatedQuestions);

      toast({
        title: "Pregunta creada",
        description: "Nueva pregunta creada correctamente",
      });
    } catch (error) {
      console.error("Error creating question:", error);
      toast({
        title: "Error",
        description: "Error al crear la pregunta",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  }, [projectId, questions, onQuestionsChange, toast]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Preguntas</CardTitle>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Administra las preguntas de tu proyecto
            </p>
            <Button
              onClick={handleCreateQuestion}
              disabled={isCreating}
              size="sm"
            >
              {isCreating ? "Creando..." : "Nueva Pregunta"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {questions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay preguntas en este proyecto</p>
                <p className="text-sm">
                  Crea tu primera pregunta para comenzar
                </p>
              </div>
            ) : (
              questions.map((question) => (
                <QuestionManager
                  key={question.id}
                  question={question}
                  projectId={projectId}
                  onQuestionUpdated={handleQuestionUpdated}
                  onQuestionDeleted={handleQuestionDeleted}
                  onQuestionDuplicated={handleQuestionDuplicated}
                  canEdit={true}
                  canDelete={true}
                  canDuplicate={true}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
