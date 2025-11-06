import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface FinishedProjectDisplayProps {
  projectName: string;
}

export function FinishedProjectDisplay({
  projectName,
}: FinishedProjectDisplayProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Proyecto Finalizado
          </h2>
          <p className="text-gray-600">
            Este proyecto ha sido finalizado por el creador. Ya no se pueden
            registrar nuevas observaciones ni acceder al historial.
          </p>
        </div>
        <Button
          onClick={() => router.push("/projects")}
          className="bg-gray-900 hover:bg-gray-800 text-white"
        >
          Volver a Proyectos
        </Button>
      </div>
    </div>
  );
}

