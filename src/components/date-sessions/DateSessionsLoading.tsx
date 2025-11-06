import { Loader2 } from "lucide-react";

interface DateSessionsLoadingProps {
  text?: string;
}

export function DateSessionsLoading({
  text = "Cargando sesiones...",
}: DateSessionsLoadingProps) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">{text}</p>
      </div>
    </div>
  );
}

