import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ObservationCard } from "./ObservationCard";
import { ObservationWithDetails } from "@/services/session-details-service";

interface ObservationsListProps {
  observations: ObservationWithDetails[];
}

export function ObservationsList({ observations }: ObservationsListProps) {
  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-sm sm:text-base">Respuestas</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        {observations.length === 0 ? (
          <div className="text-center py-4 sm:py-6 text-muted-foreground">
            <p className="text-xs sm:text-sm">
              No hay respuestas registradas para esta sesión.
            </p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {observations.map((observation) => (
              <ObservationCard key={observation.id} observation={observation} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

