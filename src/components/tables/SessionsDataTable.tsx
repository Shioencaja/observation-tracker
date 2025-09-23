"use client";

import { DataTableWithPagination } from "@/components/ui/data-table-with-pagination";
import { sessionsColumns, Session } from "./sessions-columns";
import { useRouter, useSearchParams } from "next/navigation";

interface SessionsDataTableProps {
  sessions: Session[];
  onSessionSelect?: (sessionId: string) => void;
  isProjectCreatorUser?: boolean;
  selectedSessionId?: string | null;
  isCollapsible?: boolean;
  [key: string]: any; // Allow any additional props
}

export default function SessionsDataTable({
  sessions,
  onSessionSelect,
  isProjectCreatorUser = false,
  selectedSessionId,
}: SessionsDataTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSessionSelect = (sessionId: string) => {
    // Use callback if provided, otherwise fall back to URL navigation
    if (onSessionSelect) {
      onSessionSelect(sessionId);
    } else {
      // Update URL without page reload
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.set("session", sessionId);

      // Use history API to avoid full page reload
      const newUrl = `${
        window.location.pathname
      }?${newSearchParams.toString()}`;
      window.history.replaceState({}, "", newUrl);
    }
  };

  // Create columns with the action handler
  const columnsWithActions = sessionsColumns.map((column) => {
    if (column.id === "actions") {
      return {
        ...column,
        cell: ({ row }: any) => {
          const session = row.original;
          return (
            <button
              onClick={() => handleSessionSelect(session.id)}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
            >
              Ver Detalles
            </button>
          );
        },
      };
    }
    return column;
  });

  return (
    <div className="w-full">
      <DataTableWithPagination
        columns={columnsWithActions}
        data={sessions}
        itemsPerPage={10}
      />
    </div>
  );
}
