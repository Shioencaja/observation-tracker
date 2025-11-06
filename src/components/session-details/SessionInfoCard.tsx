import { Calendar, User, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Session } from "@/types/observation";
import { SessionCreator } from "@/services/session-details-service";

interface SessionInfoCardProps {
  session: Session;
  sessionCreator: SessionCreator | null;
}

export function SessionInfoCard({
  session,
  sessionCreator,
}: SessionInfoCardProps) {
  return (
    <Card className="border-muted/50">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Fecha</p>
              <p className="font-medium text-xs sm:text-sm truncate">
                {new Date(session.start_time).toLocaleDateString("es-ES", {
                  year: "2-digit",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Usuario</p>
              <p className="font-medium text-xs sm:text-sm truncate">
                {sessionCreator?.email
                  ? sessionCreator.email.split("@")[0]
                  : session.user_id.substring(0, 8)}
              </p>
            </div>
          </div>

          {/* Session Status Badge */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Estado</p>
              <Badge
                variant={session.end_time ? "secondary" : "default"}
                className="text-xs"
              >
                {session.end_time ? "Finalizada" : "Activa"}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

