import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SessionDetailsErrorProps {
  error: string;
  onBack: () => void;
  onRetry?: () => void;
}

export function SessionDetailsError({
  error,
  onBack,
  onRetry,
}: SessionDetailsErrorProps) {
  return (
    <div className="min-h-screen bg-muted/50">
      <div className="max-w-7xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Sesión no encontrada"}</AlertDescription>
        </Alert>
        <div className="mt-4 flex gap-2">
          <Button onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              Reintentar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

