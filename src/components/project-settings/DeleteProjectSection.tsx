"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DeleteProjectSectionProps {
  projectName: string;
  onDelete: () => Promise<void>;
  isDeleting: boolean;
}

export function DeleteProjectSection({
  projectName,
  onDelete,
  isDeleting,
}: DeleteProjectSectionProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    await onDelete();
    setIsDeleteDialogOpen(false);
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg">
      <div className="px-6 py-4 border-b border-red-200">
        <h2 className="text-lg font-semibold text-red-800">Zona de Peligro</h2>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          <p className="text-sm text-red-700">
            Una vez que elimines un proyecto, no hay vuelta atrás. Por favor,
            ten cuidado.
          </p>
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Eliminar Proyecto
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Esto eliminará
                  permanentemente el proyecto "{projectName}" y todas sus
                  sesiones y observaciones asociadas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                >
                  {isDeleting && (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  )}
                  {isDeleting ? "Eliminando..." : "Eliminar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

