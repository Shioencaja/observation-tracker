import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface DateSessionsErrorProps {
  error: string;
  onBack: () => void;
  onRetry?: () => void;
}

export function DateSessionsError({
  error,
  onBack,
  onRetry,
}: DateSessionsErrorProps) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <div className="flex gap-3 justify-center">
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              Reintentar
            </Button>
          )}
          <Button onClick={onBack}>Volver</Button>
        </div>
      </div>
    </div>
  );
}

