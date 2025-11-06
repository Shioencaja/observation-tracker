"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToastManager } from "@/hooks/use-toast-manager";
import { useDateSessionsUrl } from "@/hooks/use-date-sessions-url";
import { useDateSessionsData } from "@/hooks/use-date-sessions-data";
import { useDateSessionsState } from "@/hooks/use-date-sessions-state";
import { useDateSessionsActions } from "@/hooks/use-date-sessions-actions";
import { calculateUnfinishedCount } from "@/lib/date-sessions-utils";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ToastContainer } from "@/components/ui/toast";
import {
  DateSessionsLoading,
  DateSessionsError,
  FinishedProjectDisplay,
  DateSessionsHeader,
  SessionsSection,
  QuestionnaireSection,
} from "@/components/date-sessions";

export default function DateSessionsPage() {
  return (
    <Suspense fallback={<DateSessionsLoading />}>
      <DateSessionsPageContent />
    </Suspense>
  );
}

function DateSessionsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const selectedDate = params.date as string;

  const { toasts, showToast, removeToast } = useToastManager();
  const { sessionFromUrl, agencyFromUrl, updateUrlWithSession } =
    useDateSessionsUrl();

  const {
    project,
    observationOptions,
    sessions,
    isLoading,
    isLoadingProject,
    error,
    loadSessions,
  } = useDateSessionsData(
    projectId,
    selectedDate,
    agencyFromUrl || "",
    user?.id || null,
    !authLoading && !!user
  );

  const {
    selectedSessionId,
    sessionsTableOpen,
    hasAutoSelected,
    handleSessionSelect,
    setSessionsTableOpen,
    markAutoSelected,
  } = useDateSessionsState(sessions, sessionFromUrl, updateUrlWithSession);

  const {
    createNewSession,
    finishSession,
    deleteSession,
    isCreatingSession,
    isFinishingSession,
    isDeletingSession,
    canCreateSession,
    canDeleteSession,
  } = useDateSessionsActions(
    project,
    user?.id || null,
    projectId,
    selectedDate,
    agencyFromUrl || "",
    observationOptions,
    loadSessions,
    showToast
  );

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  // Load sessions when dependencies are ready
  useEffect(() => {
    if (!authLoading && user && project && selectedDate) {
      loadSessions();
    }
  }, [authLoading, user, project, selectedDate, agencyFromUrl, loadSessions]);

  // Mark auto-selected after first load
  useEffect(() => {
    if (sessions.length > 0 && !hasAutoSelected && selectedSessionId) {
      markAutoSelected();
    }
  }, [sessions, hasAutoSelected, selectedSessionId, markAutoSelected]);

  // Handle redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Handle session creation - select the new session
  const handleCreateSession = async () => {
    const newSessionId = await createNewSession();
    if (newSessionId) {
      handleSessionSelect(newSessionId);
    }
  };

  // Handle session deletion
  const handleDeleteSessionClick = (sessionId: string) => {
    if (!canDeleteSession) {
      showToast("No tienes permisos para eliminar sesiones", "error");
      return;
    }
    setSessionToDelete(sessionId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;

    // Clear selected session if it's the one being deleted
    if (selectedSessionId === sessionToDelete) {
      handleSessionSelect(null);
    }

    await deleteSession(sessionToDelete);
    setDeleteDialogOpen(false);
    setSessionToDelete(null);
  };

  // Handle finish session
  const handleFinishSession = async () => {
    if (!selectedSessionId) return;
    await finishSession(selectedSessionId);
  };

  // Handle back navigation
  const handleBack = () => {
    router.push(`/${projectId}/select-date`);
  };

  // Loading states
  if (authLoading || isLoadingProject || isLoading) {
    return <DateSessionsLoading />;
  }

  if (!user) {
    return null; // Will redirect to login
  }

  if (error || !project) {
    return (
      <DateSessionsError
        error={error || "Proyecto no encontrado"}
        onBack={handleBack}
        onRetry={loadSessions}
      />
    );
  }

  // Check if project is finished and user is not creator
  if (project.is_finished && user.id !== project.created_by) {
    return <FinishedProjectDisplay projectName={project.name} />;
  }

  const unfinishedCount = calculateUnfinishedCount(sessions);
  const isProjectCreator = user.id === project.created_by;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <DateSessionsHeader
          project={project}
          selectedDate={selectedDate}
          selectedAgency={agencyFromUrl}
          onBack={handleBack}
        />

        <div className="space-y-6">
          <SessionsSection
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            unfinishedCount={unfinishedCount}
            isOpen={sessionsTableOpen}
            isCreatingSession={isCreatingSession}
            canCreateSession={canCreateSession}
            isProjectCreator={isProjectCreator}
            onOpenChange={setSessionsTableOpen}
            onSessionSelect={handleSessionSelect}
            onCreateSession={handleCreateSession}
            onDeleteSession={handleDeleteSessionClick}
          />

          <QuestionnaireSection
            selectedSessionId={selectedSessionId}
            sessions={sessions}
            observationOptions={observationOptions}
            projectId={projectId}
            isDeletingSession={isDeletingSession}
            isProjectFinished={project.is_finished === true}
            onCreateSession={handleCreateSession}
            isCreatingSession={isCreatingSession}
            onFinishSession={handleFinishSession}
          />
        </div>
      </div>

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Eliminar Sesión"
        description="¿Estás seguro de que quieres eliminar esta sesión? Esta acción eliminará la sesión, todas sus observaciones y grabaciones de voz de forma permanente."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDeleteSession}
        variant="destructive"
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
