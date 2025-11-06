"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  LogOut,
  Users,
  Calendar,
  FolderOpen,
  Settings,
  Search,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { projectService, ProjectWithAccess } from "@/services/project-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationWrapper } from "@/components/ui/pagination-wrapper";
import { FullPageLoading, TableSkeleton } from "@/components/loading";
import { usePagination } from "@/hooks/use-pagination";
import { Badge } from "@/components/ui/badge";
import { useToastManager } from "@/hooks/use-toast-manager";
import { ToastContainer } from "@/components/ui/toast";
import { useDebounce } from "@/hooks/use-debounce";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useAsyncOperation } from "@/hooks/use-async-operation";

/**
 * Projects Page Component
 * Displays a list of projects with search, pagination, and project management features
 * @returns {JSX.Element} The projects page component
 */
export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithAccess[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { toasts, handleError, removeToast } = useToastManager();

  // Require authentication
  const { isLoading: authLoading } = useRequireAuth();

  // Async operation hook for loading projects
  const {
    isLoading,
    execute: executeAsync,
  } = useAsyncOperation<ProjectWithAccess[]>({
    onError: (error) => {
      handleError(error, "Error al cargar los proyectos");
    },
  });

  // Debounce search term to avoid filtering on every keystroke
  const activeSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  const loadProjects = async () => {
    if (!user) return;

    await executeAsync(async () => {
      const { data, error } = await projectService.getProjectsByUserAccess(
        user.id
      );

      if (error) {
        // Error is handled by useAsyncOperation hook
        throw error;
      }

      setProjects(data || []);
      return data || [];
    });
  };

  const handleProjectSelect = (projectId: string) => {
    router.push(`/${projectId}/select-date`);
  };

  const handleSessionsClick = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/${projectId}/sessions`);
  };

  // Search is now automatic via debounce
  const handleClearSearch = () => {
    setSearchTerm("");
    // activeSearchTerm will automatically update via debounce
  };

  // Memoize filtered projects to avoid recalculating on every render
  const filteredProjects = useMemo(() => {
    if (!activeSearchTerm) {
      return projects;
    }
    const searchLower = activeSearchTerm.toLowerCase();
    return projects.filter((projectWithAccess) =>
      projectWithAccess.project.name.toLowerCase().includes(searchLower)
    );
  }, [projects, activeSearchTerm]);

  // Pagination for filtered projects
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedProjects,
    goToPage,
  } = usePagination({
    data: filteredProjects,
    itemsPerPage: 10,
  });

  if (authLoading || isLoading) {
    return <FullPageLoading text="Cargando proyectos..." />;
  }

  if (!user) {
    return <FullPageLoading text="Redirigiendo..." />;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">
            Proyectos
          </h1>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative w-full sm:w-80">
              <Input
                placeholder="Buscar proyectos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 border-gray-200 focus:border-gray-400 focus:ring-gray-400"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                {searchTerm && (
                  <button
                    onClick={handleClearSearch}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                    title="Limpiar búsqueda"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <Button
              onClick={() => router.push("/create-project")}
              className="flex items-center gap-2 w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white"
            >
              <Plus className="h-4 w-4" />
              Nuevo Proyecto
            </Button>
          </div>
        </div>

        {/* Content */}
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tienes proyectos aún
            </h3>
            <p className="text-gray-500 text-center mb-6">
              Crea tu primer proyecto para comenzar a realizar observaciones y
              entrevistas.
            </p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron proyectos
            </h3>
            <p className="text-gray-500 text-center mb-6">
              No hay proyectos que coincidan con "{activeSearchTerm}". Intenta
              con otro término de búsqueda.
            </p>
            <Button
              variant="outline"
              onClick={handleClearSearch}
              className="flex items-center gap-2"
            >
              Limpiar búsqueda
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <div className="rounded-md border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-2/5">Nombre</TableHead>
                      <TableHead className="w-20">Sesiones</TableHead>
                      <TableHead className="w-32">Fecha de Creación</TableHead>
                      <TableHead className="w-24 text-right">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProjects.map((projectWithAccess) => (
                      <TableRow
                        key={projectWithAccess.project.id}
                        className="cursor-pointer hover:bg-gray-50 h-12"
                        onClick={() =>
                          handleProjectSelect(projectWithAccess.project.id)
                        }
                      >
                        <TableCell className="font-medium w-2/5">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                projectWithAccess.project.is_finished
                                  ? "bg-gray-400"
                                  : "bg-green-500"
                              }`}
                              title={
                                projectWithAccess.project.is_finished
                                  ? "Finalizado"
                                  : "En curso"
                              }
                            />
                            <div
                              className="truncate"
                              title={projectWithAccess.project.name}
                            >
                              {projectWithAccess.project.name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="w-20">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {projectWithAccess.project.session_count}
                          </span>
                        </TableCell>
                        <TableCell className="w-32">
                          <span className="text-sm">
                            {new Date(
                              projectWithAccess.project.created_at
                            ).toLocaleDateString("es-ES")}
                          </span>
                        </TableCell>
                        <TableCell className="w-24">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) =>
                                handleSessionsClick(
                                  projectWithAccess.project.id,
                                  e
                                )
                              }
                              className="h-8 w-8 p-0"
                              title="Sesiones"
                              aria-label={`Ver sesiones de ${projectWithAccess.project.name}`}
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-1">
                              {/* Dashboard button hidden as requested */}
                              {/* <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(
                                    `/${projectWithAccess.project.id}/dashboard`
                                  );
                                }}
                                className="h-8 w-8 p-0"
                                title="Dashboard"
                              >
                                <BarChart3 className="h-4 w-4" />
                              </Button> */}
                              {(user?.id === projectWithAccess.project.created_by ||
                                projectWithAccess.access_level === "admin") && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(
                                      `/${projectWithAccess.project.id}/settings`
                                    );
                                  }}
                                  className="h-8 w-8 p-0"
                                  title="Configuración"
                                  aria-label={`Configurar proyecto ${projectWithAccess.project.name}`}
                                >
                                  <Settings className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Fill remaining rows to maintain fixed height */}
                    {Array.from({
                      length: Math.max(0, 10 - paginatedProjects.length),
                    }).map((_, index) => (
                      <TableRow key={`empty-${index}`} className="h-12">
                        <TableCell colSpan={4} className="h-12"></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="block sm:hidden space-y-3">
              {paginatedProjects.map((projectWithAccess) => (
                <div
                  key={projectWithAccess.project.id}
                  className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() =>
                    handleProjectSelect(projectWithAccess.project.id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            projectWithAccess.project.is_finished
                              ? "bg-gray-400"
                              : "bg-green-500"
                          }`}
                          title={
                            projectWithAccess.project.is_finished
                              ? "Finalizado"
                              : "En curso"
                          }
                        />
                        <h3
                          className="font-medium text-sm truncate"
                          title={projectWithAccess.project.name}
                        >
                          {projectWithAccess.project.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {projectWithAccess.project.session_count} sesiones
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(
                            projectWithAccess.project.created_at
                          ).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) =>
                          handleSessionsClick(projectWithAccess.project.id, e)
                        }
                        className="h-8 w-8 p-0"
                        title="Sesiones"
                        aria-label={`Ver sesiones de ${projectWithAccess.project.name}`}
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      {/* Dashboard button hidden as requested */}
                      {/* <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(
                            `/${projectWithAccess.project.id}/dashboard`
                          );
                        }}
                        className="h-8 w-8 p-0"
                        title="Dashboard"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button> */}
                      {(user?.id === projectWithAccess.project.created_by ||
                        projectWithAccess.access_level === "admin") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(
                              `/${projectWithAccess.project.id}/settings`
                            );
                          }}
                          className="h-8 w-8 p-0"
                          title="Configuración"
                          aria-label={`Configurar proyecto ${projectWithAccess.project.name}`}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        <div className="mt-6">
          <PaginationWrapper
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
