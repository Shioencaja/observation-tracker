"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface QuestionCardProps {
  question: {
    name: string;
    type: string;
    responses: Record<string, number>;
  };
  onExportQuestion: (question: any) => void;
  onFilterQuestion: (questionName: string) => void;
  getQuestionSpecificData: (question: any) => any;
  filteredData: any;
  onSessionClick: (sessionId: string) => void;
}

export default function QuestionCard({
  question,
  onExportQuestion,
  onFilterQuestion,
  getQuestionSpecificData,
  filteredData,
  onSessionClick,
}: QuestionCardProps) {
  const questionData = getQuestionSpecificData(question);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              {question.name}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Tipo: {question.type} • Respuestas:{" "}
              {Object.values(question.responses).reduce(
                (sum, count) => sum + count,
                0
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFilterQuestion(question.name)}
            >
              Filtrar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExportQuestion(question)}
            >
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {questionData && (
            <div className="text-sm text-muted-foreground">
              <p>Datos específicos del tipo de pregunta se mostrarán aquí.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
