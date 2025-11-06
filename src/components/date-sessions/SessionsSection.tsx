import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import SessionsTable from "@/components/SessionsTable";
import { cn } from "@/lib/utils";
import type { SessionWithObservations } from "@/types/observation";

interface SessionsSectionProps {
  sessions: SessionWithObservations[];
  selectedSessionId: string | null;
  unfinishedCount: number;
  isOpen: boolean;
  isCreatingSession: boolean;
  canCreateSession: boolean;
  isProjectCreator: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionSelect: (sessionId: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export function SessionsSection({
  sessions,
  selectedSessionId,
  unfinishedCount,
  isOpen,
  isCreatingSession,
  canCreateSession,
  isProjectCreator,
  onOpenChange,
  onSessionSelect,
  onCreateSession,
  onDeleteSession,
}: SessionsSectionProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange} className="space-y-4">
      <div className="flex justify-between items-center">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 p-0 h-auto text-lg font-medium text-gray-900 hover:text-gray-700"
          >
            <h2>Sesiones</h2>
            {unfinishedCount > 0 && (
              <span className="ml-2 text-sm font-normal text-orange-600">
                ({unfinishedCount} sin finalizar)
              </span>
            )}
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <Button
          onClick={onCreateSession}
          disabled={isCreatingSession || !canCreateSession}
          className={cn(
            "bg-gray-900 text-white",
            !isCreatingSession &&
              canCreateSession &&
              "hover:bg-gray-800"
          )}
          title={
            !canCreateSession
              ? "No se pueden crear sesiones en proyectos finalizados"
              : ""
          }
        >
          {isCreatingSession ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creando...
            </>
          ) : (
            "Nueva Sesión"
          )}
        </Button>
      </div>
      <CollapsibleContent>
        <SessionsTable
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSessionSelect={onSessionSelect}
          onDeleteSession={onDeleteSession}
          isProjectCreatorUser={isProjectCreator}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

