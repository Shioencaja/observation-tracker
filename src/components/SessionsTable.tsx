"use client";

import { useState } from "react";
import { Plus, Clock, Eye, Square, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SessionWithObservations } from "@/types/observation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SessionsTableProps {
  sessions: SessionWithObservations[];
  selectedSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onCreateSession: () => void;
  onUpdate: () => void;
  isCreatingSession: boolean;
}

export default function SessionsTable({
  sessions,
  selectedSessionId,
  onSessionSelect,
  onCreateSession,
  onUpdate,
  isCreatingSession,
}: SessionsTableProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleEndSession = async (sessionId: string) => {
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("sessions")
        .update({
          end_time: now,
          updated_at: now,
        })
        .eq("id", sessionId);

      if (error) throw error;

      onUpdate();
    } catch (error) {
      console.error("Error ending session:", error);
      alert("Error al finalizar");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    setIsLoading(true);
    try {
      // First delete all observations for this session
      const { error: observationsError } = await supabase
        .from("observations")
        .delete()
        .eq("session_id", sessionId);

      if (observationsError) throw observationsError;

      // Then delete the session
      const { error: sessionError } = await supabase
        .from("sessions")
        .delete()
        .eq("id", sessionId);

      if (sessionError) throw sessionError;
      onUpdate();
    } catch (error) {
      console.error("Error al eliminar sesión:", error);
      alert("Error al eliminar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSessionDuration = (session: SessionWithObservations) => {
    const start = new Date(session.start_time);
    const end = session.end_time ? new Date(session.end_time) : new Date();
    const diff = end.getTime() - start.getTime();

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sesiones ({sessions.length})</CardTitle>
            <CardDescription>Gestiona sesiones</CardDescription>
          </div>
          <Button
            onClick={onCreateSession}
            disabled={isCreatingSession}
            className="flex items-center gap-2"
          >
            {isCreatingSession ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            Nueva
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <Plus size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Sin sesiones</h3>
            <p className="text-muted-foreground mb-4">
              Crea tu primera sesión.
            </p>
            <Button onClick={onCreateSession} disabled={isCreatingSession}>
              <Plus size={16} className="mr-2" />
              Crear
            </Button>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Estado</TableHead>
                  <TableHead className="w-24">Inicio</TableHead>
                  <TableHead className="hidden sm:table-cell w-20">
                    Duración
                  </TableHead>
                  <TableHead className="hidden sm:table-cell w-24">
                    Obs.
                  </TableHead>
                  <TableHead className="text-right w-24">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow
                    key={session.id}
                    className={`cursor-pointer ${
                      selectedSessionId === session.id ? "bg-muted/50" : ""
                    }`}
                    onClick={() => onSessionSelect(session.id)}
                  >
                    <TableCell className="w-20">
                      <Badge
                        variant={session.end_time ? "secondary" : "default"}
                        className={`text-xs ${
                          session.end_time
                            ? "bg-muted text-muted-foreground"
                            : "bg-green-100 text-green-800 hover:bg-green-100"
                        }`}
                      >
                        {session.end_time ? "Fin" : "Act"}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-24">
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-muted-foreground" />
                        <span className="text-xs">
                          {formatTime(session.start_time)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell font-mono">
                      {getSessionDuration(session)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs">
                        {session.observations.length}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right w-24">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant={
                            selectedSessionId === session.id
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className="text-xs px-2 py-1 h-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSessionSelect(session.id);
                          }}
                        >
                          <Eye size={10} className="mr-1" />
                          Ver
                        </Button>
                        {!session.end_time ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="text-xs px-2 py-1 h-auto"
                                onClick={(e) => e.stopPropagation()}
                                disabled={isLoading}
                              >
                                <Square size={10} className="mr-1" />
                                Fin
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Finalizar Sesión
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Finalizar esta sesión?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleEndSession(session.id)}
                                  disabled={isLoading}
                                >
                                  Finalizar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="text-xs p-1 h-auto"
                                onClick={(e) => e.stopPropagation()}
                                disabled={isLoading}
                                title="Eliminar sesión"
                              >
                                <Trash2 size={12} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Eliminar Sesión
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Eliminar esta sesión y todas sus
                                  observaciones? Esta acción no se puede
                                  deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteSession(session.id)
                                  }
                                  disabled={isLoading}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
