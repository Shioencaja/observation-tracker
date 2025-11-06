"use client";

import { LoadingButton } from "@/components/loading/LoadingButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ProjectInformationSectionProps {
  editName: string;
  editDescription: string;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  isCreator: boolean;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onSave: () => Promise<void>;
}

export function ProjectInformationSection({
  editName,
  editDescription,
  isSaving,
  hasUnsavedChanges,
  isCreator,
  onNameChange,
  onDescriptionChange,
  onSave,
}: ProjectInformationSectionProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          Información del Proyecto
        </h2>
      </div>
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Label
            htmlFor="project-name"
            className="text-sm font-medium text-gray-700"
          >
            Nombre del Proyecto
          </Label>
          <Input
            id="project-name"
            value={editName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Nombre del proyecto"
            disabled={!isCreator}
            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="project-description"
            className="text-sm font-medium text-gray-700"
          >
            Descripción
          </Label>
          <Textarea
            id="project-description"
            value={editDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Descripción del proyecto (opcional)"
            rows={3}
            disabled={!isCreator}
            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        {isCreator && (
          <div className="flex justify-end pt-2">
            <LoadingButton
              onClick={onSave}
              isLoading={isSaving}
              loadingText="Guardando..."
              disabled={!editName.trim()}
              className={`${
                hasUnsavedChanges
                  ? "bg-orange-600 hover:bg-orange-700 ring-2 ring-orange-200"
                  : "bg-blue-600 hover:bg-blue-700"
              } text-white transition-all duration-200`}
            >
              {hasUnsavedChanges && (
                <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
              )}
              Guardar Cambios{hasUnsavedChanges && " *"}
            </LoadingButton>
          </div>
        )}
      </div>
    </div>
  );
}

