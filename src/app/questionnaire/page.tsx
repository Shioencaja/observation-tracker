"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Calendar, Users, Loader2 } from "lucide-react";
import { Project } from "@/types/observation";
import { useToastManager } from "@/hooks/use-toast-manager";
import { ToastContainer } from "@/components/ui/toast";

function QuestionnaireContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");
  const { toasts, handleError, showSuccess, removeToast } = useToastManager();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    alias: "",
    agency: "",
    start_time: new Date().toISOString().slice(0, 16), // Current date/time
    description: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && projectId) {
      loadProject();
    }
  }, [user, projectId]);

  const loadProject = async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) {
        console.error("Error loading project:", error);
        router.push("/projects");
        return;
      }

      setProject(data);
    } catch (error) {
      console.error("Error loading project:", error);
      router.push("/projects");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateSession = async () => {
    if (
      !user ||
      !projectId ||
      !formData.alias.trim() ||
      !formData.agency.trim()
    ) {
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from("sessions")
        .insert({
          project_id: projectId,
          alias: formData.alias.trim(),
          agency: formData.agency.trim(),
          start_time: formData.start_time,
          description: formData.description.trim() || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        handleError(error, "Error al crear la sesión");
        return;
      }

      // Redirect to the session details page
      showSuccess("Sesión creada exitosamente");
      router.push(`/${projectId}/sessions/${data.id}`);
    } catch (error) {
      handleError(error, "Error al crear la sesión");
    } finally {
      setIsCreating(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            Proyecto no encontrado
          </h2>
          <p className="text-gray-500 mb-4">
            El proyecto solicitado no existe o no tienes acceso.
          </p>
          <Button onClick={() => router.push("/projects")}>
            Volver a Proyectos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => router.push(`/${projectId}/sessions`)}
            variant="ghost"
            size="sm"
            className="mb-6 p-0 h-auto text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={16} className="mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">Nueva Sesión</h1>
          <p className="text-gray-500 text-sm mt-1">{project.name}</p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Session Alias */}
          <div>
            <Label className="text-sm font-medium text-gray-700">
              Nombre de la Sesión *
            </Label>
            <Input
              value={formData.alias}
              onChange={(e) => handleInputChange("alias", e.target.value)}
              placeholder="Ej: Sesión matutina, Entrevista inicial..."
              className="mt-2 border-gray-200 focus:border-gray-400 focus:ring-gray-400"
            />
          </div>

          {/* Agency */}
          <div>
            <Label className="text-sm font-medium text-gray-700">
              Agencia *
            </Label>
            <Select
              value={formData.agency}
              onValueChange={(value) => handleInputChange("agency", value)}
            >
              <SelectTrigger className="mt-2 border-gray-200 focus:border-gray-400 focus:ring-gray-400">
                <SelectValue placeholder="Seleccionar agencia..." />
              </SelectTrigger>
              <SelectContent>
                {project.agencies?.map((agency) => (
                  <SelectItem key={agency} value={agency}>
                    {agency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Time */}
          <div>
            <Label className="text-sm font-medium text-gray-700">
              Fecha y Hora de Inicio *
            </Label>
            <Input
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) => handleInputChange("start_time", e.target.value)}
              className="mt-2 border-gray-200 focus:border-gray-400 focus:ring-gray-400"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm font-medium text-gray-700">
              Descripción
            </Label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Descripción de la sesión (opcional)"
              className="mt-2 border-gray-200 focus:border-gray-400 focus:ring-gray-400 resize-none"
              rows={3}
            />
          </div>

          {/* Create Button */}
          <div className="pt-6 border-t border-gray-100">
            <Button
              onClick={handleCreateSession}
              disabled={
                !formData.alias.trim() ||
                !formData.agency.trim() ||
                !formData.start_time ||
                isCreating
              }
              className="w-full bg-gray-900 hover:bg-gray-800 text-white"
              size="lg"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando sesión...
                </>
              ) : (
                "Crear Sesión"
              )}
            </Button>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default function QuestionnairePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Cargando...</p>
          </div>
        </div>
      }
    >
      <QuestionnaireContent />
    </Suspense>
  );
}
