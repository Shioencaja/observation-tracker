"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { FullPageLoading } from "@/components/LoadingSpinner";
import { usePagination } from "@/hooks/use-pagination";
import { useProjectRole } from "@/hooks/use-project-role";
import { useSessionsData } from "@/hooks/use-sessions-data";
import { useSessionsFilter } from "@/hooks/use-sessions-filter";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ToastContainer } from "@/components/ui/toast";
import { PaginationWrapper } from "@/components/ui/pagination-wrapper";
import { SessionsHeader } from "@/components/sessions/SessionsHeader";
import { SearchAndFilters } from "@/components/sessions/SearchAndFilters";
import { SessionsTable } from "@/components/sessions/SessionsTable";
import { SessionsCards } from "@/components/sessions/SessionsCards";
import { EmptySessionsState } from "@/components/sessions/EmptySessionsState";
import { ErrorDisplay } from "@/components/sessions/ErrorDisplay";
import { ProjectNotFoundDisplay } from "@/components/sessions/ProjectNotFoundDisplay";
import { CSVExportService } from "@/services/csv-export-service";
import { SessionsService } from "@/services/sessions-service";

export default function SessionsPage() {
  return (
    <Suspense fallback={<FullPageLoading text="Cargando sesiones..." />}>
      <SessionsContent />
    </Suspense>
  );
}

function SessionsContent() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      message: string;
      type: "success" | "error" | "info" | "warning";
    }>
  >([]);

  // Data loading hook
  const {
    user,
    authLoading,
    project,
    sessions,
    isLoading,
    error,
    reload,
    clearCache,
  } = useSessionsData(projectId);

  // Filtering hook
  const {
    searchTerm,
    setSearchTerm,
    activeSearchTerm,
    selectedAgency,
    selectedDate,
    setSelectedAgency,
    setSelectedDate,
    filteredSessions,
    uniqueAgencies,
    uniqueDates,
    handleSearch,
    handleClearSearch,
    handleClearFilters,
  } = useSessionsFilter(sessions);

  // Get user role for the project
  const { role } = useProjectRole(
    projectId,
    user?.id || "",
    project?.created_by || ""
  );

  // Check if user can export (creator or admin)
  const canExport = role === "creator" || role === "admin";

  // Pagination for sessions
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedSessions,
    goToPage,
  } = usePagination({
    data: filteredSessions,
    itemsPerPage: 6,
  });

  // Helper function to show toasts
  const showToast = (
    message: string,
    type: "success" | "error" | "info" | "warning" = "info"
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Handle session click
  const handleSessionClick = (sessionId: string) => {
    router.push(`/${projectId}/sessions/${sessionId}`);
  };

  // Handle session deletion
  const handleDeleteSession = (sessionId: string) => {
    // Check if user is the project creator
    if (user?.id !== project?.created_by) {
      showToast("No tienes permisos para eliminar sesiones", "error");
      return;
    }

    setSessionToDelete(sessionId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete || !user || !project) return;

    try {
      await SessionsService.deleteSession(sessionToDelete, project.id);
      clearCache();
      await reload();
      showToast(
        "Sesión finalizada y eliminada exitosamente junto con todas sus observaciones",
        "success"
      );
    } catch (error) {
      console.error("Error deleting session:", error);
      if (error instanceof Error) {
        showToast(`Error: ${error.message}`, "error");
      } else {
        showToast(
          "Error inesperado al eliminar la sesión. Intenta nuevamente.",
          "error"
        );
      }
    } finally {
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    }
  };

  // Handle session export
  const handleExportSession = async (sessionId: string) => {
    if (!canExport) {
      showToast("No tienes permisos para exportar sesiones", "error");
      return;
    }

    try {
      await CSVExportService.exportSession(sessionId, projectId);
      showToast("Sesión exportada exitosamente", "success");
    } catch (error) {
      console.error("Error exporting session:", error);
      if (error instanceof Error) {
        showToast(`Error: ${error.message}`, "error");
      } else {
        showToast("Error al exportar la sesión", "error");
      }
    }
  };

  // Handle export all sessions
  const handleExportAllSessions = async () => {
    if (!canExport) {
      showToast("No tienes permisos para exportar sesiones", "error");
      return;
    }

    if (filteredSessions.length === 0) {
      showToast("No hay sesiones para exportar", "warning");
      return;
    }

    try {
      await CSVExportService.exportAllSessions(
        filteredSessions,
        projectId,
        project?.name || "proyecto"
      );
      showToast(
        `Exportadas ${filteredSessions.length} sesiones exitosamente`,
        "success"
      );
    } catch (error) {
      console.error("Error exporting sessions:", error);
      if (error instanceof Error) {
        showToast(`Error: ${error.message}`, "error");
      } else {
        showToast("Error al exportar las sesiones", "error");
      }
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    clearCache();
    reload();
  };

  if (isLoading || authLoading) {
    return <FullPageLoading text="Cargando sesiones..." />;
  }

  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={() => {
          clearCache();
          reload();
        }}
      />
    );
  }

  if (!project) {
    return <ProjectNotFoundDisplay projectId={projectId} />;
  }

  const hasActiveFilters =
    selectedAgency !== "all" ||
    selectedDate !== "all" ||
    activeSearchTerm !== "";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Header */}
        <SessionsHeader
          projectName={project.name}
          isLoading={isLoading}
          onRefresh={handleRefresh}
        />

        {/* Search and Filters */}
        <SearchAndFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          onClearSearch={handleClearSearch}
          selectedAgency={selectedAgency}
          selectedDate={selectedDate}
          onAgencyChange={setSelectedAgency}
          onDateChange={setSelectedDate}
          uniqueAgencies={uniqueAgencies}
          uniqueDates={uniqueDates}
          onClearFilters={handleClearFilters}
          canExport={canExport}
          onExportAll={handleExportAllSessions}
          filteredCount={filteredSessions.length}
          totalCount={sessions.length}
          filtersOpen={filtersOpen}
          onFiltersOpenChange={setFiltersOpen}
        />

        {/* Sessions List */}
        <div className="space-y-3 sm:space-y-6">
          {sessions.length > 0 ? (
            <>
              {/* Mobile Card Layout */}
              <SessionsCards
                sessions={paginatedSessions}
                projectCreatorId={project.created_by}
                userId={user?.id || ""}
                canExport={canExport}
                onSessionClick={handleSessionClick}
                onExport={handleExportSession}
                onDelete={handleDeleteSession}
              />

              {/* Desktop Table Layout */}
              <SessionsTable
                sessions={paginatedSessions}
                projectCreatorId={project.created_by}
                userId={user?.id || ""}
                canExport={canExport}
                onSessionClick={handleSessionClick}
                onExport={handleExportSession}
                onDelete={handleDeleteSession}
                itemsPerPage={6}
              />
            </>
          ) : (
            <EmptySessionsState
              hasFilters={hasActiveFilters}
              projectId={projectId}
            />
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-3 sm:mt-6">
            <PaginationWrapper
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
            />
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Eliminar sesión"
        description="¿Estás seguro de que quieres eliminar esta sesión? Esta acción también eliminará todas las observaciones y grabaciones de voz asociadas. Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDeleteSession}
        variant="destructive"
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
