"use client";

import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ProjectObservationOption } from "@/types/observation";

interface DraggableOptionProps {
  option: ProjectObservationOption;
  index: number;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string, isVisible: boolean) => void;
  canEdit?: boolean;
  allQuestions?: ProjectObservationOption[];
}

export function DraggableOption({
  option,
  index,
  onDelete,
  onToggleVisibility,
  canEdit = false,
  allQuestions = [],
}: DraggableOptionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `option-${option.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden ${
        isDragging ? "shadow-lg border-blue-300" : ""
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
        {canEdit && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded flex-shrink-0"
          >
            <GripVertical size={16} className="text-gray-400" />
          </div>
        )}
        {!canEdit && <div className="w-6 flex-shrink-0" />}
        <div className="flex flex-col gap-1 min-w-0 flex-1 overflow-hidden">
          <span className="font-medium text-gray-900 break-words">
            {option.name}
          </span>
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
            {/* Conditional Dependency Display */}
            {option.depends_on_question_id && (
              <Badge
                variant="outline"
                className="text-xs px-2 py-1 bg-purple-50 text-purple-700 border-purple-200"
              >
                Condicional
              </Badge>
            )}
            {option.description && (
              <span className="text-xs text-gray-500 truncate max-w-32">
                {option.description}
              </span>
            )}
          </div>
          {/* Conditional Dependency Details */}
          {option.depends_on_question_id && (
            <div className="mt-1 text-xs text-gray-600">
              <span className="font-medium">Mostrar si:</span>{" "}
              {(() => {
                // Find the dependency question name from the allQuestions array
                const dependencyQuestion = allQuestions.find(
                  (q) => q.id === option.depends_on_question_id
                );
                const dependencyName =
                  dependencyQuestion?.name || option.depends_on_question_id;

                if (!option.depends_on_answer) {
                  return dependencyName;
                }

                // Find the option value from the dependency question
                if (dependencyQuestion && dependencyQuestion.options) {
                  // Check if options is array of objects or strings
                  const dependencyOptions = Array.isArray(
                    dependencyQuestion.options
                  )
                    ? dependencyQuestion.options
                    : [];

                  // Try to find option by ID first, then by value
                  let matchedOption = null;
                  if (
                    dependencyOptions.length > 0 &&
                    typeof dependencyOptions[0] === "object" &&
                    "id" in dependencyOptions[0]
                  ) {
                    // Options are objects with id and value
                    matchedOption = dependencyOptions.find(
                      (opt: any) => opt.id === option.depends_on_answer
                    );
                  } else {
                    // Options are strings, but depends_on_answer is now an ID
                    // Generate deterministic IDs to match (same logic as QuestionCard)
                    matchedOption = dependencyOptions.find(
                      (opt: any, index: number) => {
                        if (typeof opt === "string") {
                          // Generate deterministic ID based on question ID and option value
                          const idBase = dependencyQuestion.id
                            ? `${dependencyQuestion.id}_${opt}`
                            : `opt_${index}_${opt}`;
                          const generatedId = `opt_${idBase.replace(
                            /[^a-zA-Z0-9_]/g,
                            "_"
                          )}`;
                          return generatedId === option.depends_on_answer;
                        }
                        return false;
                      }
                    );

                    // If not found by ID, try matching by value (backward compatibility)
                    if (!matchedOption) {
                      matchedOption = dependencyOptions.find(
                        (opt: any) => opt === option.depends_on_answer
                      );
                    }
                  }

                  const optionValue = matchedOption
                    ? typeof matchedOption === "object"
                      ? matchedOption.value
                      : matchedOption
                    : option.depends_on_answer;

                  return (
                    <>
                      <span className="font-semibold">{dependencyName}</span>
                      {" es "}
                      <span className="font-semibold">{optionValue}</span>
                    </>
                  );
                }

                return (
                  <>
                    <span className="font-semibold">{dependencyName}</span>
                    {option.depends_on_answer && (
                      <>
                        {" es "}
                        <span className="font-semibold">
                          {option.depends_on_answer}
                        </span>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleVisibility(option.id, !option.is_visible)}
            className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
            title={option.is_visible ? "Ocultar opción" : "Mostrar opción"}
          >
            {option.is_visible ? (
              <svg
                className="w-4 h-4"
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
                className="w-4 h-4"
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
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(option.id)}
            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
            title="Eliminar opción"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </Button>
        )}
      </div>
    </div>
  );
}

