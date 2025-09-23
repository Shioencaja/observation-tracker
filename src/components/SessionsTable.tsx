"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PaginationWrapper } from "@/components/ui/pagination-wrapper";
import { useRouter, useSearchParams } from "next/navigation";
import { usePagination } from "@/hooks/use-pagination";
import { Trash2 } from "lucide-react";

interface Session {
  id: string;
  alias?: string | null;
  start_time: string;
  end_time?: string | null;
  agency: string | null;
  status?: string;
}

interface SessionsTableProps {
  sessions: Session[];
  onSessionSelect?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  isProjectCreatorUser?: boolean;
  selectedSessionId?: string | null;
  isCollapsible?: boolean;
  [key: string]: any; // Allow any additional props
}

export default function SessionsTable({
  sessions,
  onSessionSelect,
  onDeleteSession,
  isProjectCreatorUser = false,
  selectedSessionId,
}: SessionsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { currentPage, totalPages, paginatedData, goToPage } = usePagination({
    data: sessions,
    itemsPerPage: 8,
  });

  const handleSessionSelect = (sessionId: string) => {
    // Use callback if provided, otherwise fall back to URL navigation
    if (onSessionSelect) {
      onSessionSelect(sessionId);
    } else {
      // Fallback to URL navigation for backward compatibility
      const pathParts = window.location.pathname.split("/");
      const projectId = pathParts[1];
      const date = pathParts[2];

      const params = new URLSearchParams(searchParams.toString());
      params.set("session", sessionId);
      const newUrl = `/${projectId}/${date}/sessions?${params.toString()}`;
      window.history.replaceState({}, "", newUrl);
    }
  };
  const getSessionStatus = (session: Session) => {
    const status =
      session.status || (session.end_time ? "completed" : "in_progress");
    if (status === "completed") {
      return { label: "Completada", variant: "default" as const };
    } else if (status === "in_progress") {
      return { label: "En Progreso", variant: "secondary" as const };
    } else {
      return { label: "Pendiente", variant: "outline" as const };
    }
  };

  return (
    <div className="space-y-2">
      <div className="rounded-md border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="px-2 py-1 text-xs font-medium">
                Alias
              </TableHead>
              <TableHead className="px-2 py-1 text-xs font-medium w-16">
                Fecha
              </TableHead>
              <TableHead className="px-2 py-1 text-xs font-medium w-12">
                Estado
              </TableHead>
              <TableHead className="px-2 py-1 text-xs font-medium w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-16 text-center text-sm">
                  No hay sesiones disponibles.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {paginatedData.map((session) => {
                  const status = getSessionStatus(session);
                  const isSelected = selectedSessionId === session.id;
                  return (
                    <TableRow
                      key={session.id}
                      className={`cursor-pointer transition-colors h-10 ${
                        isSelected
                          ? "bg-blue-50 hover:bg-blue-100"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => handleSessionSelect(session.id)}
                    >
                      <TableCell className="px-2 py-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-xs font-medium truncate">
                            {session.alias ||
                              `Sesión ${session.id.slice(0, 6)}`}
                          </span>
                          {isSelected && (
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-1 text-xs text-muted-foreground">
                        {new Date(session.start_time).toLocaleDateString(
                          "es-ES",
                          { month: "2-digit", day: "2-digit" }
                        )}
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <Badge
                          variant={status.variant}
                          className="text-xs px-1.5 py-0.5 h-5"
                        >
                          {status.label === "Completada"
                            ? "✓"
                            : status.label === "En Progreso"
                            ? "⏳"
                            : "○"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <div className="flex justify-center">
                          {status.label === "Completada" &&
                            onDeleteSession &&
                            isProjectCreatorUser && (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteSession(session.id);
                                }}
                                title="Eliminar sesión"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Fill remaining rows to maintain fixed height */}
                {Array.from({
                  length: Math.max(0, 8 - paginatedData.length),
                }).map((_, index) => (
                  <TableRow key={`empty-${index}`} className="h-10">
                    <TableCell colSpan={4} className="h-10"></TableCell>
                  </TableRow>
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationWrapper
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
      />
    </div>
  );
}
