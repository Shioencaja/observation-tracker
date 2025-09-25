"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
  Plus,
  Building2,
  Users,
  FolderOpen,
  Settings,
  ArrowRight,
} from "lucide-react";
import { OrganizationWithAccess } from "@/types/supabase-orgs";
import { getUserOrganizations, redirectToLogin } from "@/lib/auth-utils-orgs";
import { FullPageLoading } from "@/components/LoadingSpinner";
import { CreateOrganizationDialog } from "@/components/organizations/CreateOrganizationDialog";

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrganizationWithAccess[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if user is authenticated
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        redirectToLogin();
        return;
      }

      const orgs = await getUserOrganizations();
      setOrganizations(orgs);
    } catch (err) {
      console.error("Error loading organizations:", err);
      setError("Error al cargar las organizaciones");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrganizationClick = (org: OrganizationWithAccess) => {
    router.push(`/org/${org.slug}`);
  };

  const handleCreateOrganization = () => {
    setShowCreateDialog(true);
  };

  const handleOrganizationCreated = (newOrg: OrganizationWithAccess) => {
    setOrganizations((prev) => [newOrg, ...prev]);
    setShowCreateDialog(false);
  };

  if (isLoading) {
    return <FullPageLoading text="Cargando organizaciones..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadOrganizations}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Organizaciones
              </h1>
              <p className="text-muted-foreground">
                Gestiona tus organizaciones y accede a sus proyectos
              </p>
            </div>
            <Button
              onClick={handleCreateOrganization}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Crear Organización
            </Button>
          </div>
        </div>

        {/* Organizations Grid */}
        {organizations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((org) => (
              <Card
                key={org.id}
                className="cursor-pointer hover:shadow-lg transition-shadow border-gray-200"
                onClick={() => handleOrganizationClick(org)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{org.name}</CardTitle>
                        <CardDescription className="text-sm">
                          @{org.slug}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant={
                        org.user_role === "owner" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {org.user_role === "owner"
                        ? "Propietario"
                        : org.user_role === "admin"
                        ? "Administrador"
                        : org.user_role === "member"
                        ? "Miembro"
                        : "Visualizador"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{org.member_count} miembros</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FolderOpen className="h-4 w-4" />
                        <span>{org.project_count} proyectos</span>
                      </div>
                    </div>

                    {/* Description */}
                    {org.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {org.description}
                      </p>
                    )}

                    {/* Join date */}
                    <p className="text-xs text-muted-foreground">
                      Te uniste el{" "}
                      {new Date(org.user_joined_at).toLocaleDateString(
                        "es-ES",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>

                    {/* Action indicator */}
                    <div className="flex items-center justify-end pt-2">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="h-24 w-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <Building2 className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              No tienes organizaciones
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Crea tu primera organización para comenzar a gestionar proyectos y
              colaborar con tu equipo.
            </p>
            <Button
              onClick={handleCreateOrganization}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Crear Primera Organización
            </Button>
          </div>
        )}
      </div>

      {/* Create Organization Dialog */}
      <CreateOrganizationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onOrganizationCreated={handleOrganizationCreated}
      />
    </div>
  );
}


