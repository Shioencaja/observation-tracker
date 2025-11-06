import { User, Calendar, Clock } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Session } from "@/types/observation";
import { SessionCreator } from "@/services/session-details-service";
import { getSessionDuration } from "@/lib/session-details-utils";

interface SessionInfoDrawerProps {
  session: Session;
  sessionCreator: SessionCreator | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SessionInfoDrawer({
  session,
  sessionCreator,
  isOpen,
  onClose,
}: SessionInfoDrawerProps) {
  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="pb-3">
          <DrawerTitle className="text-base sm:text-lg">
            Información de la Sesión
          </DrawerTitle>
          <DrawerDescription className="text-sm">
            Detalles completos de la sesión seleccionada
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4 overflow-y-auto">
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Cliente
                  </p>
                  <p className="font-medium text-sm truncate">
                    {session.alias || session.id.substring(0, 8) || "Sin alias"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Fecha
                  </p>
                  <p className="font-medium text-sm">
                    {new Date(session.start_time).toLocaleDateString(
                      "es-ES",
                      {
                        year: "2-digit",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Duración
                  </p>
                  <p className="font-medium text-sm">
                    {getSessionDuration(session)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Usuario
                  </p>
                  <p className="font-medium text-sm truncate">
                    {sessionCreator?.email
                      ? sessionCreator.email.split("@")[0]
                      : session.user_id.substring(0, 8)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

