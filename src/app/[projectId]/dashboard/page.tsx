"use client";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Calendar, Clock, MapPin } from "lucide-react";
import Link from "next/link";

interface Session {
  id: string;
  user_id: string;
  project_id: string;
  agency: string | null;
  alias: string | null;
  start_time: string;
  end_time: string | null;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function ProjectDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load project and sessions data
  useEffect(() => {
    if (!projectId || !user) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Load project info
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single();

        if (projectError) throw projectError;
        setProject(projectData);

        // Load sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from("sessions")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });

        if (sessionsError) throw sessionsError;
        setSessions(sessionsData || []);
      } catch (error) {
        console.error("Error loading data:", error);
        setError("Error al cargar los datos");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId, user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/50 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/50 to-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/50 to-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Proyecto no encontrado</p>
          <Button asChild>
            <Link href="/projects">Volver a Proyectos</Link>
          </Button>
        </div>
      </div>
    );
  }

  const getSessionStatus = (session: Session) => {
    if (!session.end_time) {
      return { label: "En Progreso", variant: "default" as const };
    }
    return { label: "Completada", variant: "secondary" as const };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSessionDuration = (session: Session) => {
    if (!session.end_time) return "En progreso";

    const start = new Date(session.start_time);
    const end = new Date(session.end_time);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));

    if (diffMins < 60) {
      return `${diffMins} min`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}min`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/50 to-background">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/projects">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Link>
              </Button>
              <div>
                <h1 className="text-xl font-semibold">{project.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {sessions.length} sesión{sessions.length !== 1 ? "es" : ""}
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href={`/${projectId}/sessions`}>
                <Calendar className="h-4 w-4 mr-2" />
                Ver Todas las Sesiones
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Sessions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Sesiones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length > 0 ? (
              <div className="rounded-md border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sesión</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Agencia</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => {
                      const status = getSessionStatus(session);
                      return (
                        <TableRow
                          key={session.id}
                          className="hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() =>
                            router.push(`/${projectId}/sessions/${session.id}`)
                          }
                        >
                          <TableCell className="font-medium">
                            {session.alias ||
                              `Sesión ${session.id.substring(0, 8)}`}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(session.created_at)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatTime(session.start_time)}
                            {session.end_time &&
                              ` - ${formatTime(session.end_time)}`}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {session.agency || "Sin agencia"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant} className="text-xs">
                              {status.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  No hay sesiones registradas
                </p>
                <Button asChild>
                  <Link href={`/sessions?project=${projectId}`}>
                    Crear Primera Sesión
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
