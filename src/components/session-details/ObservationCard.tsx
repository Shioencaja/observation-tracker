import { Card, CardContent } from "@/components/ui/card";
import { formatResponse } from "@/lib/session-details-utils";
import { ObservationWithDetails } from "@/services/session-details-service";

interface ObservationCardProps {
  observation: ObservationWithDetails;
}

export function ObservationCard({ observation }: ObservationCardProps) {
  const formattedResponse = formatResponse(
    observation.response,
    observation.question_type || "unknown"
  );

  return (
    <Card className="bg-muted/20 border-muted/50">
      <CardContent className="p-2.5 sm:p-3">
        <div className="mb-1.5 sm:mb-2">
          <h4 className="font-medium text-xs sm:text-sm text-foreground leading-tight">
            {observation.question_name}
          </h4>
        </div>

        <div className="bg-background rounded p-2 border border-muted/30">
          {observation.question_type === "timer" ||
          observation.question_type === "voice" ? (
            <div className="space-y-1">{formattedResponse}</div>
          ) : (
            <p className="text-xs sm:text-sm leading-relaxed">
              {formattedResponse}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

