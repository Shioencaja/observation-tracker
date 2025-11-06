import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Project } from "@/types/observation";

interface DateSessionsHeaderProps {
  project: Project;
  selectedDate: string;
  selectedAgency: string | null;
  onBack: () => void;
}

export function DateSessionsHeader({
  project,
  selectedDate,
  selectedAgency,
  onBack,
}: DateSessionsHeaderProps) {
  const formattedDate = new Date(selectedDate + "T00:00:00").toLocaleDateString(
    "es-ES",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  return (
    <div className="mb-8">
      <Button
        onClick={onBack}
        variant="ghost"
        size="sm"
        className="mb-6 p-0 h-auto text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} className="mr-2" />
        Volver
      </Button>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">
        {project.name}
        {project.is_finished && (
          <span className="ml-3 text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            ✅ Finalizado
          </span>
        )}
      </h1>
      <p className="text-gray-500 text-sm">
        Sesiones del {formattedDate}
        {selectedAgency && ` • ${selectedAgency}`}
      </p>
      {project.is_finished && (
        <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
          <p className="text-sm text-orange-800">
            ⚠️ Este proyecto ha sido finalizado. No se pueden crear nuevas
            sesiones ni registrar observaciones.
          </p>
        </div>
      )}
    </div>
  );
}

