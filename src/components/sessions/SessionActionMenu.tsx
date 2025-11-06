"use client";

import { Download, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SessionActionMenuProps {
  sessionId: string;
  canExport: boolean;
  canDelete: boolean;
  onExport: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onClick?: (e: React.MouseEvent) => void;
  size?: "sm" | "default";
}

export function SessionActionMenu({
  sessionId,
  canExport,
  canDelete,
  onExport,
  onDelete,
  onClick,
  size = "sm",
}: SessionActionMenuProps) {
  if (!canExport && !canDelete) {
    return <div className={size === "sm" ? "h-6 w-6" : "h-8 w-8"}></div>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          className={size === "sm" ? "h-6 w-6 p-0" : "h-8 w-8 p-0"}
          onClick={onClick}
        >
          <MoreVertical className={size === "sm" ? "h-4 w-4" : "h-4 w-4"} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {canExport && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onExport(sessionId);
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar sesión
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            {canExport && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(sessionId);
              }}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar sesión
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

