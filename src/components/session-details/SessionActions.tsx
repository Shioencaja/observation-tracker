import {
  MoreVertical,
  Info,
  Clock,
  Download,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SessionActionsProps {
  canFinish: boolean;
  canDelete: boolean;
  canExport: boolean;
  isFinished: boolean;
  isFinishing: boolean;
  isDeleting: boolean;
  onOpenDrawer: () => void;
  onFinish: () => void;
  onDelete: () => void;
  onExport: () => void;
}

export function SessionActions({
  canFinish,
  canDelete,
  canExport,
  isFinished,
  isFinishing,
  isDeleting,
  onOpenDrawer,
  onFinish,
  onDelete,
  onExport,
}: SessionActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 sm:h-8 sm:w-8 p-0"
        >
          <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onOpenDrawer}>
          <Info className="mr-2 h-4 w-4" />
          Información
        </DropdownMenuItem>
        {/* Finish session button - Only for project creators and if session is not finished */}
        {canFinish && !isFinished && (
          <DropdownMenuItem
            onClick={onFinish}
            disabled={isFinishing}
            className="text-green-600 focus:text-green-600"
            title="El creador del proyecto puede finalizar cualquier sesión"
          >
            {isFinishing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Clock className="mr-2 h-4 w-4" />
            )}
            {isFinishing ? "Finalizando..." : "Finalizar sesión"}
          </DropdownMenuItem>
        )}
        {/* Export button - Only for project creators */}
        {canExport && (
          <DropdownMenuItem onClick={onExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar sesión
          </DropdownMenuItem>
        )}
        {/* Only show separator if there are creator-only buttons */}
        {canDelete && (
          <DropdownMenuSeparator />
        )}
        {/* Delete button - Only for project creators */}
        {canDelete && (
          <DropdownMenuItem
            onClick={onDelete}
            disabled={isDeleting}
            className="text-red-600 focus:text-red-600"
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            {isDeleting ? "Eliminando..." : "Eliminar sesión"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

