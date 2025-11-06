"use client";

import { Clock, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, getSessionStatus, type Session } from "@/lib/session-utils";
import { SessionActionMenu } from "./SessionActionMenu";

interface SessionsCardsProps {
  sessions: Session[];
  projectCreatorId: string;
  userId: string;
  canExport: boolean;
  onSessionClick: (sessionId: string) => void;
  onExport: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}

export function SessionsCards({
  sessions,
  projectCreatorId,
  userId,
  canExport,
  onSessionClick,
  onExport,
  onDelete,
}: SessionsCardsProps) {
  const canDelete = userId === projectCreatorId;

  return (
    <div className="block sm:hidden space-y-2">
      {sessions.map((session) => {
        const status = getSessionStatus(session);
        return (
          <Card
            key={session.id}
            className="cursor-pointer hover:shadow-sm transition-shadow border-gray-200"
            onClick={() => onSessionClick(session.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium text-sm truncate pr-2">
                  {session.alias || `Sesión ${session.id.substring(0, 6)}`}
                </h3>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={status.variant}
                    className="text-xs flex-shrink-0 h-5"
                  >
                    {status.label === "Completada"
                      ? "✓"
                      : status.label === "En Progreso"
                      ? "⏳"
                      : "○"}
                  </Badge>
                  <SessionActionMenu
                    sessionId={session.id}
                    canExport={canExport}
                    canDelete={canDelete}
                    onExport={onExport}
                    onDelete={onDelete}
                    onClick={(e) => e.stopPropagation()}
                    size="sm"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(session.created_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-20">
                    {session.agency || "Sin agencia"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

