"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  ChevronUp,
  ChevronDown,
  Plus,
  Edit2,
  Save,
  Loader2,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface Question {
  id?: string;
  name: string;
  question_type: string;
  options: string[];
  is_mandatory: boolean;
  is_visible?: boolean;
  depends_on_question_id?: string | null; // Changed from index to question ID
  depends_on_answer?: string | null;
}

interface QuestionCardProps {
  question: Question;
  index: number;
  totalQuestions: number;
  allQuestions: Question[];
  onUpdate: (updates: Partial<Question>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  mode?: "create" | "edit";
  onToggleVisibility?: () => void;
  onDelete?: () => void;
  isSaving?: boolean;
  canDelete?: boolean; // New: control whether delete button shows
  canEdit?: boolean; // New: control whether edit is allowed
}

export default function QuestionCard({
  question,
  index,
  totalQuestions,
  allQuestions,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  mode = "create",
  onToggleVisibility,
  onDelete,
  isSaving = false,
  canDelete = true,
  canEdit = true,
}: QuestionCardProps) {
  const [isEditing, setIsEditing] = useState(mode === "create");
  const [editName, setEditName] = useState(question.name);
  const [editQuestionType, setEditQuestionType] = useState(
    question.question_type
  );
  const [editOptions, setEditOptions] = useState(question.options || []);
  const [newOption, setNewOption] = useState("");
  const [editIsMandatory, setEditIsMandatory] = useState(
    question.is_mandatory || false
  );

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case "string":
        return "📝 Texto libre";
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

    await onUpdate({
      name: editName.trim(),
      question_type: editQuestionType,
      options: editOptions.length > 0 ? editOptions : [],
      is_mandatory: editIsMandatory,
    });

    if (mode === "edit") {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditName(question.name);
    setEditQuestionType(question.question_type);
    setEditOptions(question.options || []);
    setEditIsMandatory(question.is_mandatory || false);
    setIsEditing(false);
  };

  const addOption = () => {
    if (newOption.trim() && !editOptions.includes(newOption.trim())) {
      const newOptions = [...editOptions, newOption.trim()];
      setEditOptions(newOptions);
      setNewOption("");
      if (mode === "create") {
        onUpdate({ options: newOptions });
      }
    }
  };

  const removeOption = (optionToRemove: string) => {
    const newOptions = editOptions.filter((opt) => opt !== optionToRemove);
    setEditOptions(newOptions);
    if (mode === "create") {
      onUpdate({ options: newOptions });
    }
  };

  const updateOption = (optionIndex: number, value: string) => {
    const newOptions = [...editOptions];
    newOptions[optionIndex] = value;
    setEditOptions(newOptions);
    if (mode === "create") {
      onUpdate({ options: newOptions });
    }
  };

  // View mode (only for "edit" mode in settings page)
  if (mode === "edit" && !isEditing) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50/50 rounded-t-lg">
          <div className="flex items-center space-x-2">
            <div className="flex flex-col gap-0.5">
              <Button
                onClick={onMoveUp}
                disabled={index === 0}
                variant="ghost"
                size="sm"
                className="h-4 w-5 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30"
                title="Mover hacia arriba"
              >
                <ChevronUp size={14} />
              </Button>
              <Button
                onClick={onMoveDown}
                disabled={index === totalQuestions - 1}
                variant="ghost"
                size="sm"
                className="h-4 w-5 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30"
                title="Mover hacia abajo"
              >
                <ChevronDown size={14} />
              </Button>
            </div>
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-white">{index + 1}</span>
            </div>
            <h4 className="text-sm font-semibold text-gray-900 truncate">
              {question.name}
            </h4>
          </div>
          <div className="flex items-center gap-1">
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
                title="Editar pregunta"
              >
                <Edit2 size={12} />
              </Button>
            )}
            {onToggleVisibility && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleVisibility}
                className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
                title={
                  question.is_visible ? "Ocultar opción" : "Mostrar opción"
                }
              >
                {question.is_visible ? (
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
            )}
            {onDelete && canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                title="Eliminar opción"
              >
                <Trash2 size={12} />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border-blue-200"
            >
              {getQuestionTypeLabel(question.question_type)}
            </Badge>
            {question.is_visible !== undefined && (
              <Badge
                className={`text-xs px-2 py-1 ${
                  question.is_visible
                    ? "bg-green-100 text-green-800 border-green-200"
                    : "bg-gray-100 text-gray-600 border-gray-200"
                }`}
              >
                {question.is_visible ? "Visible" : "Oculta"}
              </Badge>
            )}
            {(question.is_mandatory || false) && (
              <Badge className="text-xs px-2 py-1 bg-red-100 text-red-800 border-red-200">
                Obligatoria
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Edit mode (for both create and edit modes)
  return (
    <div
      className={`bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow ${
        mode === "edit" ? "border-blue-300" : "border-gray-200"
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between p-3 border-b rounded-t-lg ${
          mode === "edit"
            ? "border-blue-200 bg-blue-50/50"
            : "border-gray-100 bg-gray-50/50"
        }`}
      >
        <div className="flex items-center space-x-2">
          <div className="flex flex-col gap-0.5">
            <Button
              onClick={onMoveUp}
              disabled={index === 0}
              variant="ghost"
              size="sm"
              className={`h-4 w-5 p-0 hover:bg-blue-50 disabled:opacity-30 ${
                mode === "edit"
                  ? "text-blue-400 hover:text-blue-600 hover:bg-blue-100"
                  : "text-gray-400 hover:text-blue-600"
              }`}
              title="Mover hacia arriba"
            >
              <ChevronUp size={14} />
            </Button>
            <Button
              onClick={onMoveDown}
              disabled={index === totalQuestions - 1}
              variant="ghost"
              size="sm"
              className={`h-4 w-5 p-0 hover:bg-blue-50 disabled:opacity-30 ${
                mode === "edit"
                  ? "text-blue-400 hover:text-blue-600 hover:bg-blue-100"
                  : "text-gray-400 hover:text-blue-600"
              }`}
              title="Mover hacia abajo"
            >
              <ChevronDown size={14} />
            </Button>
          </div>
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
            <span className="text-xs font-bold text-white">{index + 1}</span>
          </div>
          <h4 className="text-sm font-semibold text-gray-900">
            {mode === "edit"
              ? `Editando Pregunta ${index + 1}`
              : `Pregunta ${index + 1}`}
          </h4>
        </div>
        {mode === "create" ? (
          <Button
            onClick={onRemove}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
          >
            <X size={14} />
          </Button>
        ) : (
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
        )}
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
            onChange={(e) => {
              setEditName(e.target.value);
              if (mode === "create") {
                onUpdate({ name: e.target.value });
              }
            }}
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
              onValueChange={(value) => {
                setEditQuestionType(value);
                if (mode === "create") {
                  onUpdate({ question_type: value });
                }
              }}
            >
              <SelectTrigger className="w-full h-8 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">📝 Texto libre</SelectItem>
                <SelectItem value="radio">🔘 Opción única</SelectItem>
                <SelectItem value="checkbox">☑️ Múltiples opciones</SelectItem>
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
              onCheckedChange={(checked) => {
                setEditIsMandatory(checked);
                if (mode === "create") {
                  onUpdate({ is_mandatory: checked });
                }
              }}
            />
          </div>
        </div>

        {/* Options for Radio/Checkbox */}
        {(editQuestionType === "radio" || editQuestionType === "checkbox") && (
          <div className="space-y-2 border-t pt-3">
            <Label className="text-xs font-medium text-gray-700">
              Opciones de Respuesta
            </Label>

            {editOptions.length > 0 ? (
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
                        updateOption(optIndex, e.target.value);
                        if (mode === "create") {
                          const newOptions = [...editOptions];
                          newOptions[optIndex] = e.target.value;
                          onUpdate({ options: newOptions });
                        }
                      }}
                      placeholder={`Opción ${optIndex + 1}`}
                      className="flex-1 h-7 text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <Button
                      onClick={() => {
                        removeOption(opt);
                        if (mode === "create") {
                          const newOptions = editOptions.filter(
                            (_, i) => i !== optIndex
                          );
                          onUpdate({ options: newOptions });
                        }
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
                    >
                      <X size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 text-gray-500 bg-gray-50 rounded-md border-2 border-dashed border-gray-200">
                <p className="text-xs">No hay opciones agregadas</p>
                <p className="text-xs mt-1">
                  Haz clic en "Agregar" para crear opciones
                </p>
              </div>
            )}

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
                  // Set to first available radio question
                  const firstRadio = allQuestions.find(
                    (q, idx) => idx < index && q.question_type === "radio"
                  );
                  const firstRadioIndex = allQuestions.findIndex(
                    (q, idx) => idx < index && q.question_type === "radio"
                  );

                  if (firstRadio) {
                    // Use ID if available (edit mode), otherwise use index as string (create mode)
                    onUpdate({
                      depends_on_question_id:
                        firstRadio.id || firstRadioIndex.toString(),
                    });
                  }
                }}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-200 hover:bg-blue-50 h-7 text-xs px-2"
                disabled={
                  !allQuestions.some(
                    (q, idx) => idx < index && q.question_type === "radio"
                  )
                }
              >
                <Plus size={12} className="mr-1" />
                Agregar Condición
              </Button>
            </div>

            {question.depends_on_question_id ? (
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
                      value={question.depends_on_question_id || ""}
                      onValueChange={(value) =>
                        onUpdate({ depends_on_question_id: value })
                      }
                    >
                      <SelectTrigger className="h-7 text-sm">
                        <SelectValue placeholder="Seleccionar pregunta" />
                      </SelectTrigger>
                      <SelectContent>
                        {allQuestions
                          .filter(
                            (q, qIndex) =>
                              qIndex < index && q.question_type === "radio"
                          )
                          .map((q, qIndex) => {
                            // Use ID if available (edit mode), otherwise use index (create mode)
                            const value = q.id || qIndex.toString();
                            return (
                              <SelectItem key={value} value={value}>
                                {q.name || `Pregunta ${qIndex + 1}`}
                              </SelectItem>
                            );
                          })}
                        {allQuestions.filter(
                          (q, qIndex) =>
                            qIndex < index && q.question_type === "radio"
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
                    {question.depends_on_question_id ? (
                      (() => {
                        const selectedQuestion = allQuestions.find(
                          (q) => q.id === question.depends_on_question_id
                        );

                        // Only radio questions are supported for conditional logic
                        if (
                          selectedQuestion?.question_type === "radio" &&
                          selectedQuestion?.options?.length > 0
                        ) {
                          return (
                            <Select
                              value={question.depends_on_answer || ""}
                              onValueChange={(value) =>
                                onUpdate({ depends_on_answer: value })
                              }
                            >
                              <SelectTrigger className="h-7 text-sm">
                                <SelectValue placeholder="Seleccionar respuesta" />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedQuestion.options.map(
                                  (option, optIndex) => (
                                    <SelectItem key={optIndex} value={option}>
                                      {option}
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
                    onClick={() =>
                      onUpdate({
                        depends_on_question_id: null,
                        depends_on_answer: null,
                      })
                    }
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
