"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  formatDate,
  formatTime,
  getSessionStatus,
  type Session,
} from "@/lib/session-utils";
import { SessionActionMenu } from "./SessionActionMenu";

interface SessionsTableProps {
  sessions: Session[];
  projectCreatorId: string;
  userId: string;
  canExport: boolean;
  onSessionClick: (sessionId: string) => void;
  onExport: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  itemsPerPage?: number;
}

export function SessionsTable({
  sessions,
  projectCreatorId,
  userId,
  canExport,
  onSessionClick,
  onExport,
  onDelete,
  itemsPerPage = 6,
}: SessionsTableProps) {
  const canDelete = userId === projectCreatorId;

  return (
    <div className="hidden sm:block">
      <div className="rounded-md border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sesión</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Hora</TableHead>
              <TableHead>Agencia</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => {
              const status = getSessionStatus(session);
              return (
                <TableRow
                  key={session.id}
                  className="hover:bg-muted/50 transition-colors cursor-pointer h-12"
                  onClick={() => onSessionClick(session.id)}
                >
                  <TableCell className="font-medium">
                    {session.alias || `Sesión ${session.id.substring(0, 8)}`}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(session.created_at)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatTime(session.start_time)}
                    {session.end_time &&
                      ` - ${formatTime(session.end_time)}`}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {session.agency || "Sin agencia"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant} className="text-xs">
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <SessionActionMenu
                      sessionId={session.id}
                      canExport={canExport}
                      canDelete={canDelete}
                      onExport={onExport}
                      onDelete={onDelete}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {/* Fill remaining rows to maintain fixed height */}
            {Array.from({
              length: Math.max(0, itemsPerPage - sessions.length),
            }).map((_, index) => (
              <TableRow key={`empty-${index}`} className="h-12">
                <TableCell colSpan={6} className="h-12"></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

