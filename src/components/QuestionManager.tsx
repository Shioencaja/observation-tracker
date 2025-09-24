"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Save,
  X,
  GripVertical,
} from "lucide-react";
import { Tables } from "@/types/supabase";
import {
  questionService,
  QuestionUpdateData,
} from "@/services/question-service";
import { useToast } from "@/hooks/use-toast";

interface QuestionManagerProps {
  question: Tables<"project_observation_options">;
  projectId: string;
  onQuestionUpdated: (question: Tables<"project_observation_options">) => void;
  onQuestionDeleted: (questionId: string) => void;
  onQuestionDuplicated: (
    question: Tables<"project_observation_options">
  ) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canDuplicate?: boolean;
}

export default function QuestionManager({
  question,
  projectId,
  onQuestionUpdated,
  onQuestionDeleted,
  onQuestionDuplicated,
  canEdit = true,
  canDelete = true,
  canDuplicate = true,
}: QuestionManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState(question.name);
  const [editQuestionType, setEditQuestionType] = useState(
    question.question_type
  );
  const [editOptions, setEditOptions] = useState(question.options || []);
  const [newOption, setNewOption] = useState("");

  const { toast } = useToast();

  const questionTypeLabels = {
    string: "📝 Texto libre",
    boolean: "✅ Sí/No",
    radio: "🔘 Opción única",
    checkbox: "☑️ Múltiples opciones",
    counter: "🔢 Contador",
    timer: "⏱️ Temporizador",
    voice: "🎤 Voz",
    number: "🔢 Número",
    email: "📧 Email",
    url: "🔗 URL",
    date: "📅 Fecha",
    time: "🕐 Hora",
    textarea: "📄 Texto largo",
  };

  const handleSave = useCallback(async () => {
    if (!editName.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la pregunta es requerido",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const updateData: QuestionUpdateData = {
        name: editName.trim(),
        question_type: editQuestionType,
        options:
          editQuestionType === "radio" || editQuestionType === "checkbox"
            ? editOptions
            : undefined,
      };

      const updatedQuestion = await questionService.updateQuestion(
        question.id,
        updateData
      );
      onQuestionUpdated(updatedQuestion);
      setIsEditing(false);

      toast({
        title: "Éxito",
        description: "Pregunta actualizada correctamente",
      });
    } catch (error) {
      console.error("Error updating question:", error);
      toast({
        title: "Error",
        description: "Error al actualizar la pregunta",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  }, [
    editName,
    editQuestionType,
    editOptions,
    question.id,
    onQuestionUpdated,
    toast,
  ]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await questionService.deleteQuestion(question.id);
      onQuestionDeleted(question.id);

      toast({
        title: "Éxito",
        description: "Pregunta eliminada correctamente",
      });
    } catch (error) {
      console.error("Error deleting question:", error);
      toast({
        title: "Error",
        description: "Error al eliminar la pregunta",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }, [question.id, onQuestionDeleted, toast]);

  const handleToggleVisibility = useCallback(async () => {
    setIsTogglingVisibility(true);
    try {
      const updatedQuestion = await questionService.toggleQuestionVisibility(
        question.id,
        !question.is_visible
      );
      onQuestionUpdated(updatedQuestion);

      toast({
        title: "Éxito",
        description: `Pregunta ${
          updatedQuestion.is_visible ? "mostrada" : "ocultada"
        } correctamente`,
      });
    } catch (error) {
      console.error("Error toggling question visibility:", error);
      toast({
        title: "Error",
        description: "Error al cambiar visibilidad de la pregunta",
        variant: "destructive",
      });
    } finally {
      setIsTogglingVisibility(false);
    }
  }, [question.id, question.is_visible, onQuestionUpdated, toast]);

  const handleDuplicate = useCallback(async () => {
    setIsDuplicating(true);
    try {
      const duplicatedQuestion = await questionService.duplicateQuestion(
        question.id,
        projectId
      );
      onQuestionDuplicated(duplicatedQuestion);

      toast({
        title: "Éxito",
        description: "Pregunta duplicada correctamente",
      });
    } catch (error) {
      console.error("Error duplicating question:", error);
      toast({
        title: "Error",
        description: "Error al duplicar la pregunta",
        variant: "destructive",
      });
    } finally {
      setIsDuplicating(false);
    }
  }, [question.id, projectId, onQuestionDuplicated, toast]);

  const handleAddOption = useCallback(() => {
    if (newOption.trim() && !editOptions.includes(newOption.trim())) {
      setEditOptions([...editOptions, newOption.trim()]);
      setNewOption("");
    }
  }, [newOption, editOptions]);

  const handleRemoveOption = useCallback(
    (index: number) => {
      setEditOptions(editOptions.filter((_, i) => i !== index));
    },
    [editOptions]
  );

  const handleCancelEdit = useCallback(() => {
    setEditName(question.name);
    setEditQuestionType(question.question_type);
    setEditOptions(question.options || []);
    setNewOption("");
    setIsEditing(false);
  }, [question]);

  const hasOptions =
    editQuestionType === "radio" || editQuestionType === "checkbox";

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
          <Badge variant={question.is_visible ? "default" : "secondary"}>
            {questionTypeLabels[
              editQuestionType as keyof typeof questionTypeLabels
            ] || editQuestionType}
          </Badge>
          {!question.is_visible && (
            <Badge variant="outline" className="text-muted-foreground">
              Oculto
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0"
              title="Editar pregunta"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleVisibility}
            disabled={isTogglingVisibility}
            className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
            title={
              question.is_visible ? "Ocultar pregunta" : "Mostrar pregunta"
            }
          >
            {question.is_visible ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </Button>

          {canDuplicate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDuplicate}
              disabled={isDuplicating}
              className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600"
              title="Duplicar pregunta"
            >
              <Copy className="w-4 h-4" />
            </Button>
          )}

          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                  title="Eliminar pregunta"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar pregunta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará
                    permanentemente la pregunta "{question.name}" y todas sus
                    respuestas asociadas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isDeleting ? "Eliminando..." : "Eliminar"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Nombre de la pregunta</Label>
            <Input
              id="edit-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Ingresa el nombre de la pregunta"
            />
          </div>

          <div>
            <Label htmlFor="edit-type">Tipo de pregunta</Label>
            <Select
              value={editQuestionType}
              onValueChange={setEditQuestionType}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(questionTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasOptions && (
            <div>
              <Label>Opciones</Label>
              <div className="space-y-2">
                {editOptions.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...editOptions];
                        newOptions[index] = e.target.value;
                        setEditOptions(newOptions);
                      }}
                      placeholder="Opción"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveOption(index)}
                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Nueva opción"
                    onKeyPress={(e) => e.key === "Enter" && handleAddOption()}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddOption}
                    disabled={!newOption.trim()}
                  >
                    Agregar
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isUpdating}>
              {isUpdating ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <h3 className="font-medium text-sm text-muted-foreground mb-1">
            {question.name}
          </h3>
          {hasOptions && question.options && question.options.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">Opciones:</p>
              <div className="flex flex-wrap gap-1">
                {question.options.map((option, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {option}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
