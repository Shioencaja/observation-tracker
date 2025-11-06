import { useState, useEffect, useCallback, useMemo } from "react";
import type { Project } from "@/types/observation";

interface ProjectFormState {
  name: string;
  description: string;
  agencies: string[];
}

interface UseProjectFormStateOptions {
  project: Project | null;
  onUnsavedChangesChange?: (hasChanges: boolean) => void;
}

interface UseProjectFormStateReturn {
  formState: ProjectFormState;
  updateField: <K extends keyof ProjectFormState>(
    field: K,
    value: ProjectFormState[K]
  ) => void;
  updateFields: (updates: Partial<ProjectFormState>) => void;
  resetForm: () => void;
  hasUnsavedChanges: boolean;
  isDirty: boolean;
}

/**
 * Custom hook for managing project form state
 * Handles form fields, change tracking, and reset functionality
 */
export function useProjectFormState({
  project,
  onUnsavedChangesChange,
}: UseProjectFormStateOptions): UseProjectFormStateReturn {
  const [formState, setFormState] = useState<ProjectFormState>({
    name: "",
    description: "",
    agencies: [],
  });

  // Initialize form state when project loads
  useEffect(() => {
    if (project) {
      setFormState({
        name: project.name || "",
        description: project.description || "",
        agencies: project.agencies || [],
      });
    }
  }, [project]);

  // Update a single field
  const updateField = useCallback(
    <K extends keyof ProjectFormState>(
      field: K,
      value: ProjectFormState[K]
    ) => {
      setFormState((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  // Update multiple fields at once
  const updateFields = useCallback((updates: Partial<ProjectFormState>) => {
    setFormState((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // Reset form to project's original values
  const resetForm = useCallback(() => {
    if (project) {
      setFormState({
        name: project.name || "",
        description: project.description || "",
        agencies: project.agencies || [],
      });
    }
  }, [project]);

  // Memoize sorted agencies arrays to avoid recalculating on every comparison
  const sortedFormAgencies = useMemo(
    () => [...formState.agencies].sort(),
    [formState.agencies]
  );

  const sortedProjectAgencies = useMemo(
    () => [...(project?.agencies || [])].sort(),
    [project?.agencies]
  );

  // Calculate if form has unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!project) return false;

    const nameChanged = formState.name.trim() !== project.name;
    const descriptionChanged =
      formState.description.trim() !== (project.description || "");
    
    // Compare agencies arrays (using memoized sorted arrays)
    const agenciesChanged =
      JSON.stringify(sortedFormAgencies) !== JSON.stringify(sortedProjectAgencies);

    return nameChanged || descriptionChanged || agenciesChanged;
  }, [project, formState.name, formState.description, sortedFormAgencies, sortedProjectAgencies]);

  // Notify parent of unsaved changes status
  useEffect(() => {
    onUnsavedChangesChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

  // Check if form is dirty (any field has been modified from original)
  const isDirty = useMemo(() => {
    return hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  return {
    formState,
    updateField,
    updateFields,
    resetForm,
    hasUnsavedChanges,
    isDirty,
  };
}

