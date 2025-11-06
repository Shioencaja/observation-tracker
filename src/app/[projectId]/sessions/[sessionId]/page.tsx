"use client";

import React, { useState, Suspense } from "react";
import { useParams } from "next/navigation";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ToastContainer } from "@/components/ui/toast";

import { useSessionAuth } from "@/hooks/use-session-auth";
import { useSessionDetailsData } from "@/hooks/use-session-details-data";
import { useSessionNavigation } from "@/hooks/use-session-navigation";
import { useSessionActions } from "@/hooks/use-session-actions";
import { useToastManager } from "@/hooks/use-toast-manager";

import {
  SessionDetailsHeader,
  SessionNavigation,
  SessionActions,
  SessionInfoCard,
  ObservationsList,
  SessionInfoDrawer,
  SessionDetailsLoading,
  SessionDetailsError,
  AuthErrorDisplay,
} from "@/components/session-details";

function SessionDetailsContent() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const projectId = params.projectId as string;

  const { toasts, showToast, removeToast } = useToastManager();

  const {
    currentUser,
    currentLoading,
    isLoading: isValidatingAuth,
    hasAccess,
    authError,
    project,
    session: authSession,
  } = useSessionAuth(projectId, sessionId);

  // Determine if we should load data - only wait for auth, not full access validation
  const shouldLoadData = !currentLoading && !isValidatingAuth && !!currentUser;

  const {
    session,
    observations,
    allSessions,
    sessionCreator,
    isLoading: isLoadingData,
    error: dataError,
    loadSessionData,
  } = useSessionDetailsData(
    sessionId,
    projectId,
    currentUser,
    shouldLoadData
  );

      const {
    currentIndex,
    hasPrevious,
    hasNext,
    handlePrevious,
    handleNext,
    handleBack,
  } = useSessionNavigation(allSessions, sessionId, projectId);

  const {
    handleFinishSession,
    handleDeleteSession,
    handleExportSession,
    isFinishing,
    isDeleting,
    canFinish,
    canDelete,
    canExport,
  } = useSessionActions(
    session,
    project,
    currentUser,
    observations,
    sessionCreator,
    projectId,
    loadSessionData,
    showToast
  );

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSession = async () => {
    await handleDeleteSession();
      setDeleteDialogOpen(false);
  };

  // Loading state
  if (isValidatingAuth || currentLoading || isLoadingData) {
    return <SessionDetailsLoading />;
  }


  // Authentication error
  if (authError) {
    return <AuthErrorDisplay error={authError} />;
  }

  // Data error
  if (dataError || !session) {
    return (
      <SessionDetailsError
        error={dataError || "Sesión no encontrada"}
        onBack={handleBack}
        onRetry={loadSessionData}
      />
    );
  }

  return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-3 py-6 sm:px-6 sm:py-12">
        <SessionDetailsHeader session={session} onBack={handleBack} />

          {/* Navigation and Actions */}
          <div className="mb-3 sm:mb-4 flex items-center justify-between">
          <SessionNavigation
            currentIndex={currentIndex}
            totalSessions={allSessions.length}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            onPrevious={handlePrevious}
            onNext={handleNext}
          />

          <SessionActions
            canFinish={canFinish}
            canDelete={canDelete}
            canExport={canExport}
            isFinished={!!session.end_time}
            isFinishing={isFinishing}
            isDeleting={isDeleting}
            onOpenDrawer={() => setDrawerOpen(true)}
            onFinish={handleFinishSession}
            onDelete={handleDeleteClick}
            onExport={handleExportSession}
          />
          </div>

          {/* Session Details */}
          <div className="space-y-3 sm:space-y-6">
          <SessionInfoCard session={session} sessionCreator={sessionCreator} />
          <ObservationsList observations={observations} />
        </div>
      </div>

      {/* Session Info Drawer */}
      <SessionInfoDrawer
        session={session}
        sessionCreator={sessionCreator}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Confirmation Dialog */}
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

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default function SessionDetailsPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<SessionDetailsLoading />}>
        <SessionDetailsContent />
      </Suspense>
    </ErrorBoundary>
  );
}
