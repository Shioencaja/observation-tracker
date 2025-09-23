"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, ArrowRight, LogOut, User, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Project } from "@/types/observation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

function DateSelectorPageContent() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [selectedAgency, setSelectedAgency] = useState<string>("");
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
      // If user is not logged in, redirect to login
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const projectId = searchParams.get("project");
    if (projectId && user) {
      loadProject(projectId);
    } else if (!projectId) {
      // No project selected, redirect to projects
      router.push("/projects");
    }
  }, [searchParams, user, router]);

  const loadProject = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;

      setProject(data);
      // Set first agency as default if available
      if (data.agencies && data.agencies.length > 0) {
        setSelectedAgency(data.agencies[0]);
      }
    } catch (error) {
      console.error("Error loading project:", error);
      alert("Error al cargar proyecto");
      router.push("/projects");
    } finally {
      setIsLoadingProject(false);
    }
  };

  const handleContinue = () => {
    if (project && selectedAgency) {
      // Navigate to session registration with the selected date, project, and agency
      router.push(
        `/sessions?date=${selectedDate}&project=${
          project.id
        }&agency=${encodeURIComponent(selectedAgency)}`
      );
    }
  };

  const handleBackToProjects = () => {
    router.push("/projects");
  };

  if (authLoading || isLoadingProject) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando proyecto...</p>
        </div>
      </div>
    );
  }

  if (!user || !project) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/50 to-background">
      {/* Page Header */}
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={handleBackToProjects}
              variant="ghost"
              size="sm"
              className="flex items-center justify-center w-10 h-10 p-0"
            >
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-xl sm:text-2xl font-semibold text-center flex-1">
              {project.name}
            </h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] sm:min-h-[70vh]">
          <Card className="w-full max-w-sm sm:max-w-lg lg:max-w-2xl">
            <CardHeader className="text-center space-y-3 sm:space-y-4 pb-3 sm:pb-6">
              <div className="mx-auto h-10 w-10 sm:h-12 sm:w-12 bg-primary rounded-full flex items-center justify-center">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-lg sm:text-xl lg:text-2xl">
                Seleccionar Fecha
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-6">
              {/* Large Date Selector */}
              <div className="space-y-2">
                <label htmlFor="date-selector-input" className="text-sm font-medium text-gray-700">
                  Fecha
                </label>
                <input
                  id="date-selector-input"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {/* Agency Selector */}
              {project.agencies && project.agencies.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Agencia
                  </label>
                  <Select
                    value={selectedAgency}
                    onValueChange={setSelectedAgency}
                  >
                    <SelectTrigger className="w-full">
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
              <Button
                onClick={handleContinue}
                disabled={
                  project.agencies &&
                  project.agencies.length > 0 &&
                  !selectedAgency
                }
                className="w-full flex items-center gap-2 h-10 sm:h-11"
                size="lg"
              >
                <span className="text-sm sm:text-base">
                  Continuar a Sesiones
                </span>
                <ArrowRight size={16} />
              </Button>
            </CardContent>
          </Card>
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
            <p className="text-muted-foreground">
              Cargando selector de fecha...
            </p>
          </div>
        </div>
      }
    >
      <DateSelectorPageContent />
    </Suspense>
  );
}
