"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, User, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { formatTime } from "@/lib/utils";

interface SessionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: {
    id: string;
    alias: string;
    start_time: string;
    end_time?: string;
    user_id: string;
    user_email?: string;
  } | null;
  observations: Array<{
    id: string;
    question_id: string;
    question_name: string;
    question_type: string;
    response: any;
    created_at: string;
  }>;
  allSessions: Array<{
    id: string;
    alias: string;
    start_time: string;
    end_time?: string;
    user_id: string;
  }>;
  onNavigateSession: (sessionId: string) => void;
}

export default function SessionDetailsModal({
  isOpen,
  onClose,
  session,
  observations,
  allSessions,
  onNavigateSession,
}: SessionDetailsModalProps) {
  const [userEmail, setUserEmail] = React.useState<string>("");

  // Set user email from session data
  React.useEffect(() => {
    if (session?.user_email) {
      setUserEmail(session.user_email);
    } else if (session?.user_id) {
      setUserEmail(`User ${session.user_id.substring(0, 8)}`);
    }
  }, [session?.user_email, session?.user_id]);

  if (!session) return null;

  // Navigation logic
  const currentIndex = allSessions.findIndex((s) => s.id === session.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allSessions.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      const previousSession = allSessions[currentIndex - 1];
      onNavigateSession(previousSession.id);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextSession = allSessions[currentIndex + 1];
      onNavigateSession(nextSession.id);
    }
  };

  const formatResponse = (response: any, questionType: string) => {
    if (response === null || response === undefined) return "Sin respuesta";

    // Helper function to safely parse JSON
    const parseJsonSafely = (str: string) => {
      try {
        return JSON.parse(str);
      } catch {
        return str;
      }
    };

    switch (questionType) {
      case "text":
      case "string":
        return response;

      case "boolean":
      case "radio":
        return response ? "Sí" : "No";

      case "checkbox":
        // Try to parse as JSON if it's a string
        let checkboxData = response;
        if (typeof response === "string") {
          checkboxData = parseJsonSafely(response);
        }

        if (Array.isArray(checkboxData)) {
          return checkboxData.length > 0
            ? checkboxData.join(", ")
            : "Sin selección";
        }
        return "Sin selección";

      case "number":
      case "counter":
        if (typeof response === "number") {
          return response.toString();
        }
        // Handle string numbers
        if (typeof response === "string" && !isNaN(Number(response))) {
          return response;
        }
        return "Sin valor";

      case "timer":
        // Try to parse as JSON if it's a string
        let timerData = response;
        if (typeof response === "string") {
          timerData = parseJsonSafely(response);
        }

        if (Array.isArray(timerData)) {
          return timerData.map((cycle: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {cycle.alias || `Ciclo ${index + 1}`}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {cycle.seconds ? formatTime(cycle.seconds) : "Sin duración"}
              </span>
            </div>
          ));
        }
        return "Sin ciclos";

      case "voice":
        // Handle voice responses with audio URL
        if (typeof response === "string" && response.includes("[Audio:")) {
          const audioUrlMatch = response.match(/\[Audio: (.*?)\]/);
          if (audioUrlMatch) {
            const audioUrl = audioUrlMatch[1];
            return (
              <div className="flex items-center gap-2">
                <audio controls className="max-w-xs">
                  <source src={audioUrl} type="audio/webm" />
                  <source src={audioUrl} type="audio/wav" />
                  Tu navegador no soporta el elemento de audio.
                </audio>
                <span className="text-xs text-muted-foreground">
                  Audio grabado
                </span>
              </div>
            );
          }
        }
        return "Sin audio grabado";

      default:
        return typeof response === "string"
          ? response
          : JSON.stringify(response);
    }
  };

  const getSessionDuration = () => {
    if (!session.end_time) return "Sesión activa";

    const start = new Date(session.start_time);
    const end = new Date(session.end_time);
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);

    return formatTime(duration);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Detalles de Sesión
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={!hasPrevious}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                {currentIndex + 1} de {allSessions.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={!hasNext}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Session Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{session.alias}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Fecha</p>
                  <p className="font-medium">
                    {new Date(session.start_time).toLocaleDateString("es-ES", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Duración</p>
                  <p className="font-medium">{getSessionDuration()}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Usuario</p>
                  <p className="font-medium">
                    {userEmail ||
                      session.user_email ||
                      session.user_id.substring(0, 8)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Observations */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Respuestas</h3>

            {observations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay respuestas registradas para esta sesión.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {observations.map((observation) => (
                  <div
                    key={observation.id}
                    className="border rounded-lg p-4 bg-card"
                  >
                    <div className="mb-3">
                      <h4 className="font-medium text-foreground">
                        {observation.question_name}
                      </h4>
                    </div>

                    <div className="bg-muted/30 rounded p-3">
                      {observation.question_type === "timer" ? (
                        <div className="space-y-1">
                          {formatResponse(
                            observation.response,
                            observation.question_type
                          )}
                        </div>
                      ) : (
                        <p className="text-sm">
                          {formatResponse(
                            observation.response,
                            observation.question_type
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
