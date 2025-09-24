"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Calendar as CalendarIcon,
  ArrowRight,
  LogOut,
  User,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Project } from "@/types/observation";
import {
  validateProjectAccess,
  redirectToLogin,
  redirectToProjects,
} from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
// Temporarily removed auth-utils imports

function DateSelectorPageContent() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [selectedAgency, setSelectedAgency] = useState<string>("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isValidatingAuth, setIsValidatingAuth] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Always default to today's date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  useEffect(() => {
    if (!authLoading && !user) {
      redirectToLogin();
    }
  }, [user, authLoading, router]);

  // Validate authentication and project access
  useEffect(() => {
    const validateAccess = async () => {
      if (!user || !projectId) return;

      setIsValidatingAuth(true);
      setAuthError(null);

      try {
        // Validate project access
        const validation = await validateProjectAccess(projectId);

        if (!validation.hasAccess) {
          setAuthError(validation.error || "Sin acceso al proyecto");
          if (validation.error === "Usuario no autenticado") {
            redirectToLogin();
          } else {
            redirectToProjects();
          }
          return;
        }

        // Set project data
        if (validation.project) {
          setProject(validation.project);
          // Set first agency as default if available
          if (
            validation.project.agencies &&
            validation.project.agencies.length > 0
          ) {
            setSelectedAgency(validation.project.agencies[0]);
          }
        } else {
          // Fallback: load project data separately if not returned from validation
          const { data: projectData, error: projectError } = await supabase
            .from("projects")
            .select("id, name, description, agencies, created_at, updated_at")
            .eq("id", projectId)
            .single();

          if (projectError || !projectData) {
            setAuthError("Error cargando datos del proyecto");
            redirectToProjects();
            return;
          }

          setProject(projectData);
          if (projectData.agencies && projectData.agencies.length > 0) {
            setSelectedAgency(projectData.agencies[0]);
          }
        }
      } catch (error) {
        console.error("Error validating project access:", error);
        setAuthError("Error interno del servidor");
        redirectToProjects();
      } finally {
        setIsValidatingAuth(false);
        setIsLoadingProject(false);
      }
    };

    if (!authLoading && user) {
      validateAccess();
    }
  }, [user, projectId, router, authLoading]);

  // Project loading is now handled in the auth validation useEffect

  const handleContinue = () => {
    if (project && selectedAgency) {
      // Navigate to sessions with the selected date, project, and agency
      router.push(
        `/${projectId}/${selectedDate}/sessions?agency=${encodeURIComponent(
          selectedAgency
        )}`
      );
    }
  };

  const handleBackToProjects = () => {
    router.push("/projects");
  };

  if (authLoading || isValidatingAuth || isLoadingProject) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando proyecto...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error de Acceso
            </CardTitle>
            <CardDescription>{authError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => redirectToProjects()} className="w-full">
              Volver a Proyectos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando proyecto...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-6 py-12">
        {/* Minimal Header */}
        <div className="mb-12">
          <Button
            onClick={handleBackToProjects}
            variant="ghost"
            size="sm"
            className="mb-6 p-0 h-auto text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={16} className="mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">
            {project.name}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Selecciona una fecha para continuar
          </p>
        </div>

        {/* Form Content */}
        <div className="space-y-6">
          {/* Date Selector */}
          <div>
            <label
              htmlFor="date-input"
              className="text-sm font-medium text-gray-700"
            >
              Fecha *
            </label>
            <input
              id="date-input"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="mt-2 w-full h-11 px-3 py-2 border border-gray-200 rounded-md focus:border-gray-400 focus:ring-gray-400 focus:outline-none"
            />
          </div>

          {/* Agency Selector */}
          {project.agencies && project.agencies.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700">
                Agencia *
              </label>
              <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                <SelectTrigger className="mt-2 w-full h-11 border-gray-200 focus:border-gray-400 focus:ring-gray-400">
                  <SelectValue placeholder="Seleccionar agencia..." />
                </SelectTrigger>
                <SelectContent>
                  {project.agencies.map((agency) => (
                    <SelectItem key={agency} value={agency}>
                      {agency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Continue Button */}
          <div className="pt-6 border-t border-gray-100">
            <Button
              onClick={handleContinue}
              disabled={
                project.agencies &&
                project.agencies.length > 0 &&
                !selectedAgency
              }
              className="w-full bg-gray-900 hover:bg-gray-800 text-white"
              size="lg"
            >
              Continuar a Sesiones
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DateSelectorPage() {
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
      <DateSelectorPageContent />
    </Suspense>
  );
}
