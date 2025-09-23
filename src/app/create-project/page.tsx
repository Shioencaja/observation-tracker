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
import { ArrowLeft, Plus, X, GripVertical, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Draggable Question Component
interface DraggableQuestionProps {
  question: {
    name: string;
    description: string;
    question_type: string;
    options: string[];
  };
  index: number;
  onUpdate: (
    index: number,
    field: string,
    value: string | string[] | boolean
  ) => void;
  onRemove: (index: number) => void;
  onAddOption: (index: number) => void;
  onUpdateOption: (index: number, optionIndex: number, value: string) => void;
  onRemoveOption: (index: number, optionIndex: number) => void;
}

function DraggableQuestion({
  question,
  index,
  onUpdate,
  onRemove,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
}: DraggableQuestionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `question-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-gray-200 rounded-xl p-6 space-y-6 shadow-sm ${
        isDragging ? "shadow-lg border-blue-300" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
          >
            <GripVertical size={16} className="text-gray-400" />
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-sm font-semibold text-blue-600">
              {index + 1}
            </span>
          </div>
          <h4 className="text-lg font-semibold text-gray-900">
            Pregunta {index + 1}
          </h4>
        </div>
        <Button
          onClick={() => onRemove(index)}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
        >
          <X size={16} />
        </Button>
      </div>

      {/* Question Name */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">
          Nombre de la Pregunta *
        </Label>
        <Input
          value={question.name}
          onChange={(e) => onUpdate(index, "name", e.target.value)}
          placeholder="Ej: ¿Cómo se comporta el usuario?"
          className="text-base"
        />
      </div>

      {/* Question Type */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">
          Tipo de Pregunta
        </Label>
        <Select
          value={question.question_type}
          onValueChange={(value) => onUpdate(index, "question_type", value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleccionar tipo..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="string">📝 Texto libre</SelectItem>
            <SelectItem value="boolean">✅ Sí/No</SelectItem>
            <SelectItem value="radio">🔘 Opción única</SelectItem>
            <SelectItem value="checkbox">☑️ Múltiples opciones</SelectItem>
            <SelectItem value="counter">🔢 Contador</SelectItem>
            <SelectItem value="timer">⏱️ Temporizador</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">
          Descripción (opcional)
        </Label>
        <Textarea
          value={question.description}
          onChange={(e) => onUpdate(index, "description", e.target.value)}
          placeholder="Descripción adicional de la pregunta..."
          className="resize-none"
          rows={3}
        />
      </div>

      {/* Options for Radio/Checkbox */}
      {(question.question_type === "radio" ||
        question.question_type === "checkbox") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-gray-700">
              Opciones de Respuesta
            </Label>
            <Button
              onClick={() => onAddOption(index)}
              variant="outline"
              size="sm"
              disabled={question.options.length >= 10}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Plus size={14} className="mr-1" />
              Agregar
            </Button>
          </div>

          {question.options.length > 0 ? (
            <div className="space-y-3">
              {question.options.map((opt, optIndex) => (
                <div key={optIndex} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-gray-600">
                      {optIndex + 1}
                    </span>
                  </div>
                  <Input
                    value={opt}
                    onChange={(e) =>
                      onUpdateOption(index, optIndex, e.target.value)
                    }
                    placeholder={`Opción ${optIndex + 1}`}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => onRemoveOption(index, optIndex)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
                  >
                    <X size={14} />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <p className="text-sm">No hay opciones agregadas</p>
              <p className="text-xs mt-1">
                Haz clic en "Agregar" para crear opciones
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CreateProjectPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [agencies, setAgencies] = useState<string[]>([]);
  const [newAgency, setNewAgency] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<
    Array<{ user_id: string; email: string }>
  >([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [observationOptions, setObservationOptions] = useState<
    Array<{
      name: string;
      description: string;
      question_type: string;
      options: string[];
    }>
  >([]);
  const [isCreating, setIsCreating] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setObservationOptions((items) => {
        const oldIndex = items.findIndex(
          (_, index) => `question-${index}` === active.id
        );
        const newIndex = items.findIndex(
          (_, index) => `question-${index}` === over.id
        );

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else {
      loadAllUsers();
    }
  }, [user, router]);

  const loadAllUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase.rpc("get_all_users");
      if (error) {
        console.log(
          "Error loading users (get_all_users function might not exist):",
          error
        );
        setAllUsers([]);
      } else {
        setAllUsers(data || []);
      }
    } catch (error) {
      console.log("Error loading users:", error);
      setAllUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const addUserToProject = (userId: string) => {
    if (!selectedUsers.includes(userId)) {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const removeUserFromProject = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((id) => id !== userId));
  };

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
        description: "",
        question_type: "string",
        options: [],
      },
    ]);
  };

  const updateObservationOption = (
    index: number,
    field: string,
    value: string | string[] | boolean
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

      // Add selected users to the project
      if (selectedUsers.length > 0) {
        const usersToInsert = selectedUsers.map((userId) => ({
          project_id: project.id,
          user_id: userId,
          added_by: user.id,
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
        const optionsToInsert = observationOptions
          .filter((option) => option.name.trim())
          .map((option) => ({
            project_id: project.id,
            name: option.name.trim(),
            description: option.description.trim() || null,
            question_type: option.question_type,
            options:
              option.options.length > 0
                ? option.options.filter((opt) => opt.trim())
                : null,
            is_visible: true,
          }));

        if (optionsToInsert.length > 0) {
          const { error: optionsError } = await supabase
            .from("project_observation_options")
            .insert(optionsToInsert);

          if (optionsError) {
            console.error("Error creating observation options:", optionsError);
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

  if (!user) {
    return null;
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
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Agregar Usuario
                  </Label>
                  <Select
                    value=""
                    onValueChange={(userId) => {
                      if (userId) {
                        addUserToProject(userId);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar usuario..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allUsers
                        .filter(
                          (u) =>
                            u.user_id !== user?.id &&
                            !selectedUsers.includes(u.user_id)
                        )
                        .map((userOption) => (
                          <SelectItem
                            key={userOption.user_id}
                            value={userOption.user_id}
                          >
                            {userOption.email}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {isLoadingUsers && (
                    <p className="text-sm text-gray-500">
                      Cargando usuarios...
                    </p>
                  )}
                </div>

                {selectedUsers.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      Usuarios Seleccionados ({selectedUsers.length})
                    </Label>
                    <div className="space-y-2">
                      {selectedUsers.map((userId) => {
                        const userOption = allUsers.find(
                          (u) => u.user_id === userId
                        );
                        return (
                          <div
                            key={userId}
                            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                                <span className="text-sm font-semibold text-white">
                                  {(userOption?.email || userId)
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {userOption?.email || userId}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Tendrá acceso al proyecto
                                </p>
                              </div>
                            </div>
                            <Button
                              onClick={() => removeUserFromProject(userId)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={observationOptions.map(
                      (_, index) => `question-${index}`
                    )}
                    strategy={verticalListSortingStrategy}
                  >
                    {observationOptions.map((option, index) => (
                      <DraggableQuestion
                        key={`question-${index}`}
                        question={option}
                        index={index}
                        onUpdate={updateObservationOption}
                        onRemove={removeObservationOption}
                        onAddOption={addOptionToQuestion}
                        onUpdateOption={updateOptionInQuestion}
                        onRemoveOption={removeOptionFromQuestion}
                      />
                    ))}
                  </SortableContext>
                </DndContext>

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
