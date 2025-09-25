"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
  Settings,
  ArrowLeft,
  FolderOpen,
  Calendar,
  UserPlus,
} from "lucide-react";
import {
  OrganizationWithAccess,
  ProjectWithAccess,
  Tables,
} from "@/types/supabase-orgs";
import {
  validateOrganizationAccess,
  getUserOrganizationRole,
  canManageOrganization,
  canInviteMembers,
  redirectToLogin,
  redirectToOrganizations,
} from "@/lib/auth-utils-orgs";
import { FullPageLoading } from "@/components/LoadingSpinner";
import { CreateProjectDialog } from "@/components/organizations/CreateProjectDialog";

export default function OrganizationPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [organization, setOrganization] =
    useState<Tables<"organizations"> | null>(null);
  const [projects, setProjects] = useState<ProjectWithAccess[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);

  useEffect(() => {
    if (slug) {
      loadOrganization();
    }
  }, [slug]);

  const loadOrganization = async () => {
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

      // Get organization by slug
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("slug", slug)
        .single();

      if (orgError || !org) {
        setError("Organización no encontrada");
        return;
      }

      // Validate user access
      const accessValidation = await validateOrganizationAccess(org.id);
      if (!accessValidation.hasAccess) {
        setError(
          accessValidation.error || "No tienes acceso a esta organización"
        );
        return;
      }

      setOrganization(org);

      // Get user role
      const role = await getUserOrganizationRole(org.id);
      setUserRole(role);

      // Load projects
      await loadProjects(org.id);
    } catch (err) {
      console.error("Error loading organization:", err);
      setError("Error al cargar la organización");
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjects = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select(
          `
          *,
          organizations (*)
        `
        )
        .eq("organization_id", orgId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading projects:", error);
        return;
      }

      // Get session counts for each project
      const projectsWithCounts = await Promise.all(
        (data || []).map(async (project) => {
          const { count: sessionCount } = await supabase
            .from("sessions")
            .select("*", { count: "exact", head: true })
            .eq("project_id", project.id);

          const projectWithAccess: ProjectWithAccess = {
            ...project,
            organization: project.organizations as Tables<"organizations">,
            user_role: "member" as const, // This would be determined by actual project access
            session_count: sessionCount || 0,
            can_edit: canManageOrganization(userRole as any),
            can_delete: userRole === "owner",
          };

          return projectWithAccess;
        })
      );

      setProjects(projectsWithCounts);
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  };

  const handleProjectClick = (project: ProjectWithAccess) => {
    router.push(`/org/${slug}/projects/${project.id}`);
  };

  const handleCreateProject = () => {
    setShowCreateProject(true);
  };

  const handleProjectCreated = (newProject: ProjectWithAccess) => {
    setProjects((prev) => [newProject, ...prev]);
    setShowCreateProject(false);
  };

  if (isLoading) {
    return <FullPageLoading text="Cargando organización..." />;
  }

  if (error || !organization) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/organizations")}>
              Volver a Organizaciones
            </Button>
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
          <div className="flex items-center gap-4 mb-6">
            <Button
              onClick={() => router.push("/organizations")}
              variant="ghost"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {organization.name}
                </h1>
                <p className="text-muted-foreground mb-2">
                  @{organization.slug}
                </p>
                {organization.description && (
                  <p className="text-muted-foreground">
                    {organization.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={userRole === "owner" ? "default" : "secondary"}>
                {userRole === "owner"
                  ? "Propietario"
                  : userRole === "admin"
                  ? "Administrador"
                  : userRole === "member"
                  ? "Miembro"
                  : "Visualizador"}
              </Badge>
              {canManageOrganization(userRole as any) && (
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Configuración
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Proyectos</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects.length}</div>
              <p className="text-xs text-muted-foreground">Proyectos activos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sesiones</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projects.reduce((sum, p) => sum + p.session_count, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Total de sesiones</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Miembros</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Miembros del equipo
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Projects Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Proyectos</h2>
              <p className="text-muted-foreground">
                Gestiona los proyectos de esta organización
              </p>
            </div>
            {canManageOrganization(userRole as any) && (
              <Button
                onClick={handleCreateProject}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nuevo Proyecto
              </Button>
            )}
          </div>

          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow border-gray-200"
                  onClick={() => handleProjectClick(project)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FolderOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {project.name}
                          </CardTitle>
                          {project.description && (
                            <CardDescription className="text-sm">
                              {project.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {project.session_count} sesiones
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        Creado el{" "}
                        {new Date(project.created_at || "").toLocaleDateString(
                          "es-ES"
                        )}
                      </span>
                      <span>→</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <FolderOpen className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No hay proyectos</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {canManageOrganization(userRole as any)
                  ? "Crea tu primer proyecto para comenzar a hacer observaciones."
                  : "No hay proyectos disponibles en esta organización."}
              </p>
              {canManageOrganization(userRole as any) && (
                <Button
                  onClick={handleCreateProject}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Crear Primer Proyecto
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Team Section (placeholder) */}
        {canManageOrganization(userRole as any) && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Equipo</h2>
                <p className="text-muted-foreground">
                  Gestiona los miembros de tu organización
                </p>
              </div>
              {canInviteMembers(userRole as any) && (
                <Button variant="outline" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Invitar Miembro
                </Button>
              )}
            </div>
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">
                    Gestión de miembros
                  </h3>
                  <p className="text-muted-foreground">
                    Próximamente: Invita miembros y gestiona roles
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        organizationId={organization.id}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
}


