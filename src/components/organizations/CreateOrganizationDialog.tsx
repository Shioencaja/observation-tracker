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
import { createOrganization } from "@/lib/auth-utils-orgs";
import { OrganizationWithAccess } from "@/types/supabase-orgs";

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrganizationCreated: (organization: OrganizationWithAccess) => void;
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
  onOrganizationCreated,
}: CreateOrganizationDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la organización es requerido",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const result = await createOrganization(
        name.trim(),
        description.trim() || undefined
      );

      if (result.success && result.organizationId) {
        // Create a temporary organization object for the callback
        const newOrg: OrganizationWithAccess = {
          id: result.organizationId,
          name: name.trim(),
          slug: name
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, ""),
          description: description.trim() || null,
          logo_url: null,
          website_url: null,
          status: "active",
          settings: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_role: "owner",
          user_joined_at: new Date().toISOString(),
          member_count: 1,
          project_count: 0,
        };

        onOrganizationCreated(newOrg);

        toast({
          title: "Organización creada",
          description: `${name} ha sido creada exitosamente`,
        });

        // Reset form
        setName("");
        setDescription("");
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al crear la organización",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating organization:", error);
      toast({
        title: "Error",
        description: "Error inesperado al crear la organización",
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
            <DialogTitle>Crear Nueva Organización</DialogTitle>
            <DialogDescription>
              Crea una nueva organización para gestionar proyectos y colaborar
              con tu equipo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre de la organización *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mi Organización"
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
                placeholder="Describe el propósito de tu organización..."
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
              {isCreating ? "Creando..." : "Crear Organización"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


