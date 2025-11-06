import QuestionnaireForm from "@/components/QuestionnaireForm";
import type {
  SessionWithObservations,
  ProjectObservationOption,
} from "@/types/observation";

interface QuestionnaireSectionProps {
  selectedSessionId: string | null;
  sessions: SessionWithObservations[];
  observationOptions: ProjectObservationOption[];
  projectId: string;
  isDeletingSession: boolean;
  isProjectFinished: boolean;
  onCreateSession: () => void;
  isCreatingSession: boolean;
  onFinishSession: (sessionId: string) => void;
}

export function QuestionnaireSection({
  selectedSessionId,
  sessions,
  observationOptions,
  projectId,
  isDeletingSession,
  isProjectFinished,
  onCreateSession,
  isCreatingSession,
  onFinishSession,
}: QuestionnaireSectionProps) {
  if (selectedSessionId) {
    const currentSession = sessions.find((s) => s.id === selectedSessionId);
    const isSessionFinished = currentSession?.end_time !== null;

    return (
      <QuestionnaireForm
        observationOptions={observationOptions}
        isLoading={isDeletingSession}
        selectedSessionId={selectedSessionId}
        isSessionFinished={isSessionFinished}
        onFinishSession={onFinishSession}
        projectId={projectId}
      />
    );
  } else {
    // Show empty questionnaire with new session button
    return (
      <QuestionnaireForm
        observationOptions={observationOptions}
        onCreateSession={onCreateSession}
        isCreatingSession={isCreatingSession}
        isProjectFinished={isProjectFinished}
        projectId={projectId}
      />
    );
  }
}

