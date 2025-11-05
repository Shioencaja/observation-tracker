"use client";

import { useState, useEffect, useMemo } from "react";
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

export interface QuestionOption {
  id: string;
  value: string;
}

export interface Question {
  id?: string;
  name: string;
  question_type: string;
  options: QuestionOption[];
  is_mandatory: boolean;
  is_visible?: boolean;
  depends_on_question_id?: string | null; // DEPRECATED: Kept for backward compatibility
  depends_on_answer?: string | null; // DEPRECATED: Kept for backward compatibility
  next_question_map?: Record<string, string | null> | null; // Maps answer option value to next question ID
}

// Helper function to generate deterministic option IDs
// This ensures IDs are consistent when questions are reloaded
const generateOptionId = (questionId: string | undefined, optionValue: string, index: number): string => {
  // If question has an ID, use it for deterministic ID generation
  if (questionId) {
    const idBase = `${questionId}_${optionValue}`;
    return `opt_${idBase.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  }
  // For new questions without ID yet, use a temporary ID
  // This will be regenerated when the question is saved
  return `opt_temp_${index}_${optionValue.replace(/[^a-zA-Z0-9_]/g, '_')}`;
};

// Helper function to convert string array to option objects (for backward compatibility)
// Uses the same deterministic ID generation as generateOptionId for consistency
const normalizeOptions = (options: string[] | QuestionOption[], questionId?: string): QuestionOption[] => {
  if (options.length === 0) return [];
  // Check if already in the new format
  if (typeof options[0] === 'object' && 'id' in options[0] && 'value' in options[0]) {
    // Parse each option's value if it's a JSON string
    return (options as QuestionOption[]).map((opt, index) => {
      let cleanValue = opt.value;
      
      // If value is a JSON string, parse it and extract the 'value' property
      if (typeof opt.value === 'string' && opt.value.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(opt.value);
          if (parsed && typeof parsed === 'object' && 'value' in parsed) {
            cleanValue = String(parsed.value);
          }
        } catch (e) {
          // If parsing fails, keep the original value
          cleanValue = opt.value;
        }
      }
      
      return {
        id: opt.id,
        value: cleanValue,
      };
    });
  }
  // Convert old string array format to new format with deterministic IDs
  return (options as string[]).map((value, index) => {
    // If the value is a JSON string, parse it first
    let cleanValue = value;
    if (typeof value === 'string' && value.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && 'value' in parsed) {
          cleanValue = String(parsed.value);
        }
      } catch (e) {
        // If parsing fails, keep the original value
        cleanValue = value;
      }
    }
    
    return {
      id: generateOptionId(questionId, cleanValue, index),
      value: cleanValue,
    };
  });
};

// Helper function to convert option objects to string array (for backward compatibility with DB)
export const optionsToStringArray = (options: QuestionOption[]): string[] => {
  return options.map(opt => opt.value);
};

// Helper function to convert option objects to JSON for storage (preserves IDs)
export const optionsToJSON = (options: QuestionOption[]): any => {
  // Store as JSON array of objects to preserve IDs
  return JSON.stringify(options);
};

// Helper function to parse JSON back to option objects
export const parseOptionsFromJSON = (optionsJson: any): QuestionOption[] => {
  if (!optionsJson) return [];
  // If it's already an array of objects with id and value, return it
  if (Array.isArray(optionsJson) && optionsJson.length > 0) {
    if (typeof optionsJson[0] === 'object' && 'id' in optionsJson[0] && 'value' in optionsJson[0]) {
      return optionsJson as QuestionOption[];
    }
    // If it's a string array, convert to option objects
    if (typeof optionsJson[0] === 'string') {
      return normalizeOptions(optionsJson as string[]);
    }
  }
  // Try to parse as JSON string
  if (typeof optionsJson === 'string') {
    try {
      const parsed = JSON.parse(optionsJson);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && 'id' in parsed[0]) {
        return parsed as QuestionOption[];
      }
    } catch (e) {
      // If parsing fails, treat as string array
      return normalizeOptions(optionsJson.split(','));
    }
  }
  return [];
};

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
  const [editOptions, setEditOptions] = useState<QuestionOption[]>(
    normalizeOptions(question.options || [], question.id)
  );
  const [newOption, setNewOption] = useState("");
  const [editIsMandatory, setEditIsMandatory] = useState(
    question.is_mandatory || false
  );
  // Helper to normalize depends_on_answer - extract ID if it's a JSON string
  const normalizeDependsOnAnswer = (value: string | null | undefined): string | null => {
    if (!value) return null;
    // If it's already a simple string (option ID), return it
    if (typeof value === 'string' && !value.startsWith('{')) {
      return value;
    }
    // If it's a JSON string, try to parse it
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && parsed.id) {
        return parsed.id;
      }
    } catch (e) {
      // Not JSON, return as is
    }
    return value;
  };

  // Next question mapping: maps answer option value to next question ID
  // Clean the map to ensure keys are only string values (not IDs or objects)
  const cleanNextQuestionMap = useMemo(() => {
    if (!question.next_question_map) return {};
    const cleaned: Record<string, string | null> = {};
    Object.keys(question.next_question_map).forEach(key => {
      // Only keep keys that are simple strings (option values)
      // Remove any keys that look like IDs (starting with "opt_") or are too long (likely corrupted)
      if (typeof key === 'string' && !key.startsWith('opt_') && key.length < 100) {
        cleaned[key] = question.next_question_map![key];
      }
    });
    return cleaned;
  }, [question.next_question_map]);

  const [editNextQuestionMap, setEditNextQuestionMap] = useState<
    Record<string, string | null>
  >(cleanNextQuestionMap);
  
  // Legacy support - keep old fields for backward compatibility
  const [editDependsOnQuestionId, setEditDependsOnQuestionId] = useState<
    string | null | undefined
  >(question.depends_on_question_id);
  const [editDependsOnAnswer, setEditDependsOnAnswer] = useState<
    string | null
  >(normalizeDependsOnAnswer(question.depends_on_answer));
  
  // Check if the condition is "is not" (prefixed with "!")
  const isNotCondition = editDependsOnAnswer?.startsWith("!") || false;
  const actualAnswerId = isNotCondition ? editDependsOnAnswer.substring(1) : editDependsOnAnswer;

  // Update local state when entering edit mode or when question prop changes
  useEffect(() => {
    if (isEditing) {
      setEditNextQuestionMap(cleanNextQuestionMap);
      setEditDependsOnQuestionId(question.depends_on_question_id);
      setEditDependsOnAnswer(normalizeDependsOnAnswer(question.depends_on_answer));
    }
  }, [isEditing, cleanNextQuestionMap, question.depends_on_question_id, question.depends_on_answer]);

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

    // Ensure next_question_map only contains string values (not IDs or objects)
    // Rebuild the map using only the ACTUAL option values from editOptions (with accents preserved)
    const cleanNextQuestionMap: Record<string, string | null> = {};
    
    // Use the actual option values from editOptions as keys (these have accents preserved)
    editOptions.forEach(option => {
      // Get the actual option value (with accents) - this is what should be stored as the key
      const optionValue = typeof option.value === 'string' ? option.value : String(option.value);
      
      // Check if there's a mapping in editNextQuestionMap for this option value
      // Try exact match first
      if (editNextQuestionMap[optionValue] !== undefined) {
        cleanNextQuestionMap[optionValue] = editNextQuestionMap[optionValue];
      } else {
        // If exact match not found, try to find a mapping by matching normalized values
        // This handles cases where the map might have been created with a slightly different key
        const normalizedOptionValue = optionValue
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Remove accents
          .replace(/[^a-z0-9\s]/g, "") // Remove special chars
          .trim();
        
        const matchingKey = Object.keys(editNextQuestionMap).find(key => {
          const normalizedKey = key
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/[^a-z0-9\s]/g, "") // Remove special chars
            .trim();
          return normalizedKey === normalizedOptionValue;
        });
        
        if (matchingKey) {
          // Use the actual option value (with accents) as the key, but keep the mapping value
          cleanNextQuestionMap[optionValue] = editNextQuestionMap[matchingKey];
        }
      }
    });

    console.log("🔍 [QuestionCard] Saving next_question_map:", {
      original: editNextQuestionMap,
      cleaned: cleanNextQuestionMap,
      editOptions: editOptions.map(opt => ({ id: opt.id, value: opt.value }))
    });

    await onUpdate({
      name: editName.trim(),
      question_type: editQuestionType,
      options: editOptions.length > 0 ? editOptions : [],
      is_mandatory: editIsMandatory,
      next_question_map: Object.keys(cleanNextQuestionMap).length > 0 ? cleanNextQuestionMap : null,
      // Keep legacy fields for backward compatibility
      depends_on_question_id: editDependsOnQuestionId || null,
      depends_on_answer: editDependsOnAnswer || null,
    });

    if (mode === "edit") {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditName(question.name);
    setEditQuestionType(question.question_type);
    setEditOptions(normalizeOptions(question.options || [], question.id));
    setEditIsMandatory(question.is_mandatory || false);
    setEditNextQuestionMap(cleanNextQuestionMap);
    setEditDependsOnQuestionId(question.depends_on_question_id);
    setEditDependsOnAnswer(normalizeDependsOnAnswer(question.depends_on_answer));
    setIsEditing(false);
  };

  const addOption = () => {
    const trimmedValue = newOption.trim();
    if (trimmedValue && !editOptions.some(opt => opt.value === trimmedValue)) {
      const newOptionObj: QuestionOption = {
        id: generateOptionId(question.id, trimmedValue, editOptions.length),
        value: trimmedValue,
      };
      const newOptions = [...editOptions, newOptionObj];
      setEditOptions(newOptions);
      setNewOption("");
      if (mode === "create") {
        onUpdate({ options: newOptions });
      }
    }
  };

  const removeOption = (optionId: string) => {
    const newOptions = editOptions.filter((opt) => opt.id !== optionId);
    setEditOptions(newOptions);
    if (mode === "create") {
      onUpdate({ options: newOptions });
    }
  };

  const updateOption = (optionIndex: number, value: string) => {
    const newOptions = [...editOptions];
    newOptions[optionIndex] = {
      ...newOptions[optionIndex],
      value: value,
    };
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
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className="flex flex-col gap-0.5 flex-shrink-0">
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
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-sm flex-shrink-0">
              <span className="text-xs font-bold text-white">{index + 1}</span>
            </div>
            <h4 className="text-sm font-semibold text-gray-900 break-words min-w-0 flex-1">
              {question.name}
            </h4>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
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
        <div className="p-3 space-y-3">
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

          {/* Next Question Mapping Display */}
          {question.next_question_map && Object.keys(question.next_question_map).length > 0 && (
            <div className="p-2 bg-green-50 rounded-md border border-green-200">
              <div className="text-xs text-gray-700 mb-1">
                <span className="font-medium">Pregunta Siguiente:</span>
              </div>
              <div className="space-y-1">
                {Object.entries(question.next_question_map)
                  .filter(([answerValue, nextQuestionId]) => {
                    // Skip if the key looks like an ID (corrupted data) or if nextQuestionId is null
                    return answerValue && !answerValue.startsWith('opt_') && answerValue.length < 100 && nextQuestionId;
                  })
                  .map(([answerValue, nextQuestionId]) => {
                    // Get the actual option value from the question's options to ensure clean display
                    const questionOptions = normalizeOptions(question.options || [], question.id);
                    const matchedOption = questionOptions.find(opt => opt.value === answerValue);
                    const displayValue = matchedOption ? matchedOption.value : answerValue;
                    
                    // Only show if we have a valid display value (not an ID or corrupted)
                    if (!displayValue || displayValue.startsWith('opt_') || displayValue.length > 100) {
                      return null;
                    }
                    
                    const nextQuestion = allQuestions.find(q => q.id === nextQuestionId);
                    return (
                      <div key={answerValue} className="text-xs text-gray-600">
                        <span className="font-medium">Si: {displayValue}</span>
                        {" → "}
                        <span className="font-semibold text-green-700">
                          {nextQuestion ? nextQuestion.name : "Pregunta desconocida"}
                        </span>
                      </div>
                    );
                  })
                  .filter(Boolean)}
              </div>
            </div>
          )}
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
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <div className="flex flex-col gap-0.5 flex-shrink-0">
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
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-xs font-bold text-white">{index + 1}</span>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 break-words min-w-0 flex-1">
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
                  <div key={opt.id} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-gray-600">
                        {optIndex + 1}
                      </span>
                    </div>
                    <Input
                      value={opt.value}
                      onChange={(e) => {
                        updateOption(optIndex, e.target.value);
                        if (mode === "create") {
                          const newOptions = [...editOptions];
                          newOptions[optIndex] = {
                            ...newOptions[optIndex],
                            value: e.target.value,
                          };
                          onUpdate({ options: newOptions });
                        }
                      }}
                      placeholder={`Opción ${optIndex + 1}`}
                      className="flex-1 h-7 text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <Button
                      onClick={() => {
                        removeOption(opt.id);
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

        {/* Next Question Logic - Set which question to show next based on answer */}
        {editQuestionType === "radio" && editOptions.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <Label className="text-xs font-medium text-gray-700">
              Pregunta Siguiente (basada en respuesta)
            </Label>
            <div className="space-y-2">
              {editOptions
                .map((option) => {
                  // Extract the actual string value from the option
                  // Handle cases where option.value might be a JSON string or the actual value
                  let optionValue: string = '';
                  
                  if (option && typeof option === 'object' && 'value' in option) {
                    const rawValue = (option as any).value;
                    
                    // If it's a JSON string (starts with {), parse it
                    if (typeof rawValue === 'string' && rawValue.trim().startsWith('{')) {
                      try {
                        const parsed = JSON.parse(rawValue);
                        // Extract the 'value' property from the parsed JSON
                        if (parsed && typeof parsed === 'object' && 'value' in parsed) {
                          optionValue = String(parsed.value);
                        } else {
                          return null;
                        }
                      } catch (e) {
                        return null;
                      }
                    }
                    // If it's already a simple string (the actual value we want)
                    else if (typeof rawValue === 'string') {
                      optionValue = rawValue;
                    }
                    // If it's an object with a value property
                    else if (typeof rawValue === 'object' && rawValue !== null && 'value' in rawValue) {
                      optionValue = String(rawValue.value);
                    }
                    // Fallback
                    else {
                      optionValue = String(rawValue);
                    }
                  } else {
                    return null;
                  }
                  
                  // Final validation: skip if it looks like corrupted data (IDs or too long)
                  if (!optionValue || optionValue.startsWith('opt_') || optionValue.length > 100) {
                    return null;
                  }
                  
                  // Always use the actual option.value (with accents preserved) as the key
                  // This ensures we're using the readable format, not sanitized IDs
                  const actualOptionValue = option.value; // Use the actual value with accents
                  
                  // Try to find existing mapping by exact match first, then by normalized match
                  let currentNextQuestionId = editNextQuestionMap[actualOptionValue] || null;
                  
                  // If not found by exact match, try normalized matching (for backward compatibility)
                  if (!currentNextQuestionId) {
                    const normalizedActualValue = actualOptionValue
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "") // Remove accents
                      .replace(/[^a-z0-9\s]/g, "") // Remove special chars
                      .trim();
                    
                    const matchingKey = Object.keys(editNextQuestionMap).find(key => {
                      const normalizedKey = key
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "") // Remove accents
                        .replace(/[^a-z0-9\s]/g, "") // Remove special chars
                        .trim();
                      return normalizedKey === normalizedActualValue;
                    });
                    
                    if (matchingKey) {
                      currentNextQuestionId = editNextQuestionMap[matchingKey];
                      // Migrate to use the actual value as key (with accents)
                      const newMap = { ...editNextQuestionMap };
                      delete newMap[matchingKey];
                      newMap[actualOptionValue] = currentNextQuestionId;
                      setEditNextQuestionMap(newMap);
                    }
                  }
                  
                  const availableNextQuestions = allQuestions.filter(
                    (q, qIndex) => qIndex > index && q.id !== question.id
                  );

                  return (
                    <div key={option.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                      <span className="text-xs text-gray-700 font-medium min-w-[100px] flex-shrink-0">
                        Si: {actualOptionValue}
                      </span>
                      <span className="text-xs text-gray-500">→</span>
                      <Select
                        value={currentNextQuestionId || "__default__"}
                        onValueChange={(value) => {
                          // Always use the actual option value (with accents) as the key
                          const newMap = {
                            ...editNextQuestionMap,
                            [actualOptionValue]: value === "__default__" ? null : value,
                          };
                          console.log("🔍 [QuestionCard] Updating next_question_map:", {
                            actualOptionValue,
                            optionId: option.id,
                            optionObject: option,
                            newMap
                          });
                          setEditNextQuestionMap(newMap);
                        }}
                      >
                      <SelectTrigger className="h-7 text-sm flex-1">
                        <SelectValue placeholder="Siguiente pregunta (por defecto sigue orden)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">Seguir orden (por defecto)</SelectItem>
                        {availableNextQuestions.map((q) => (
                          <SelectItem key={q.id || `q-${allQuestions.indexOf(q)}`} value={q.id || `q-${allQuestions.indexOf(q)}`}>
                            {q.name || `Pregunta ${allQuestions.indexOf(q) + 1}`}
                          </SelectItem>
                        ))}
                        {availableNextQuestions.length === 0 && (
                          <div className="px-2 py-1.5 text-xs text-gray-500">
                            No hay preguntas siguientes disponibles
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 italic">
              Configura qué pregunta mostrar después basándose en la respuesta seleccionada.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
