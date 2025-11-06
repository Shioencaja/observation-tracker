"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Using QuestionCard for editing - supports conditional next questions
import { ProjectObservationOption } from "@/types/observation";
import { DraggableOption } from "./DraggableOption";
import { useProjectObservationOptions } from "@/hooks/use-project-observation-options";
import QuestionCard, { Question } from "@/components/QuestionCard";
import { supabase } from "@/lib/supabase";

interface ObservationOptionsSectionProps {
  projectId: string;
  canEdit: boolean;
  onUnsavedChange?: () => void;
}

export function ObservationOptionsSection({
  projectId,
  canEdit,
  onUnsavedChange,
}: ObservationOptionsSectionProps) {
  const {
    options,
    isLoading,
    loadOptions,
    addOption,
    deleteOption,
    toggleVisibility,
    reorder,
    updateOption,
  } = useProjectObservationOptions(projectId);

  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionType, setNewOptionType] = useState<
    "string" | "boolean" | "radio" | "checkbox" | "counter" | "timer" | "voice"
  >("string");
  const [newOptionOptions, setNewOptionOptions] = useState<string[]>([]);
  const [newOptionOption, setNewOptionOption] = useState("");
  const [isAddingOption, setIsAddingOption] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleAddOption = async () => {
    if (!newOptionName.trim()) return;

    setIsAddingOption(true);
    try {
      await addOption({
        name: newOptionName,
        question_type: newOptionType,
        options: newOptionOptions.length > 0 ? newOptionOptions : undefined,
      });
      setNewOptionName("");
      setNewOptionType("string");
      setNewOptionOptions([]);
      setNewOptionOption("");
      onUnsavedChange?.();
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setIsAddingOption(false);
    }
  };

  const handleToggleVisibility = async (
    id: string,
    currentVisibility: boolean
  ) => {
    await toggleVisibility(id, currentVisibility);
    onUnsavedChange?.();
  };

  const handleDeleteOption = async (id: string) => {
    await deleteOption(id);
    onUnsavedChange?.();
  };

  // Convert ProjectObservationOption to Question format for QuestionCard
  const convertToQuestion = (option: ProjectObservationOption): Question => {
    // Convert options array to QuestionOption format
    let questionOptions: { id: string; value: string }[] = [];
    if (option.options) {
      if (Array.isArray(option.options)) {
        if (option.options.length > 0 && typeof option.options[0] === 'object' && 'id' in option.options[0]) {
          questionOptions = option.options as { id: string; value: string }[];
        } else {
          // Convert string array to QuestionOption format
          questionOptions = (option.options as string[]).map((opt, idx) => ({
            id: `opt_${option.id}_${idx}_${opt}`.replace(/[^a-zA-Z0-9_]/g, '_'),
            value: opt,
          }));
        }
      }
    }

    return {
      id: option.id,
      name: option.name,
      question_type: option.question_type || 'string',
      options: questionOptions,
      is_mandatory: option.is_mandatory || false,
      is_visible: option.is_visible !== undefined ? option.is_visible : true,
      depends_on_question_id: option.depends_on_question_id || null,
      depends_on_answer: option.depends_on_answer || null,
      next_question_map: option.next_question_map || null,
    };
  };

  const handleQuestionUpdate = async (questionId: string, updates: Partial<Question>) => {
    try {
      // Convert Question format back to database format
      const updateData: any = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.question_type !== undefined) updateData.question_type = updates.question_type;
      if (updates.options !== undefined) {
        // Convert QuestionOption[] to string[] or object[] format
        if (Array.isArray(updates.options)) {
          updateData.options = updates.options.map(opt => 
            typeof opt === 'string' ? opt : opt.value
          );
        }
      }
      if (updates.is_mandatory !== undefined) updateData.is_mandatory = updates.is_mandatory;
      if (updates.is_visible !== undefined) updateData.is_visible = updates.is_visible;
      if (updates.depends_on_question_id !== undefined) {
        updateData.depends_on_question_id = updates.depends_on_question_id;
      }
      if (updates.depends_on_answer !== undefined) {
        updateData.depends_on_answer = updates.depends_on_answer;
      }
      if (updates.next_question_map !== undefined) {
        updateData.next_question_map = updates.next_question_map;
      }

      const { error } = await supabase
        .from("project_observation_options")
        .update(updateData)
        .eq("id", questionId);

      if (error) throw error;

      await loadOptions();
      onUnsavedChange?.();
    } catch (error) {
      console.error("Error updating question:", error);
      throw error;
    }
  };

  const handleQuestionRemove = async (questionId: string) => {
    await deleteOption(questionId);
    onUnsavedChange?.();
  };

  const handleQuestionMoveUp = async (questionId: string, currentIndex: number) => {
    if (currentIndex === 0) return;
    const newOptions = [...options];
    const temp = newOptions[currentIndex];
    newOptions[currentIndex] = newOptions[currentIndex - 1];
    newOptions[currentIndex - 1] = temp;
    await reorder(newOptions);
    onUnsavedChange?.();
  };

  const handleQuestionMoveDown = async (questionId: string, currentIndex: number) => {
    if (currentIndex === options.length - 1) return;
    const newOptions = [...options];
    const temp = newOptions[currentIndex];
    newOptions[currentIndex] = newOptions[currentIndex + 1];
    newOptions[currentIndex + 1] = temp;
    await reorder(newOptions);
    onUnsavedChange?.();
  };

  const handleQuestionToggleVisibility = async (questionId: string) => {
    const question = options.find(q => q.id === questionId);
    if (question) {
      await toggleVisibility(questionId, question.is_visible);
      onUnsavedChange?.();
    }
  };


  const addOptionOption = () => {
    if (
      newOptionOption.trim() &&
      !newOptionOptions.includes(newOptionOption.trim())
    ) {
      setNewOptionOptions([...newOptionOptions, newOptionOption.trim()]);
      setNewOptionOption("");
    }
  };

  const removeOptionOption = (option: string) => {
    setNewOptionOptions(newOptionOptions.filter((o) => o !== option));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          Opciones de Observación
        </h2>
      </div>
      <div className="p-6 space-y-6">
        {/* Add New Option */}
        {canEdit && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Agregar Nueva Pregunta
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <Input
                  value={newOptionName}
                  onChange={(e) => setNewOptionName(e.target.value)}
                  placeholder="Pregunta"
                  className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors"
                />
                <Select
                  value={newOptionType}
                  onValueChange={(value) =>
                    setNewOptionType(
                      value as
                        | "string"
                        | "boolean"
                        | "radio"
                        | "checkbox"
                        | "counter"
                        | "timer"
                        | "voice"
                    )
                  }
                >
                  <SelectTrigger className="min-w-[180px]">
                    <SelectValue placeholder="Tipo de pregunta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">Texto</SelectItem>
                    <SelectItem value="boolean">Sí/No</SelectItem>
                    <SelectItem value="radio">Opción única</SelectItem>
                    <SelectItem value="checkbox">Múltiples opciones</SelectItem>
                    <SelectItem value="counter">Contador</SelectItem>
                    <SelectItem value="timer">Temporizador</SelectItem>
                    <SelectItem value="voice">Grabación de voz</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(newOptionType === "radio" || newOptionType === "checkbox") && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Opciones
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={newOptionOption}
                      onChange={(e) => setNewOptionOption(e.target.value)}
                      placeholder="Agregar opción"
                      className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      onKeyPress={(e) =>
                        e.key === "Enter" && addOptionOption()
                      }
                    />
                    <Button
                      onClick={addOptionOption}
                      disabled={!newOptionOption.trim()}
                      variant="outline"
                      size="sm"
                    >
                      Agregar
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newOptionOptions.map((option, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-gray-100 text-gray-800"
                      >
                        {option}
                        <button
                          onClick={() => removeOptionOption(option)}
                          className="ml-2 text-gray-600 hover:text-gray-800"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleAddOption}
                  disabled={
                    isAddingOption ||
                    !newOptionName.trim() ||
                    ((newOptionType === "radio" ||
                      newOptionType === "checkbox") &&
                      newOptionOptions.length === 0)
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4"
                >
                  {isAddingOption ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Agregando...
                    </>
                  ) : (
                    "Agregar Pregunta"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Existing Options */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Opciones Existentes
          </h3>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2
                size={20}
                className="animate-spin mx-auto mb-2 text-gray-400"
              />
              <p className="text-sm text-gray-500">Cargando opciones...</p>
            </div>
          ) : options.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">
                No hay opciones de observación
              </p>
            </div>
          ) : canEdit ? (
            <div className="space-y-3">
              {options.map((option, index) => {
                const question = convertToQuestion(option);
                return (
                  <QuestionCard
                    key={option.id}
                    question={question}
                    index={index}
                    totalQuestions={options.length}
                    allQuestions={options.map(convertToQuestion)}
                    onUpdate={(updates) => handleQuestionUpdate(option.id, updates)}
                    onRemove={() => handleQuestionRemove(option.id)}
                    onMoveUp={() => handleQuestionMoveUp(option.id, index)}
                    onMoveDown={() => handleQuestionMoveDown(option.id, index)}
                    mode="edit"
                    onToggleVisibility={() => handleQuestionToggleVisibility(option.id)}
                    onDelete={() => handleQuestionRemove(option.id)}
                    canEdit={canEdit}
                    canDelete={canEdit}
                  />
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {options.map((option, index) => (
                <DraggableOption
                  key={`option-${option.id}`}
                  option={option}
                  index={index}
                  onDelete={handleDeleteOption}
                  onToggleVisibility={handleToggleVisibility}
                  canEdit={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

