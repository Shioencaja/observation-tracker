"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Plus,
  X,
  GripVertical,
  Loader2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ErrorBoundary from "@/components/ErrorBoundary";
import QuestionCard, { Question } from "@/components/QuestionCard";
import UserManagement from "@/components/UserManagement";
import { UserRole } from "@/types/observation";

export default function CreateProjectPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [agencies, setAgencies] = useState<string[]>([]);
  const [newAgency, setNewAgency] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<
    Array<{ user_id: string; role: UserRole }>
  >([]);
  const [allUsers, setAllUsers] = useState<
    Array<{ user_id: string; email: string }>
  >([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [observationOptions, setObservationOptions] = useState<Question[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Move question up
  const moveQuestionUp = (index: number) => {
    if (index > 0) {
      const newOptions = [...observationOptions];
      [newOptions[index - 1], newOptions[index]] = [
        newOptions[index],
        newOptions[index - 1],
      ];
      setObservationOptions(newOptions);
    }
  };

  // Move question down
  const moveQuestionDown = (index: number) => {
    if (index < observationOptions.length - 1) {
      const newOptions = [...observationOptions];
      [newOptions[index], newOptions[index + 1]] = [
        newOptions[index + 1],
        newOptions[index],
      ];
      setObservationOptions(newOptions);
    }
  };

  useEffect(() => {
    // Don't redirect while auth is still loading
    if (authLoading) {
      return;
    }

    if (!user) {
      router.push("/login");
    } else {
      loadAllUsers();
    }
  }, [user, authLoading, router]);

  const loadAllUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase.rpc("get_all_users");
      if (error) {
        setAllUsers([]);
      } else {
        setAllUsers(data || []);
      }
    } catch (error) {
      setAllUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // User management is now handled by the UserManagement component

  const addAgency = () => {
    if (newAgency.trim() && !agencies.includes(newAgency.trim())) {
      setAgencies([...agencies, newAgency.trim()]);
      setNewAgency("");
    }
  };

  const removeAgency = (index: number) => {
    setAgencies(agencies.filter((_, i) => i !== index));
  };

  const addObservationOption = () => {
    setObservationOptions([
      ...observationOptions,
      {
        name: "",
        question_type: "string",
        options: [],
        is_mandatory: false,
        depends_on_question_id: undefined,
        depends_on_answer: undefined,
      },
    ]);
  };

  const updateObservationOption = (
    index: number,
    field: string,
    value: string | string[] | boolean | number | undefined | null
  ) => {
    const updated = [...observationOptions];
    updated[index] = { ...updated[index], [field]: value };
    setObservationOptions(updated);
  };

  const removeObservationOption = (index: number) => {
    setObservationOptions(observationOptions.filter((_, i) => i !== index));
  };

  const addOptionToQuestion = (optionIndex: number) => {
    const option = observationOptions[optionIndex];
    if (option.options.length < 10) {
      // Limit to 10 options
      updateObservationOption(optionIndex, "options", [...option.options, ""]);
    }
  };

  const updateOptionInQuestion = (
    optionIndex: number,
    optionValueIndex: number,
    value: string
  ) => {
    const updated = [...observationOptions];
    updated[optionIndex].options[optionValueIndex] = value;
    setObservationOptions(updated);
  };

  const removeOptionFromQuestion = (
    optionIndex: number,
    optionValueIndex: number
  ) => {
    const updated = [...observationOptions];
    updated[optionIndex].options = updated[optionIndex].options.filter(
      (_, i) => i !== optionValueIndex
    );
    setObservationOptions(updated);
  };

  const createProject = async () => {
    if (!user || !projectName.trim() || agencies.length === 0) return;

    setIsCreating(true);
    try {
      // Create the project
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          name: projectName.trim(),
          description: projectDescription.trim() || null,
          created_by: user.id,
          agencies: agencies,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Note: The creator is automatically added to project_users by the trigger
      // But we need to update their role to 'creator'
      try {
        await supabase
          .from("project_users")
          .update({ role: "creator" })
          .eq("project_id", project.id)
          .eq("user_id", user.id);
      } catch (roleUpdateError) {
        // Silently fail if role column doesn't exist yet
      }

      // Add selected users to the project
      if (selectedUsers.length > 0) {
        const usersToInsert = selectedUsers.map((userWithRole) => ({
          project_id: project.id,
          user_id: userWithRole.user_id,
          added_by: user.id,
          role: userWithRole.role,
        }));

        const { error: selectedUsersError } = await supabase
          .from("project_users")
          .insert(usersToInsert);

        if (selectedUsersError) {
          console.error(
            "Error adding selected users to project:",
            selectedUsersError
          );
        }
      }

      // Create observation options
      if (observationOptions.length > 0) {
        // Note: We can't set depends_on_question_id yet because questions don't have IDs
        // We'll need to insert questions first, then update conditional logic references
        const optionsToInsert = observationOptions
          .filter((option) => option.name.trim())
          .map((option, idx) => ({
            project_id: project.id,
            name: option.name.trim(),
            description: null,
            question_type: option.question_type,
            options:
              option.options && option.options.length > 0
                ? option.options.filter((opt) => opt.trim())
                : null,
            is_visible: true,
            is_mandatory: option.is_mandatory,
            order: idx + 1,
          }));

        if (optionsToInsert.length > 0) {
          const { data: insertedQuestions, error: optionsError } =
            await supabase
              .from("project_observation_options")
              .insert(optionsToInsert)
              .select("id");

          if (optionsError) {
            console.error("Error creating observation options:", optionsError);
            throw new Error(
              `Error al crear opciones de observación: ${optionsError.message}`
            );
          }

          // Now update conditional logic with actual question IDs
          if (insertedQuestions) {
            const updates = observationOptions
              .map((option, i) => {
                if (!option.depends_on_question_id) return null;

                // depends_on_question_id is stored as a string index from the UI
                const depIndex = parseInt(option.depends_on_question_id);

                if (
                  isNaN(depIndex) ||
                  depIndex < 0 ||
                  depIndex >= insertedQuestions.length
                ) {
                  return null;
                }

                return {
                  questionId: insertedQuestions[i].id,
                  dependsOnId: insertedQuestions[depIndex].id,
                  answer: option.depends_on_answer,
                };
              })
              .filter(Boolean);

            for (const update of updates) {
              if (update) {
                await supabase
                  .from("project_observation_options")
                  .update({
                    depends_on_question_id: update.dependsOnId,
                    depends_on_answer: update.answer,
                  })
                  .eq("id", update.questionId);
              }
            }
          }
        }
      }

      // Redirect to projects page
      router.push("/projects");
    } catch (error) {
      console.error("Error creating project:", error);
      alert(
        `Error al crear proyecto: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`
      );
    } finally {
      setIsCreating(false);
    }
  };

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-6 py-12">
          {/* Minimal Header */}
          <div className="mb-12">
            <Button
              onClick={() => router.push("/projects")}
              variant="ghost"
              size="sm"
              className="mb-6 p-0 h-auto text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft size={16} className="mr-2" />
              Volver
            </Button>
            <h1 className="text-2xl font-semibold text-gray-900">
              Nuevo Proyecto
            </h1>
          </div>

          <div className="space-y-8">
            {/* Project Information */}
            <div className="space-y-6">
              <div>
                <Label
                  htmlFor="projectName"
                  className="text-sm font-medium text-gray-700"
                >
                  Nombre del Proyecto *
                </Label>
                <Input
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Nombre del proyecto"
                  className="mt-2 border-gray-200 focus:border-gray-400 focus:ring-gray-400"
                />
              </div>
              <div>
                <Label
                  htmlFor="projectDescription"
                  className="text-sm font-medium text-gray-700"
                >
                  Descripción
                </Label>
                <Textarea
                  id="projectDescription"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Descripción del proyecto (opcional)"
                  className="mt-2 border-gray-200 focus:border-gray-400 focus:ring-gray-400 resize-none"
                  rows={3}
                />
              </div>
            </div>

            {/* Agencies */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Agencias *
                </Label>
                <p className="text-xs text-gray-500 mt-1">
                  Agrega las agencias que participarán en este proyecto
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={newAgency}
                    onChange={(e) => setNewAgency(e.target.value)}
                    placeholder="Nombre de la agencia"
                    onKeyPress={(e) => e.key === "Enter" && addAgency()}
                    className="flex-1"
                  />
                  <Button onClick={addAgency} size="sm" className="sm:w-auto">
                    <Plus size={16} />
                    <span className="hidden sm:inline ml-1">Agregar</span>
                  </Button>
                </div>
                {agencies.length > 0 ? (
                  <div className="space-y-2">
                    {agencies.map((agency, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-50 p-2 rounded"
                      >
                        <span className="text-sm">{agency}</span>
                        <Button
                          onClick={() => removeAgency(index)}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <p className="text-sm">No hay agencias agregadas</p>
                    <p className="text-xs mt-1">
                      Agrega al menos una agencia para continuar
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Project Users */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Usuarios del Proyecto
                </Label>
                <p className="text-xs text-gray-500 mt-1">
                  Agrega usuarios que tendrán acceso a este proyecto
                </p>
              </div>
              <UserManagement
                projectId=""
                projectCreatorId={user?.id || ""}
                currentUserId={user?.id || ""}
                currentUserRole="creator"
                mode="create"
                selectedUsers={selectedUsers}
                onUsersChange={setSelectedUsers}
              />
            </div>

            {/* Observation Options */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Preguntas de Observación
                </Label>
                <p className="text-xs text-gray-500 mt-1">
                  Define las preguntas que se harán durante las observaciones
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  {observationOptions.map((option, index) => (
                    <QuestionCard
                      key={`question-${index}`}
                      question={option}
                      index={index}
                      totalQuestions={observationOptions.length}
                      allQuestions={observationOptions}
                      onUpdate={(updates) => {
                        const updatedOptions = [...observationOptions];
                        updatedOptions[index] = {
                          ...updatedOptions[index],
                          ...updates,
                        };
                        setObservationOptions(updatedOptions);
                      }}
                      onRemove={() => removeObservationOption(index)}
                      onMoveUp={() => moveQuestionUp(index)}
                      onMoveDown={() => moveQuestionDown(index)}
                      mode="create"
                    />
                  ))}
                </div>

                <Button
                  onClick={addObservationOption}
                  variant="outline"
                  className="w-full"
                >
                  <Plus size={16} className="mr-2" />
                  Agregar Pregunta
                </Button>
              </div>
            </div>

            {/* Create Button */}
            <div className="pt-6 border-t border-gray-100">
              <Button
                onClick={createProject}
                disabled={
                  !projectName.trim() || agencies.length === 0 || isCreating
                }
                className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                size="lg"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando proyecto...
                  </>
                ) : (
                  "Crear Proyecto"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
