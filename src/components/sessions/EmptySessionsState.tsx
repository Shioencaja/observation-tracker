"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptySessionsStateProps {
  hasFilters: boolean;
  projectId: string;
}

export function EmptySessionsState({
  hasFilters,
  projectId,
}: EmptySessionsStateProps) {
  return (
    <div className="text-center py-4 sm:py-8">
      <p className="text-muted-foreground mb-3 text-sm sm:text-base">
        {hasFilters
          ? "No se encontraron sesiones con los filtros aplicados"
          : "No hay sesiones registradas"}
      </p>
      <Button asChild size="sm" className="text-sm">
        <Link href={`/questionnaire?project=${projectId}`}>
          Crear Primera Sesión
        </Link>
      </Button>
    </div>
  );
}

