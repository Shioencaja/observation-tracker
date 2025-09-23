"use client";

import { useState, useEffect } from "react";
import { Pencil, Check, X, Plus, Trash2, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Observation } from "@/types/observation";
import { Tables } from "@/types/supabase";
import { Button } from "@/components/ui/button";
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
import { PaginationWrapper } from "@/components/ui/pagination-wrapper";
import { usePagination } from "@/hooks/use-pagination";
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
  projectId: string;
  onUpdate: () => void;
  canAddObservations: boolean;
  onAddObservation: () => void;
  newlyCreatedObservationId?: string | null;
  onClearNewlyCreatedObservationId: () => void;
  observationOptions: Tables<"project_observation_options">[];
}

export default function ObservationsTable({
  observations,
  sessionId,
  projectId,
  onUpdate,
  canAddObservations,
  onAddObservation,
  newlyCreatedObservationId,
  onClearNewlyCreatedObservationId,
  observationOptions,
}: ObservationsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Use the observationOptions passed from parent
  const options = observationOptions;

  // Pagination for observations
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedObservations,
    goToPage,
  } = usePagination({
    data: observations,
    itemsPerPage: 10,
  });

  // Auto-edit newly created observations
  useEffect(() => {
    if (newlyCreatedObservationId && observations.length > 0) {
      const newObservation = observations.find(
        (obs) => obs.id === newlyCreatedObservationId
      );
      if (newObservation) {
        setEditingId(newObservation.id);
        setSelectedOptions(
          newObservation.project_observation_option_id
            ? [newObservation.project_observation_option_id]
            : []
        );
        // Clear the newly created observation ID after setting up edit mode
        onClearNewlyCreatedObservationId();
      }
    }
  }, [
    newlyCreatedObservationId,
    observations,
    onClearNewlyCreatedObservationId,
  ]);

  const handleEdit = (observation: Observation) => {
    setEditingId(observation.id);
    // Use single project observation option ID
    setSelectedOptions(
      observation.project_observation_option_id
        ? [observation.project_observation_option_id]
        : []
    );
  };

  const handleSave = async () => {
    if (!editingId) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("observations")
        .update({
          project_observation_option_id:
            selectedOptions.length > 0 ? selectedOptions[0] : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);

      if (error) throw error;

      setEditingId(null);
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
      // Set single option (replace any existing selection)
      setSelectedOptions([optionId]);
    } else {
      // Clear selection
      setSelectedOptions([]);
    }
  };

  const getOptionName = (optionId: string | null) => {
    if (!optionId) return null;
    const option = options.find((opt) => opt.id === optionId);
    return option?.name || "Unknown Option";
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
            <div className="rounded-md border border-gray-200 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-8 sm:w-12 text-center text-xs font-semibold text-foreground uppercase tracking-wide py-3">
                      #
                    </TableHead>
                    <TableHead className="min-w-[150px] text-xs font-semibold text-foreground uppercase tracking-wide py-3">
                      Opciones
                    </TableHead>
                    <TableHead className="hidden md:table-cell w-20 text-xs font-semibold text-foreground uppercase tracking-wide py-3">
                      Creado
                    </TableHead>
                    <TableHead className="hidden lg:table-cell w-20 text-xs font-semibold text-foreground uppercase tracking-wide py-3">
                      Actualizado
                    </TableHead>
                    <TableHead className="text-right w-20 text-xs font-semibold text-foreground uppercase tracking-wide py-3">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedObservations.map((observation, index) => (
                    <TableRow key={observation.id} className="h-12">
                      <TableCell className="font-medium text-center text-sm">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        {editingId === observation.id ? (
                          <div className="space-y-2">
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
                                        Seleccionar opción...
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
                                            className="text-xs px-1 py-0 group cursor-pointer hover:bg-muted"
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
                                              className="ml-1 hover:bg-muted rounded-full p-0.5 cursor-pointer"
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
                                          <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center">
                                            {selectedOptions.includes(
                                              option.id
                                            ) && (
                                              <div className="w-2 h-2 rounded-full bg-primary"></div>
                                            )}
                                          </div>
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
                          </div>
                        ) : (
                          <div
                            onClick={() => handleEdit(observation)}
                            className="cursor-pointer p-1.5 sm:p-2 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 transition-all duration-200 min-h-[2rem] sm:min-h-[2.5rem] flex items-center group"
                          >
                            <div className="flex-1 min-w-0">
                              {observation.project_observation_option_id && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {getOptionName(
                                      observation.project_observation_option_id
                                    )}
                                  </Badge>
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
                  {/* Fill remaining rows to maintain fixed height */}
                  {Array.from({
                    length: Math.max(0, 10 - paginatedObservations.length),
                  }).map((_, index) => (
                    <TableRow key={`empty-${index}`} className="h-12">
                      <TableCell colSpan={6} className="h-12"></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          <div className="mt-4">
            <PaginationWrapper
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
