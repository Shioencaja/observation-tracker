"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { ProjectWithAccess, Tables } from "@/types/supabase-orgs";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onProjectCreated: (project: ProjectWithAccess) => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  organizationId,
  onProjectCreated,
}: CreateProjectDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del proyecto es requerido",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        toast({
          title: "Error",
          description: "Usuario no autenticado",
          variant: "destructive",
        });
        return;
      }

      // Create project
      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          organization_id: organizationId,
          name: name.trim(),
          description: description.trim() || null,
          created_by: user.id,
          status: "active",
        })
        .select(
          `
          *,
          organizations (*)
        `
        )
        .single();

      if (error) {
        console.error("Error creating project:", error);
        toast({
          title: "Error",
          description: error.message || "Error al crear el proyecto",
          variant: "destructive",
        });
        return;
      }

      // Create project access for the creator
      const { error: accessError } = await supabase
        .from("project_users")
        .insert({
          project_id: project.id,
          user_id: user.id,
          role: "owner",
          added_by: user.id,
        });

      if (accessError) {
        console.error("Error creating project access:", accessError);
        // Don't fail the whole operation for this
      }

      // Create project with access info
      const projectWithAccess: ProjectWithAccess = {
        ...project,
        organization: project.organizations as Tables<"organizations">,
        user_role: "owner",
        session_count: 0,
        can_edit: true,
        can_delete: true,
      };

      onProjectCreated(projectWithAccess);

      toast({
        title: "Proyecto creado",
        description: `${name} ha sido creado exitosamente`,
      });

      // Reset form
      setName("");
      setDescription("");
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description: "Error inesperado al crear el proyecto",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setName("");
      setDescription("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
            <DialogDescription>
              Crea un nuevo proyecto dentro de esta organización.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre del proyecto *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mi Proyecto de Observación"
                disabled={isCreating}
                className="border-gray-200 focus:border-gray-400 focus:ring-gray-400"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el propósito y objetivos de este proyecto..."
                disabled={isCreating}
                rows={3}
                className="border-gray-200 focus:border-gray-400 focus:ring-gray-400"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Creando..." : "Crear Proyecto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


