"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  Trash2,
  X,
  GripVertical,
  Edit2,
  Save,
  Plus,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  Project,
  ProjectObservationOption,
  UserRole,
} from "@/types/observation";
import QuestionCard, { Question } from "@/components/QuestionCard";
import UserManagement from "@/components/UserManagement";
import { useProjectRole } from "@/hooks/use-project-role";
import {
  canAccessSettings,
  canEditProject,
  canManageUsers,
  canManageQuestions,
  canDeleteProject,
  canFinishProject,
  canAddAgencies,
} from "@/lib/roles";

// Draggable Option Component
interface DraggableOptionProps {
  option: ProjectObservationOption;
  index: number;
  totalOptions: number;
  options: ProjectObservationOption[];
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string, isVisible: boolean) => void;
  onUpdate: (id: string, updates: Partial<ProjectObservationOption>) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

function DraggableOption({
  option,
  index,
  totalOptions,
  options,
  onDelete,
  onToggleVisibility,
  onUpdate,
  onMoveUp,
  onMoveDown,
}: DraggableOptionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(option.name);
  const [editQuestionType, setEditQuestionType] = useState(
    option.question_type
  );
  const [editOptions, setEditOptions] = useState(option.options || []);
  const [newOption, setNewOption] = useState("");
  const [editIsMandatory, setEditIsMandatory] = useState(
    option.is_mandatory || false
  );
  const [isSaving, setIsSaving] = useState(false);

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case "string":
        return "📝 Texto libre";
      case "boolean":
        return "✅ Sí/No";
      case "radio":
        return "🔘 Opción única";
      case "checkbox":
        return "☑️ Múltiples opciones";
      case "counter":
        return "🔢 Contador";
      case "timer":
        return "⏱️ Temporizador";
      case "voice":
        return "🎙️ Grabación de voz";
      default:
        return type;
    }
  };

  const handleSave = async () => {
    if (!editName.trim()) return;

    setIsSaving(true);
    try {
      await onUpdate(option.id, {
        name: editName.trim(),
        description: null,
        question_type: editQuestionType,
        options: editOptions.length > 0 ? editOptions : null,
        is_mandatory: editIsMandatory,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving question:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditName(option.name);
    setEditQuestionType(option.question_type);
    setEditOptions(option.options || []);
    setEditIsMandatory(option.is_mandatory || false);
    setIsEditing(false);
  };

  const addOption = () => {
    if (newOption.trim() && !editOptions.includes(newOption.trim())) {
      setEditOptions([...editOptions, newOption.trim()]);
      setNewOption("");
    }
  };

  const removeOption = (optionToRemove: string) => {
    setEditOptions(editOptions.filter((opt) => opt !== optionToRemove));
  };

  if (isEditing) {
    return (
      <div className="bg-white border border-blue-300 rounded-lg shadow-sm hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-blue-200 bg-blue-50/50 rounded-t-lg">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className="flex flex-col gap-0.5 flex-shrink-0">
              <Button
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
                variant="ghost"
                size="sm"
                className="h-4 w-5 p-0 text-blue-400 hover:text-blue-600 hover:bg-blue-100 disabled:opacity-30"
                title="Mover hacia arriba"
              >
                <ChevronUp size={14} />
              </Button>
              <Button
                onClick={() => onMoveDown(index)}
                disabled={index === totalOptions - 1}
                variant="ghost"
                size="sm"
                className="h-4 w-5 p-0 text-blue-400 hover:text-blue-600 hover:bg-blue-100 disabled:opacity-30"
                title="Mover hacia abajo"
              >
                <ChevronDown size={14} />
              </Button>
            </div>
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-sm flex-shrink-0">
              <span className="text-xs font-bold text-white">{index + 1}</span>
            </div>
            <h4 className="text-sm font-semibold text-gray-900 break-words min-w-0 flex-1">
              Editando Pregunta {index + 1}
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || !editName.trim()}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs px-3"
            >
              {isSaving ? (
                <Loader2 size={12} className="mr-1 animate-spin" />
              ) : (
                <Save size={12} className="mr-1" />
              )}
              Guardar
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              size="sm"
              className="h-7 text-xs px-3"
            >
              Cancelar
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Question Name */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-700">
              Nombre de la Pregunta *
            </Label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Ej: ¿Cómo se comporta el usuario?"
              className="text-sm h-8 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Question Type and Mandatory Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs font-medium text-gray-700">
                Tipo de Pregunta
              </Label>
              <Select
                value={editQuestionType}
                onValueChange={(value) => setEditQuestionType(value)}
              >
                <SelectTrigger className="w-full h-8 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                  <SelectValue placeholder="Seleccionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">📝 Texto libre</SelectItem>
                  <SelectItem value="boolean">✅ Sí/No</SelectItem>
                  <SelectItem value="radio">🔘 Opción única</SelectItem>
                  <SelectItem value="checkbox">
                    ☑️ Múltiples opciones
                  </SelectItem>
                  <SelectItem value="counter">🔢 Contador</SelectItem>
                  <SelectItem value="timer">⏱️ Temporizador</SelectItem>
                  <SelectItem value="voice">🎙️ Grabación de voz</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Label className="text-xs font-medium text-gray-700 whitespace-nowrap">
                Obligatoria
              </Label>
              <Switch
                checked={editIsMandatory}
                onCheckedChange={setEditIsMandatory}
              />
            </div>
          </div>

          {/* Options for Radio/Checkbox */}
          {(editQuestionType === "radio" ||
            editQuestionType === "checkbox") && (
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-gray-700">
                  Opciones de Respuesta
                </Label>
                <Button
                  onClick={addOption}
                  variant="outline"
                  size="sm"
                  disabled={editOptions.length >= 10}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50 h-7 text-xs px-2"
                >
                  <Plus size={12} className="mr-1" />
                  Agregar
                </Button>
              </div>

              <div className="space-y-2">
                {editOptions.map((opt, optIndex) => (
                  <div key={optIndex} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-gray-600">
                        {optIndex + 1}
                      </span>
                    </div>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOptions = [...editOptions];
                        newOptions[optIndex] = e.target.value;
                        setEditOptions(newOptions);
                      }}
                      placeholder={`Opción ${optIndex + 1}`}
                      className="flex-1 h-7 text-sm"
                    />
                    <Button
                      onClick={() => removeOption(opt)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
                    >
                      <X size={12} />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Agregar nueva opción"
                  className="flex-1 h-7 text-sm"
                  onKeyPress={(e) => e.key === "Enter" && addOption()}
                />
                <Button
                  onClick={addOption}
                  disabled={!newOption.trim()}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                >
                  <Plus size={12} className="mr-1" />
                  Agregar
                </Button>
              </div>
            </div>
          )}

          {/* Conditional Logic - All Questions Can Be Conditional (except the first one) */}
          {index > 0 && (
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-gray-700">
                  Lógica Condicional
                </Label>
                <Button
                  onClick={() => {
                    onUpdate(option.id, { depends_on_question: 0 });
                  }}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-200 hover:bg-blue-50 h-7 text-xs px-2"
                >
                  <Plus size={12} className="mr-1" />
                  Agregar Condición
                </Button>
              </div>

              {option.depends_on_question !== undefined &&
              option.depends_on_question !== null &&
              option.depends_on_question >= 0 ? (
                <div className="space-y-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-medium text-gray-700 whitespace-nowrap">
                      Mostrar esta pregunta si:
                    </Label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">
                        Pregunta anterior
                      </Label>
                      <Select
                        value={option.depends_on_question?.toString() || ""}
                        onValueChange={(value) =>
                          onUpdate(option.id, {
                            depends_on_question: parseInt(value),
                          })
                        }
                      >
                        <SelectTrigger className="h-7 text-sm">
                          <SelectValue placeholder="Seleccionar pregunta" />
                        </SelectTrigger>
                        <SelectContent>
                          {options
                            .filter(
                              (opt, optIndex) =>
                                optIndex < index &&
                                opt.id !== option.id &&
                                opt.question_type === "radio"
                            )
                            .map((opt, optIndex) => (
                              <SelectItem
                                key={opt.id}
                                value={optIndex.toString()}
                              >
                                {opt.name}
                              </SelectItem>
                            ))}
                          {options.filter(
                            (opt, optIndex) =>
                              optIndex < index &&
                              opt.id !== option.id &&
                              opt.question_type === "radio"
                          ).length === 0 && (
                            <div className="px-2 py-1.5 text-xs text-gray-500">
                              No hay preguntas de opción única anteriores
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">
                        Respuesta específica
                      </Label>
                      {option.depends_on_question !== undefined &&
                      option.depends_on_question >= 0 ? (
                        (() => {
                          const selectedQuestion =
                            options[option.depends_on_question];

                          // Only radio questions are supported for conditional logic
                          if (
                            selectedQuestion?.question_type === "radio" &&
                            selectedQuestion?.options?.length > 0
                          ) {
                            return (
                              <Select
                                value={option.depends_on_answer || ""}
                                onValueChange={(value) =>
                                  onUpdate(option.id, {
                                    depends_on_answer: value,
                                  })
                                }
                              >
                                <SelectTrigger className="h-7 text-sm">
                                  <SelectValue placeholder="Seleccionar respuesta" />
                                </SelectTrigger>
                                <SelectContent>
                                  {selectedQuestion.options.map(
                                    (opt, optIndex) => (
                                      <SelectItem key={optIndex} value={opt}>
                                        {opt}
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                            );
                          }

                          return (
                            <div className="h-7 px-3 py-1 text-xs text-gray-500 bg-gray-50 rounded border border-gray-200 flex items-center">
                              La pregunta seleccionada no tiene opciones
                            </div>
                          );
                        })()
                      ) : (
                        <div className="h-7 px-3 py-1 text-xs text-gray-500 bg-gray-50 rounded border border-gray-200 flex items-center">
                          Selecciona una pregunta anterior primero
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => {
                        onUpdate(option.id, {
                          depends_on_question: null,
                          depends_on_answer: null,
                        });
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X size={12} className="mr-1" />
                      Remover Condición
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2 text-gray-500 bg-gray-50 rounded-md border-2 border-dashed border-gray-200">
                  <p className="text-xs">Esta pregunta se mostrará siempre</p>
                  <p className="text-xs mt-1">
                    Haz clic en "Agregar Condición" para hacerla condicional
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50/50 rounded-t-lg">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <div className="flex flex-col gap-0.5 flex-shrink-0">
            <Button
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              variant="ghost"
              size="sm"
              className="h-4 w-5 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30"
              title="Mover hacia arriba"
            >
              <ChevronUp size={14} />
            </Button>
            <Button
              onClick={() => onMoveDown(index)}
              disabled={index === totalOptions - 1}
              variant="ghost"
              size="sm"
              className="h-4 w-5 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30"
              title="Mover hacia abajo"
            >
              <ChevronDown size={14} />
            </Button>
          </div>
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-xs font-bold text-white">{index + 1}</span>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 break-words min-w-0 flex-1">
            {option.name}
          </h4>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
            title="Editar pregunta"
          >
            <Edit2 size={12} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleVisibility(option.id, !option.is_visible)}
            className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
            title={option.is_visible ? "Ocultar opción" : "Mostrar opción"}
          >
            {option.is_visible ? (
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            ) : (
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                />
              </svg>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(option.id)}
            className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
            title="Eliminar opción"
          >
            <Trash2 size={12} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border-blue-200"
          >
            {getQuestionTypeLabel(option.question_type)}
          </Badge>
          <Badge
            className={`text-xs px-2 py-1 ${
              option.is_visible
                ? "bg-green-100 text-green-800 border-green-200"
                : "bg-gray-100 text-gray-600 border-gray-200"
            }`}
          >
            {option.is_visible ? "Visible" : "Oculta"}
          </Badge>
          {(option.is_mandatory || false) && (
            <Badge className="text-xs px-2 py-1 bg-red-100 text-red-800 border-red-200">
              Obligatoria
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectSettingsPageContent() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);

  // Get user's role in this project
  const { role: userRole, isLoading: isLoadingRole } = useProjectRole(
    projectId,
    user?.id || "",
    project?.created_by || ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);
  const [isFinishingProject, setIsFinishingProject] = useState(false);
  const [options, setOptions] = useState<ProjectObservationOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveReminder, setShowSaveReminder] = useState(false);

  // Form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAgencies, setEditAgencies] = useState<string[]>([]);
  const [newAgency, setNewAgency] = useState("");

  // User management state
  const [projectUsers, setProjectUsers] = useState<
    Array<{
      id: string;
      user_id: string;
      user_email: string;
      role: "admin" | "editor" | "viewer";
      created_at: string;
    }>
  >([]);
  const [allUsers, setAllUsers] = useState<
    Array<{ id: string; user_id: string; email: string }>
  >([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isRemovingUser, setIsRemovingUser] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserRole, setSelectedUserRole] = useState<
    "admin" | "editor" | "viewer"
  >("viewer");

  // Move option up
  const moveOptionUp = async (index: number) => {
    if (index > 0) {
      const newOptions = [...options];
      [newOptions[index - 1], newOptions[index]] = [
        newOptions[index],
        newOptions[index - 1],
      ];
      setOptions(newOptions);

      // Update order in database
      try {
        await supabase
          .from("project_observation_options")
          .update({ order: index })
          .eq("id", newOptions[index].id);

        await supabase
          .from("project_observation_options")
          .update({ order: index + 1 })
          .eq("id", newOptions[index - 1].id);
      } catch (error) {
        console.error("Error updating question order:", error);
        // Revert on error
        setOptions(options);
      }
    }
  };

  // Move option down
  const moveOptionDown = async (index: number) => {
    if (index < options.length - 1) {
      const newOptions = [...options];
      [newOptions[index], newOptions[index + 1]] = [
        newOptions[index + 1],
        newOptions[index],
      ];
      setOptions(newOptions);

      // Update order in database
      try {
        await supabase
          .from("project_observation_options")
          .update({ order: index + 1 })
          .eq("id", newOptions[index].id);

        await supabase
          .from("project_observation_options")
          .update({ order: index + 2 })
          .eq("id", newOptions[index + 1].id);
      } catch (error) {
        console.error("Error updating question order:", error);
        // Revert on error
        setOptions(options);
      }
    }
  };

  // Load project from URL parameter
  const loadProject = useCallback(async () => {
    if (!projectId) {
      setIsLoadingProject(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      setProject(data);
      setEditName(data.name);
      setEditDescription(data.description || "");
      setEditAgencies(data.agencies || []);
    } catch (error) {
      console.error("Error loading project:", error);
      setError("Error al cargar el proyecto");
    } finally {
      setIsLoadingProject(false);
    }
  }, [projectId]);

  // Load observation options
  const loadObservationOptions = useCallback(async () => {
    if (!project) return;

    setIsLoadingOptions(true);
    try {
      const { data, error } = await supabase
        .from("project_observation_options")
        .select("*")
        .eq("project_id", project.id)
        .order("order", { ascending: true });

      if (error) throw error;
      setOptions(data || []);
    } catch (error) {
      console.error("Error loading observation options:", error);
      setError("Error al cargar las opciones de observación");
    } finally {
      setIsLoadingOptions(false);
    }
  }, [project]);

  // Load project users
  const loadProjectUsers = useCallback(async () => {
    if (!project) return;

    setIsLoadingUsers(true);

    // Always set empty array initially to avoid errors
    setProjectUsers([]);

    // Try a simple test query first to see if the table exists
    try {
      const { error: testError } = await supabase
        .from("project_users")
        .select("id")
        .limit(0);

      if (testError) {
        console.log("project_users table test failed:", testError);
        console.log("Skipping user management - table doesn't exist");
        return;
      }
    } catch (testErr) {
      console.log("project_users table test exception:", testErr);
      console.log("Skipping user management - table doesn't exist");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("project_users")
        .select("*")
        .eq("project_id", project.id);

      if (error) {
        // If the table doesn't exist, just set empty array and continue
        const errorMessage = error.message || "";
        const errorCode = error.code || "";

        if (
          errorCode === "PGRST116" ||
          errorMessage.includes('relation "project_users" does not exist') ||
          errorMessage.includes("does not exist") ||
          errorMessage.includes("relation") ||
          errorCode === "42P01" || // PostgreSQL error code for "relation does not exist"
          errorCode === "PGRST202" // PostgREST error for missing relation
        ) {
          console.log(
            "project_users table doesn't exist yet, skipping user management"
          );
          return;
        }
        throw error;
      }

      // Get user emails for the project users
      if (data && data.length > 0) {
        try {
          const userIds = data.map((pu) => pu.user_id);
          const { data: userEmails, error: emailError } = await supabase.rpc(
            "get_user_emails",
            { user_ids: userIds }
          );

          if (emailError) {
            console.error("Error loading user emails:", emailError);
            // Fallback: just use the data without emails
            setProjectUsers(
              data.map((pu) => ({ ...pu, user_email: pu.user_id }))
            );
          } else {
            // Map user emails to project users
            const projectUsersWithEmails = data.map((pu) => ({
              ...pu,
              user_email:
                userEmails?.find(
                  (ue: { user_id: string; email: string }) =>
                    ue.user_id === pu.user_id
                )?.email || pu.user_id,
            }));
            setProjectUsers(projectUsersWithEmails);
          }
        } catch (emailError) {
          console.error("Error in email loading:", emailError);
          // Fallback: just use the data without emails
          setProjectUsers(
            data.map((pu) => ({ ...pu, user_email: pu.user_id }))
          );
        }
      }
    } catch (error) {
      console.error("Error loading project users:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        code: (error as { code?: string; message?: string })?.code,
        details: error,
      });

      // Check if this is a "table doesn't exist" error
      const errorMessage =
        (error as { code?: string; message?: string })?.message || "";
      const errorCode =
        (error as { code?: string; message?: string })?.code || "";

      const isTableMissingError =
        errorCode === "PGRST116" ||
        errorMessage.includes('relation "project_users" does not exist') ||
        errorMessage.includes("does not exist") ||
        errorMessage.includes("relation") ||
        errorCode === "42P01" ||
        errorCode === "PGRST202";

      // Don't set error state for missing table, just log it
      if (!isTableMissingError) {
        setError("Error al cargar los usuarios del proyecto");
      }
    } finally {
      setIsLoadingUsers(false);
    }
  }, [project]);

  // Load all users for the combobox
  const loadAllUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("get_all_users");

      if (error) {
        // If the function doesn't exist, just set empty array and continue
        if (
          error.code === "PGRST202" ||
          error.message?.includes("function get_all_users") ||
          error.message?.includes("does not exist")
        ) {
          console.log(
            "get_all_users function doesn't exist yet, skipping user management"
          );
          setAllUsers([]);
          return;
        }
        throw error;
      }
      setAllUsers(data || []);
    } catch (error) {
      console.error("Error loading all users:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        code: (error as { code?: string; message?: string })?.code,
        details: error,
      });
      // Don't set error state for missing function, just log it
      if (
        !(
          (error as { code?: string; message?: string })?.code === "PGRST202" ||
          (error as { code?: string; message?: string })?.message?.includes(
            "function get_all_users"
          ) ||
          (error as { code?: string; message?: string })?.message?.includes(
            "does not exist"
          )
        )
      ) {
        setError("Error al cargar los usuarios");
      }
      setAllUsers([]);
    }
  }, []);

  // Add user to project
  const addUserToProject = async () => {
    if (!project || !selectedUserId || !user || isAddingUser) return;

    setIsAddingUser(true);

    // First, check if the table exists by trying a simple query
    try {
      const { error: testError } = await supabase
        .from("project_users")
        .select("id")
        .limit(0);

      if (testError) {
        console.log("project_users table test failed:", testError);
        setError(
          "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
        );
        return;
      }
    } catch (testErr) {
      console.log("project_users table test exception:", testErr);
      setError(
        "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
      );
      return;
    }

    try {
      const { error } = await supabase.from("project_users").insert({
        project_id: project.id,
        user_id: selectedUserId,
        added_by: user.id,
        role: selectedUserRole,
      });

      if (error) {
        // Check if this is a "table doesn't exist" error
        const errorMessage = error.message || "";
        const errorCode = error.code || "";

        if (
          errorCode === "PGRST116" ||
          errorMessage.includes('relation "project_users" does not exist') ||
          errorMessage.includes("does not exist") ||
          errorMessage.includes("relation") ||
          errorCode === "42P01" || // PostgreSQL error code for "relation does not exist"
          errorCode === "PGRST202" // PostgREST error for missing relation
        ) {
          setError(
            "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
          );
          return;
        }
        throw error;
      }
      await loadProjectUsers();
      setSelectedUserId("");
      setSelectedUserRole("viewer");
    } catch (error) {
      console.error("Error adding user to project:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        code: (error as { code?: string; message?: string })?.code,
        details: error,
      });

      // Check if this is a "table doesn't exist" error
      const errorMessage =
        (error as { code?: string; message?: string })?.message || "";
      const errorCode =
        (error as { code?: string; message?: string })?.code || "";

      const isTableMissingError =
        errorCode === "PGRST116" ||
        errorMessage.includes('relation "project_users" does not exist') ||
        errorMessage.includes("does not exist") ||
        errorMessage.includes("relation") ||
        errorCode === "42P01" ||
        errorCode === "PGRST202";

      if (isTableMissingError) {
        setError(
          "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
        );
      } else {
        setError("Error al agregar usuario al proyecto");
      }
    } finally {
      setIsAddingUser(false);
    }
  };

  // Remove user from project
  const removeUserFromProject = async (userId: string) => {
    if (!project || isRemovingUser) return;

    setIsRemovingUser(true);

    // First, check if the table exists by trying a simple query
    try {
      const { error: testError } = await supabase
        .from("project_users")
        .select("id")
        .limit(0);

      if (testError) {
        console.log("project_users table test failed:", testError);
        setError(
          "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
        );
        return;
      }
    } catch (testErr) {
      console.log("project_users table test exception:", testErr);
      setError(
        "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
      );
      return;
    }

    try {
      const { error } = await supabase
        .from("project_users")
        .delete()
        .eq("project_id", project.id)
        .eq("user_id", userId);

      if (error) {
        // Check if this is a "table doesn't exist" error
        const errorMessage = error.message || "";
        const errorCode = error.code || "";

        if (
          errorCode === "PGRST116" ||
          errorMessage.includes('relation "project_users" does not exist') ||
          errorMessage.includes("does not exist") ||
          errorMessage.includes("relation") ||
          errorCode === "42P01" || // PostgreSQL error code for "relation does not exist"
          errorCode === "PGRST202" // PostgREST error for missing relation
        ) {
          setError(
            "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
          );
          return;
        }
        throw error;
      }
      await loadProjectUsers();
    } catch (error) {
      console.error("Error removing user from project:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        code: (error as { code?: string; message?: string })?.code,
        details: error,
      });

      // Check if this is a "table doesn't exist" error
      const errorMessage =
        (error as { code?: string; message?: string })?.message || "";
      const errorCode =
        (error as { code?: string; message?: string })?.code || "";

      const isTableMissingError =
        errorCode === "PGRST116" ||
        errorMessage.includes('relation "project_users" does not exist') ||
        errorMessage.includes("does not exist") ||
        errorMessage.includes("relation") ||
        errorCode === "42P01" ||
        errorCode === "PGRST202";

      if (isTableMissingError) {
        setError(
          "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
        );
      } else {
        setError("Error al remover usuario del proyecto");
      }
    } finally {
      setIsRemovingUser(false);
    }
  };

  // Add agency
  const addAgency = () => {
    if (newAgency.trim() && !editAgencies.includes(newAgency.trim())) {
      setEditAgencies([...editAgencies, newAgency.trim()]);
      setNewAgency("");
      setHasUnsavedChanges(true);
      setShowSaveReminder(true);

      // Auto-hide the reminder after 5 seconds
      setTimeout(() => {
        setShowSaveReminder(false);
      }, 5000);
    }
  };

  // Remove agency
  const removeAgency = (agency: string) => {
    setEditAgencies(editAgencies.filter((a) => a !== agency));
    setHasUnsavedChanges(true);
    setShowSaveReminder(true);

    // Auto-hide the reminder after 5 seconds
    setTimeout(() => {
      setShowSaveReminder(false);
    }, 5000);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (projectId && user) {
      loadProject();
    } else if (!projectId) {
      router.push("/projects");
    }
  }, [projectId, user, loadProject, router]);

  useEffect(() => {
    if (project) {
      loadObservationOptions();
      loadProjectUsers();
      loadAllUsers();
      // Reset unsaved changes when project loads
      setHasUnsavedChanges(false);
      setShowSaveReminder(false);
    }
  }, [project, loadObservationOptions, loadProjectUsers, loadAllUsers]);

  // Track changes to project name and description
  useEffect(() => {
    if (project) {
      const hasChanges =
        editName !== project.name ||
        editDescription !== (project.description || "") ||
        JSON.stringify(editAgencies.sort()) !==
          JSON.stringify((project.agencies || []).sort());

      setHasUnsavedChanges(hasChanges);
    }
  }, [project, editName, editDescription, editAgencies]);

  const handleUpdateProject = async () => {
    if (!project || !user) return;

    setIsSaving(true);
    try {
      // Try to update with agencies first
      const updateData: {
        name: string;
        description: string | null;
        updated_at: string;
        agencies?: string[];
      } = {
        name: editName.trim(),
        description: editDescription.trim() || null,
        updated_at: new Date().toISOString(),
      };

      // Only include agencies if the column exists
      try {
        updateData.agencies = editAgencies;
      } catch {
        // If agencies column doesn't exist, just skip it
        console.log("Agencies column doesn't exist, skipping agencies update");
      }

      const { error } = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", project.id)
        .eq("created_by", user.id);

      if (error) {
        // If agencies column doesn't exist, try without it
        if (error.message?.includes('column "agencies" does not exist')) {
          console.log(
            "Agencies column doesn't exist, updating without agencies"
          );
          const { error: retryError } = await supabase
            .from("projects")
            .update({
              name: editName.trim(),
              description: editDescription.trim() || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", project.id)
            .eq("created_by", user.id);

          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }

      // Update local state
      setProject((prev) =>
        prev
          ? {
              ...prev,
              name: editName.trim(),
              description: editDescription.trim() || null,
              agencies: editAgencies,
            }
          : null
      );

      // Reset unsaved changes flag
      setHasUnsavedChanges(false);
      setShowSaveReminder(false);
    } catch (error) {
      console.error("Error updating project:", error);
      setError("Error al actualizar el proyecto");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project || !user) return;

    setIsDeletingProject(true);
    try {
      console.log("🗑️ Starting project deletion:", project.id);

      // Step 1: Get all sessions for this project to delete voice recordings
      const { data: sessions, error: sessionsError } = await supabase
        .from("sessions")
        .select("id")
        .eq("project_id", project.id);

      if (sessionsError) {
        console.error("Error fetching sessions:", sessionsError);
        throw sessionsError;
      }

      // Step 2: Delete voice recordings from storage if sessions exist
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map((s) => s.id);

        // Get all observations with voice recordings
        const { data: observations, error: obsError } = await supabase
          .from("observations")
          .select("response")
          .in("session_id", sessionIds);

        if (obsError) {
          console.error("Error fetching observations:", obsError);
          // Continue with deletion even if this fails
        }

        // Extract and delete voice recordings from Supabase Storage
        if (observations && observations.length > 0) {
          const voiceRecordings = observations
            .map((obs) => {
              if (
                typeof obs.response === "string" &&
                obs.response.includes("[Audio:")
              ) {
                const audioUrlMatch = obs.response.match(/\[Audio: (.*?)\]/);
                if (audioUrlMatch) {
                  const audioUrl = audioUrlMatch[1];
                  const urlParts = audioUrl.split("/");
                  const filename = urlParts[urlParts.length - 1];
                  return filename;
                }
              }
              return null;
            })
            .filter(Boolean);

          if (voiceRecordings.length > 0) {
            const { error: storageError } = await supabase.storage
              .from("voice-recordings")
              .remove(voiceRecordings as string[]);

            if (storageError) {
              console.error("Error deleting voice recordings:", storageError);
              // Continue with deletion even if storage deletion fails
            } else {
              console.log(
                `✅ Deleted ${voiceRecordings.length} voice recordings`
              );
            }
          }
        }

        // Step 3: Delete all observations for this project
        const { error: deleteObsError } = await supabase
          .from("observations")
          .delete()
          .in("session_id", sessionIds);

        if (deleteObsError) {
          console.error("Error deleting observations:", deleteObsError);
          throw new Error(
            `Error al eliminar observaciones: ${deleteObsError.message}`
          );
        }
        console.log("✅ Deleted observations");

        // Step 4: Delete all sessions for this project
        const { error: deleteSessionsError } = await supabase
          .from("sessions")
          .delete()
          .eq("project_id", project.id);

        if (deleteSessionsError) {
          console.error("Error deleting sessions:", deleteSessionsError);
          throw new Error(
            `Error al eliminar sesiones: ${deleteSessionsError.message}`
          );
        }
        console.log("✅ Deleted sessions");
      }

      // Step 5: Delete all observation options (questions) for this project
      const { error: deleteOptionsError } = await supabase
        .from("project_observation_options")
        .delete()
        .eq("project_id", project.id);

      if (deleteOptionsError) {
        console.error(
          "Error deleting observation options:",
          deleteOptionsError
        );
        throw new Error(
          `Error al eliminar preguntas: ${deleteOptionsError.message}`
        );
      }
      console.log("✅ Deleted observation options");

      // Step 6: Delete project users (if table exists)
      const { error: deleteUsersError } = await supabase
        .from("project_users")
        .delete()
        .eq("project_id", project.id);

      if (deleteUsersError && deleteUsersError.code !== "42P01") {
        // Ignore "table doesn't exist" error
        console.error("Error deleting project users:", deleteUsersError);
        // Don't throw - continue with project deletion
      } else if (!deleteUsersError) {
        console.log("✅ Deleted project users");
      }

      // Step 7: Delete the project itself
      const { error: deleteProjectError } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id)
        .eq("created_by", user.id);

      if (deleteProjectError) {
        console.error("Error deleting project:", deleteProjectError);
        throw new Error(
          `Error al eliminar proyecto: ${deleteProjectError.message}`
        );
      }
      console.log("✅ Deleted project");

      // Redirect to projects page
      router.push("/projects");
    } catch (error) {
      console.error("Error deleting project:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Error inesperado al eliminar el proyecto"
      );
    } finally {
      setIsDeletingProject(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleFinishProject = async () => {
    if (!project || !user) return;

    setIsFinishingProject(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ is_finished: true })
        .eq("id", project.id)
        .eq("created_by", user.id);

      if (error) throw error;

      // Update local state
      setProject({ ...project, is_finished: true });
      setError(null);
    } catch (error) {
      console.error("Error finishing project:", error);
      setError("Error al finalizar el proyecto");
    } finally {
      setIsFinishingProject(false);
      setIsFinishDialogOpen(false);
    }
  };

  const handleAddOption = async () => {
    if (!project) return;

    setIsAddingOption(true);
    try {
      const insertData: {
        project_id: string;
        name: string;
        description: string | null;
        question_type: string;
        options: string[] | null;
        is_visible: boolean;
        is_mandatory: boolean;
        order: number;
      } = {
        project_id: project.id,
        name: "",
        description: null,
        question_type: "string",
        options: null,
        is_visible: true,
        is_mandatory: false,
        order: options.length + 1,
      };

      const { error } = await supabase
        .from("project_observation_options")
        .insert(insertData);

      if (error) {
        throw error;
      }

      loadObservationOptions();
    } catch (error) {
      console.error("Error adding observation option:", error);
      setError("Error al agregar opción de observación");
    } finally {
      setIsAddingOption(false);
    }
  };

  const handleToggleOptionVisibility = async (
    optionId: string,
    currentVisibility: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("project_observation_options")
        .update({ is_visible: !currentVisibility })
        .eq("id", optionId);

      if (error) throw error;

      loadObservationOptions();
    } catch (error) {
      console.error("Error toggling option visibility:", error);
      setError("Error al cambiar visibilidad de la opción");
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    try {
      const { error } = await supabase
        .from("project_observation_options")
        .delete()
        .eq("id", optionId);

      if (error) throw error;

      loadObservationOptions();
    } catch (error) {
      console.error("Error deleting option:", error);
      setError("Error al eliminar la opción");
    }
  };

  const handleUpdateOption = async (
    optionId: string,
    updates: Partial<ProjectObservationOption>
  ) => {
    try {
      // Filter out conditional logic fields if they don't exist in the database yet
      const { depends_on_question, depends_on_answer, ...dbUpdates } = updates;

      // Only update database fields that exist
      const { error } = await supabase
        .from("project_observation_options")
        .update(dbUpdates)
        .eq("id", optionId);

      if (error) throw error;

      // Update local state with all updates (including conditional logic)
      setOptions((prevOptions) =>
        prevOptions.map((option) =>
          option.id === optionId ? { ...option, ...updates } : option
        )
      );
    } catch (error) {
      console.error("Error updating option:", error);
      setError("Error al actualizar la opción");
      throw error; // Re-throw to let the component handle it
    }
  };

  const handleBackToProjects = () => {
    router.push("/projects");
  };

  if (authLoading || isLoadingProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/50 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || !project) {
    return null; // Will redirect
  }

  const isCreator = user.id === project.created_by;

  // Check if user can access settings at all
  if (!canAccessSettings(userRole)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-md text-center px-6">
          <div className="mb-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔒</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Acceso Restringido
            </h2>
            <p className="text-gray-600">
              No tienes permisos para acceder a la configuración de este
              proyecto. Los observadores solo pueden registrar sesiones.
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/50 to-background">
      {/* Header */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-3 sm:px-4">
          <div className="flex h-12 sm:h-14 items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                onClick={handleBackToProjects}
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
              >
                <ArrowLeft size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Proyectos</span>
              </Button>
              <div>
                <h1 className="text-base sm:text-lg font-semibold">
                  Configuración del Proyecto
                </h1>
                <p className="text-xs text-muted-foreground truncate max-w-32 sm:max-w-none">
                  {project.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        <div className="space-y-4 sm:space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {showSaveReminder && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>
                  ¡Recuerda hacer clic en "Guardar Cambios" para guardar las
                  modificaciones!
                </span>
              </div>
              <button
                onClick={() => setShowSaveReminder(false)}
                className="text-blue-500 hover:text-blue-700 ml-2"
                aria-label="Cerrar notificación"
                title="Cerrar notificación"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Project Information */}
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
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nombre del proyecto"
                  disabled={!canEditProject(userRole)}
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
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Descripción del proyecto (opcional)"
                  rows={3}
                  disabled={!canEditProject(userRole)}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              {canEditProject(userRole) && (
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleUpdateProject}
                    disabled={isSaving || !editName.trim()}
                    className={`${
                      hasUnsavedChanges
                        ? "bg-orange-600 hover:bg-orange-700 ring-2 ring-orange-200"
                        : "bg-blue-600 hover:bg-blue-700"
                    } text-white transition-all duration-200`}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        {hasUnsavedChanges && (
                          <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                        )}
                        Guardar Cambios
                        {hasUnsavedChanges && " *"}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Agencies Management */}
          {canAddAgencies(userRole) && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">
                  Agencias
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Define las agencias disponibles para este proyecto
                </p>
              </div>
              <div className="p-6 space-y-4">
                {/* Add Agency Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Agregar Agencia
                  </h3>
                  <div className="flex gap-3">
                    <Input
                      value={newAgency}
                      onChange={(e) => setNewAgency(e.target.value)}
                      placeholder="Nombre de la agencia"
                      className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors"
                      onKeyPress={(e) => e.key === "Enter" && addAgency()}
                    />
                    <Button
                      onClick={addAgency}
                      disabled={!newAgency.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Agregar
                    </Button>
                  </div>
                </div>

                {/* Current Agencies List */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Agencias Configuradas ({editAgencies.length})
                  </h3>
                  {editAgencies.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No hay agencias configuradas</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {editAgencies.map((agency, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-green-600 text-xs font-medium">
                                {agency.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {agency}
                            </span>
                          </div>
                          <Button
                            onClick={() => removeAgency(agency)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* User Management */}
          {canManageUsers(userRole) && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">
                  Usuarios del Proyecto
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Gestiona quién puede acceder a este proyecto
                </p>
              </div>
              <div className="p-6">
                <UserManagement
                  projectId={project.id}
                  projectCreatorId={project.created_by}
                  currentUserId={user.id}
                  currentUserRole={userRole}
                  mode="edit"
                />
              </div>
            </div>
          )}

          {/* OLD USER MANAGEMENT - TO BE REMOVED */}
          {false && isCreator && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">
                  OLD - Usuarios del Proyecto
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {/* Add User Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Agregar Usuario
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,auto] gap-3">
                    <div>
                      <Select
                        value={selectedUserId}
                        onValueChange={setSelectedUserId}
                        disabled={isAddingUser}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar usuario..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allUsers
                            .filter(
                              (u) =>
                                !projectUsers.some(
                                  (pu) => pu.user_id === u.user_id
                                )
                            )
                            .map((user) => (
                              <SelectItem
                                key={user.user_id}
                                value={user.user_id}
                              >
                                {user.email}
                              </SelectItem>
                            ))}
                          {allUsers.filter(
                            (u) =>
                              !projectUsers.some(
                                (pu) => pu.user_id === u.user_id
                              )
                          ).length === 0 && (
                            <div className="px-2 py-1.5 text-sm text-gray-500">
                              No hay usuarios disponibles
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:w-48">
                      <Select
                        value={selectedUserRole}
                        onValueChange={(value: "admin" | "editor" | "viewer") =>
                          setSelectedUserRole(value)
                        }
                        disabled={isAddingUser}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Observador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={addUserToProject}
                      disabled={!selectedUserId || isAddingUser}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      {isAddingUser ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Agregando...</span>
                        </div>
                      ) : (
                        "Agregar"
                      )}
                    </Button>
                  </div>
                </div>

                {/* Current Users List */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Usuarios con Acceso ({projectUsers.length})
                  </h3>
                  {isLoadingUsers ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <p className="text-sm">Cargando usuarios...</p>
                      </div>
                    </div>
                  ) : projectUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No hay usuarios agregados</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {projectUsers.map((projectUser) => (
                        <div
                          key={projectUser.id}
                          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                projectUser.user_id === project?.created_by
                                  ? "bg-green-100"
                                  : "bg-blue-100"
                              }`}
                            >
                              <span
                                className={`text-sm font-medium ${
                                  projectUser.user_id === project?.created_by
                                    ? "text-green-600"
                                    : "text-blue-600"
                                }`}
                              >
                                {(projectUser.user_email || projectUser.user_id)
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900">
                                  {projectUser.user_email ||
                                    projectUser.user_id}
                                </p>
                                {projectUser.user_id === project?.created_by ? (
                                  <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                                    Creador
                                  </Badge>
                                ) : (
                                  (() => {
                                    const roleColor = getRoleColor(
                                      projectUser.role as UserRole
                                    );
                                    return (
                                      <Badge
                                        className={`${roleColor.bg} ${roleColor.text} hover:${roleColor.bg}`}
                                      >
                                        {getRoleLabel(
                                          projectUser.role as UserRole
                                        )}
                                      </Badge>
                                    );
                                  })()
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                {projectUser.user_id === project?.created_by
                                  ? "Control total del proyecto"
                                  : `Agregado el ${new Date(
                                      projectUser.created_at
                                    ).toLocaleDateString()}`}
                              </p>
                            </div>
                          </div>
                          {projectUser.user_id !== project?.created_by && (
                            <Button
                              onClick={() =>
                                removeUserFromProject(projectUser.user_id)
                              }
                              disabled={isRemovingUser}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
                            >
                              {isRemovingUser ? (
                                <Loader2
                                  size={16}
                                  className="mr-1 animate-spin"
                                />
                              ) : (
                                <Trash2 size={16} className="mr-1" />
                              )}
                              {isRemovingUser ? "Removiendo..." : "Remover"}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Observation Options Management */}
          {canManageQuestions(userRole) && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">
                  Opciones de Observación
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {/* Questions List */}
                {isLoadingOptions ? (
                  <div className="text-center py-8">
                    <Loader2
                      size={20}
                      className="animate-spin mx-auto mb-2 text-gray-400"
                    />
                    <p className="text-sm text-gray-500">
                      Cargando opciones...
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {options.map((option, index) => (
                        <QuestionCard
                          key={`option-${option.id}`}
                          question={option}
                          index={index}
                          totalQuestions={options.length}
                          allQuestions={options}
                          onUpdate={(updates) =>
                            handleUpdateOption(option.id, updates)
                          }
                          onRemove={() => {}}
                          onMoveUp={() => moveOptionUp(index)}
                          onMoveDown={() => moveOptionDown(index)}
                          canDelete={
                            userRole === "creator" || userRole === "admin"
                          }
                          canEdit={
                            userRole === "creator" ||
                            userRole === "admin" ||
                            userRole === "editor"
                          }
                          mode="edit"
                          onToggleVisibility={() =>
                            handleToggleOptionVisibility(
                              option.id,
                              option.is_visible ?? true
                            )
                          }
                          onDelete={() => handleDeleteOption(option.id)}
                        />
                      ))}
                    </div>

                    <Button
                      onClick={handleAddOption}
                      variant="outline"
                      className="w-full"
                      disabled={isAddingOption}
                    >
                      {isAddingOption ? (
                        <>
                          <Loader2 size={16} className="mr-2 animate-spin" />
                          Agregando...
                        </>
                      ) : (
                        <>
                          <Plus size={16} className="mr-2" />
                          Agregar Pregunta
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Finish Project Section */}
          {canFinishProject(userRole) && !project.is_finished && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg">
              <div className="px-6 py-4 border-b border-orange-200">
                <h2 className="text-lg font-semibold text-orange-800">
                  Finalizar Proyecto
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <p className="text-sm text-orange-700">
                    Finalizar el proyecto impedirá que los usuarios registren
                    nuevas observaciones. Solo el creador del proyecto podrá
                    acceder al historial.
                  </p>
                  <AlertDialog
                    open={isFinishDialogOpen}
                    onOpenChange={setIsFinishDialogOpen}
                  >
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
                      >
                        Finalizar Proyecto
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          ¿Finalizar proyecto?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Al finalizar el proyecto "{project.name}", los
                          usuarios no podrán registrar más observaciones. Solo
                          tú (el creador) podrás acceder al historial de
                          sesiones y observaciones.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleFinishProject}
                          disabled={isFinishingProject}
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          {isFinishingProject ? (
                            <>
                              <Loader2
                                size={16}
                                className="mr-2 animate-spin"
                              />
                              Finalizando...
                            </>
                          ) : (
                            "Finalizar Proyecto"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          )}

          {/* Project Finished Notice */}
          {project.is_finished && (
            <div className="bg-gray-100 border border-gray-300 rounded-lg">
              <div className="px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                  <span>✅</span> Proyecto Finalizado
                </h2>
                <p className="text-sm text-gray-600 mt-2">
                  Este proyecto ha sido finalizado. No se pueden registrar
                  nuevas observaciones.
                  {!isCreator && " Solo el creador puede acceder al historial."}
                </p>
              </div>
            </div>
          )}

          {/* Delete Project Section */}
          {canDeleteProject(userRole) && (
            <div className="bg-red-50 border border-red-200 rounded-lg">
              <div className="px-6 py-4 border-b border-red-200">
                <h2 className="text-lg font-semibold text-red-800">
                  Zona de Peligro
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <p className="text-sm text-red-700">
                    Una vez que elimines un proyecto, no hay vuelta atrás. Por
                    favor, ten cuidado.
                  </p>
                  <AlertDialog
                    open={isDeleteDialogOpen}
                    onOpenChange={setIsDeleteDialogOpen}
                  >
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
                          permanentemente el proyecto "{project.name}" y todas
                          sus sesiones y observaciones asociadas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteProject}
                          disabled={isDeletingProject}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {isDeletingProject ? (
                            <>
                              <Loader2
                                size={16}
                                className="mr-2 animate-spin"
                              />
                              Eliminando...
                            </>
                          ) : (
                            "Eliminar"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProjectSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
            Cargando...
          </div>
        </div>
      }
    >
      <ProjectSettingsPageContent />
    </Suspense>
  );
}
