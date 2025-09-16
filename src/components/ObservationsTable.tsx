"use client";

import { useState, useEffect, useRef } from "react";
import {
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Observation, ObservationOption } from "@/types/observation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface ObservationsTableProps {
  observations: Observation[];
  sessionId: string;
  onUpdate: () => void;
  canAddObservations: boolean;
  onAddObservation: () => void;
  newlyCreatedObservationId?: string | null;
  onClearNewlyCreatedObservationId: () => void;
}

export default function ObservationsTable({
  observations,
  sessionId,
  onUpdate,
  canAddObservations,
  onAddObservation,
  newlyCreatedObservationId,
  onClearNewlyCreatedObservationId,
}: ObservationsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<ObservationOption[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Suppress unused parameter warning
  void sessionId;

  const loadOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("observation_options")
        .select("*")
        .eq("is_visible", true)
        .order("name", { ascending: true });

      if (error) throw error;
      setOptions(data || []);
    } catch (error) {
      console.error("Error loading options:", error);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  // Auto-edit newly created observations
  useEffect(() => {
    if (newlyCreatedObservationId && observations.length > 0) {
      const newObservation = observations.find(
        (obs) => obs.id === newlyCreatedObservationId
      );
      if (newObservation) {
        setEditingId(newObservation.id);
        setEditDescription(""); // Start with empty description
        setSelectedOptions(
          newObservation.option_ids ? newObservation.option_ids.split(",") : []
        );
        // Clear the newly created observation ID after setting up edit mode
        onClearNewlyCreatedObservationId();

        // Focus the input after a short delay to ensure it's rendered
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            // Select all text for easy replacement
            inputRef.current.select();
          }
        }, 100);
      }
    }
  }, [
    newlyCreatedObservationId,
    observations,
    onClearNewlyCreatedObservationId,
  ]);

  const handleEdit = (observation: Observation) => {
    setEditingId(observation.id);
    setEditDescription(""); // Start with empty description
    // Parse comma-separated option IDs
    setSelectedOptions(
      observation.option_ids ? observation.option_ids.split(",") : []
    );
  };

  const handleSave = async () => {
    if (!editingId) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("observations")
        .update({
          option_ids:
            selectedOptions.length > 0 ? selectedOptions.join(",") : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);

      if (error) throw error;

      setEditingId(null);
      setEditDescription("");
      setSelectedOptions([]);
      onUpdate();
    } catch (error) {
      console.error("Error updating observation:", error);
      alert("Error al actualizar");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditDescription("");
    setSelectedOptions([]);
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("observations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      onUpdate();
    } catch (error) {
      console.error("Error deleting observation:", error);
      alert("Error al eliminar");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionChange = (optionId: string, checked: boolean) => {
    if (checked) {
      // Add option to selected options (allow multiple)
      setSelectedOptions((prev) => [...prev, optionId]);
    } else {
      // Remove option from selected options
      setSelectedOptions((prev) => prev.filter((id) => id !== optionId));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const getOptionNames = (optionIds: string | null) => {
    if (!optionIds) return [];
    const optionIdArray = optionIds.split(",");
    return optionIdArray.map((id) => {
      const option = options.find((opt) => opt.id === id);
      return option?.name || "Unknown Option";
    });
  };

  return (
    <div className="space-y-4">
      {/* Observations Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Observaciones</CardTitle>
              <CardDescription>Gestiona observaciones</CardDescription>
            </div>
            {canAddObservations && (
              <Button onClick={onAddObservation} size="sm">
                <Plus size={16} className="mr-2" />
                Nueva
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {observations.length === 0 ? (
            <div className="text-center py-8">
              <Plus size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Sin observaciones</h3>
              <p className="text-muted-foreground mb-4">
                Agrega tu primera observación.
              </p>
              {canAddObservations && (
                <Button onClick={onAddObservation}>
                  <Plus size={16} className="mr-2" />
                  Agregar
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 sm:w-12 text-center">#</TableHead>
                    <TableHead className="min-w-[150px]">Opciones</TableHead>
                    <TableHead className="hidden md:table-cell w-20">
                      Creado
                    </TableHead>
                    <TableHead className="hidden lg:table-cell w-20">
                      Actualizado
                    </TableHead>
                    <TableHead className="text-right w-20">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {observations.map((observation, index) => (
                    <TableRow key={observation.id}>
                      <TableCell className="font-medium text-center text-sm">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        {editingId === observation.id ? (
                          <div className="space-y-2">
                            <Input
                              ref={inputRef}
                              value={editDescription}
                              onChange={(e) =>
                                setEditDescription(e.target.value)
                              }
                              onKeyDown={handleKeyPress}
                              className="w-full h-10 border-2 border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200 text-sm"
                              disabled={isLoading}
                              placeholder="Describe observación... (Enter para guardar)"
                            />
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between text-left font-normal text-xs sm:text-sm h-auto min-h-[1.75rem] sm:min-h-[2rem] p-1.5"
                                >
                                  <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                                    {selectedOptions.length === 0 ? (
                                      <span className="text-muted-foreground">
                                        Opciones...
                                      </span>
                                    ) : (
                                      selectedOptions.map((optionId) => {
                                        const option = options.find(
                                          (opt) => opt.id === optionId
                                        );
                                        return (
                                          <Badge
                                            key={optionId}
                                            variant="secondary"
                                            className="text-xs px-1 py-0 group cursor-pointer hover:bg-secondary-foreground/20"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOptionChange(
                                                optionId,
                                                false
                                              );
                                            }}
                                          >
                                            {option?.name}
                                            <span
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleOptionChange(
                                                  optionId,
                                                  false
                                                );
                                              }}
                                              className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5 cursor-pointer"
                                              title={`Remove ${option?.name} option`}
                                              aria-label={`Remove ${option?.name} option`}
                                              role="button"
                                              tabIndex={0}
                                              onKeyDown={(e) => {
                                                if (
                                                  e.key === "Enter" ||
                                                  e.key === " "
                                                ) {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  handleOptionChange(
                                                    optionId,
                                                    false
                                                  );
                                                }
                                              }}
                                            >
                                              <X size={10} />
                                            </span>
                                          </Badge>
                                        );
                                      })
                                    )}
                                  </div>
                                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-full p-0 max-w-[280px] sm:max-w-none"
                                align="start"
                              >
                                <div className="max-h-60 overflow-auto">
                                  {options.length === 0 ? (
                                    <div className="p-4 text-sm text-muted-foreground text-center">
                                      Sin opciones.
                                    </div>
                                  ) : (
                                    <div className="p-1">
                                      {options.map((option) => (
                                        <div
                                          key={option.id}
                                          className="flex items-center space-x-2 p-2 hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer"
                                          onClick={() =>
                                            handleOptionChange(
                                              option.id,
                                              !selectedOptions.includes(
                                                option.id
                                              )
                                            )
                                          }
                                        >
                                          <Checkbox
                                            checked={selectedOptions.includes(
                                              option.id
                                            )}
                                            onChange={() => {}} // Handled by parent onClick
                                          />
                                          <span className="text-sm">
                                            {option.name}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>💡 Enter: guardar, Esc: cancelar</span>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleEdit(observation)}
                            className="cursor-pointer p-1.5 sm:p-2 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 transition-all duration-200 min-h-[2rem] sm:min-h-[2.5rem] flex items-center group"
                          >
                            <div className="flex-1 min-w-0">
                              {observation.option_ids && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {getOptionNames(observation.option_ids).map(
                                    (name, index) => (
                                      <Badge
                                        key={index}
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {name}
                                      </Badge>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <Pencil size={14} className="text-gray-400" />
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground font-mono text-xs">
                        {new Date(observation.created_at).toLocaleTimeString(
                          [],
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground font-mono text-xs">
                        {observation.updated_at !== observation.created_at ? (
                          <span className="text-blue-600">
                            {new Date(
                              observation.updated_at
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === observation.id ? (
                          <div className="flex justify-end gap-1 sm:gap-2">
                            <Button
                              size="sm"
                              onClick={handleSave}
                              disabled={isLoading}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm"
                            >
                              <Check size={14} className="sm:mr-1" />
                              <span className="hidden sm:inline">Guardar</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancel}
                              disabled={isLoading}
                              className="text-xs sm:text-sm"
                            >
                              <X size={14} className="sm:mr-1" />
                              <span className="hidden sm:inline">Cancelar</span>
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(observation)}
                              className="hover:bg-blue-50 hover:text-blue-600 p-1"
                            >
                              <Pencil size={14} />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Eliminar Observación
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    ¿Estás seguro de que quieres eliminar esta
                                    observación? Esta acción no se puede
                                    deshacer.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    Cancelar
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(observation.id)}
                                    disabled={isLoading}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
