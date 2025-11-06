"use client";

import { ArrowLeft, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface SessionsHeaderProps {
  projectName: string;
  isLoading: boolean;
  onRefresh: () => void;
}

export function SessionsHeader({
  projectName,
  isLoading,
  onRefresh,
}: SessionsHeaderProps) {
  const router = useRouter();

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
        <Button
          onClick={() => router.push("/projects")}
          variant="ghost"
          size="sm"
          className="h-8 sm:h-9 text-xs sm:text-sm"
        >
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Volver</span>
        </Button>
        <div className="text-right flex-1">
          <p className="text-xs text-muted-foreground mb-1">
            Sesiones del proyecto
          </p>
          <div className="flex items-center justify-end gap-2">
            <h1 className="text-base sm:text-xl font-semibold text-foreground truncate">
              {projectName}
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              title="Actualizar lista"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Search className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

