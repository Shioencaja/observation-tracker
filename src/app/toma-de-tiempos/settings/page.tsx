"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, X, Edit, Trash2, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FullPageLoading } from "@/components/LoadingSpinner";
import type { Database } from "@/types/supabase";

type ListaAgencia = Database["public"]["Tables"]["lista_agencias"]["Row"];
type TdtAgencia = Database["public"]["Tables"]["tdt_agencias"]["Row"];
type TdtOption = Database["public"]["Tables"]["tdt_options"]["Row"];

function SettingsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Agencias state
  const [allAgencias, setAllAgencias] = useState<ListaAgencia[]>([]);
  const [tdtAgencias, setTdtAgencias] = useState<TdtAgencia[]>([]);
  const [selectedAgencia, setSelectedAgencia] = useState<number | null>(null);

  // Options state
  const [tdtOptions, setTdtOptions] = useState<TdtOption[]>([]);
  const [isOptionDialogOpen, setIsOptionDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<TdtOption | null>(null);
  const [optionFormData, setOptionFormData] = useState({
    canal: "",
    descripción: "",
    lugar: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    try {
      setIsLoading(true);

      // Load all agencias
      const { data: agenciasData, error: agenciasError } = await supabase
        .from("lista_agencias")
        .select("*")
        .order("DESSUCAGE");

      if (agenciasError) {
        console.error("Error loading agencias:", {
          message: agenciasError.message,
          details: agenciasError.details,
          hint: agenciasError.hint,
          code: agenciasError.code,
        });
        throw agenciasError;
      }

      // Load tdt_agencias
      const { data: tdtAgenciasData, error: tdtAgenciasError } = await supabase
        .from("tdt_agencias")
        .select("*")
        .order("created_at", { ascending: false });

      if (tdtAgenciasError) {
        console.error("Error loading tdt_agencias:", {
          message: tdtAgenciasError.message,
          details: tdtAgenciasError.details,
          hint: tdtAgenciasError.hint,
          code: tdtAgenciasError.code,
        });
        throw tdtAgenciasError;
      }

      // Load tdt_options
      const { data: optionsData, error: optionsError } = await supabase
        .from("tdt_options")
        .select("*");

      if (optionsError) {
        console.error("Error loading tdt_options:", {
          message: optionsError.message,
          details: optionsError.details,
          hint: optionsError.hint,
          code: optionsError.code,
        });
        throw optionsError;
      }

      setAllAgencias(agenciasData || []);
      setTdtAgencias(tdtAgenciasData || []);
      setTdtOptions(optionsData || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      // Show more detailed error information
      if (error) {
        console.error("Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          name: error.name,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Agencias handlers
  const handleAddAgencia = async () => {
    if (!selectedAgencia) return;

    try {
      setIsSaving(true);
      const { error } = await supabase.from("tdt_agencias").insert({
        agencia: selectedAgencia,
      });

      if (error) throw error;

      await loadAllData();
      setSelectedAgencia(null);
    } catch (error: any) {
      console.error("Error adding agencia:", error);
      if (error?.code === "42501") {
        alert(
          "Error de permisos: No tienes permisos para realizar esta acción. Contacta al administrador."
        );
      } else {
        alert("Error al agregar agencia");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveAgencia = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta agencia?")) return;

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from("tdt_agencias")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await loadAllData();
    } catch (error: any) {
      console.error("Error removing agencia:", error);
      if (error?.code === "42501") {
        alert(
          "Error de permisos: No tienes permisos para realizar esta acción. Contacta al administrador."
        );
      } else {
        alert("Error al eliminar agencia");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Options handlers
  const handleOpenOptionDialog = (option?: TdtOption) => {
    if (option) {
      setEditingOption(option);
      setOptionFormData({
        canal: option.canal || "",
        descripción: option.descripción || "",
        lugar: option.lugar || "",
      });
    } else {
      setEditingOption(null);
      setOptionFormData({
        canal: "",
        descripción: "",
        lugar: "",
      });
    }
    setIsOptionDialogOpen(true);
  };

  const handleSaveOption = async () => {
    if (
      !optionFormData.canal &&
      !optionFormData.descripción &&
      !optionFormData.lugar
    ) {
      alert("Debe completar al menos un campo");
      return;
    }

    try {
      setIsSaving(true);
      if (editingOption) {
        // Update existing option
        const { error } = await supabase
          .from("tdt_options")
          .update({
            canal: optionFormData.canal || null,
            descripción: optionFormData.descripción || null,
            lugar: optionFormData.lugar || null,
          })
          .eq("id", editingOption.id);

        if (error) throw error;
      } else {
        // Create new option
        const { error } = await supabase.from("tdt_options").insert({
          canal: optionFormData.canal || null,
          descripción: optionFormData.descripción || null,
          lugar: optionFormData.lugar || null,
        });

        if (error) throw error;
      }

      await loadAllData();
      setIsOptionDialogOpen(false);
      setEditingOption(null);
      setOptionFormData({ canal: "", descripción: "", lugar: "" });
    } catch (error: any) {
      console.error("Error saving option:", error);
      const errorMessage =
        error?.message ||
        "Error al guardar opción. Verifica los permisos de la base de datos.";
      if (error?.code === "42501") {
        alert(
          "Error de permisos: No tienes permisos para realizar esta acción. Contacta al administrador."
        );
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOption = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta opción?")) return;

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from("tdt_options")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await loadAllData();
    } catch (error: any) {
      console.error("Error deleting option:", error);
      if (error?.code === "42501") {
        alert(
          "Error de permisos: No tienes permisos para realizar esta acción. Contacta al administrador."
        );
      } else {
        alert("Error al eliminar opción");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Get available agencias (not already in tdt_agencias)
  const availableAgencias = allAgencias.filter(
    (agencia) =>
      !tdtAgencias.some(
        (tdtAgencia) => tdtAgencia.agencia === agencia.CODSUCAGE
      )
  );

  if (authLoading || isLoading) {
    return <FullPageLoading text="Cargando..." />;
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Button
            onClick={() => router.push("/toma-de-tiempos")}
            variant="ghost"
            size="sm"
            className="mb-3 sm:mb-4 p-0 h-auto text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={16} className="mr-2" />
            Volver
          </Button>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            Configuración - Toma de Tiempos
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Gestiona agencias y opciones
          </p>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Agencias Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Agencias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Add Agencia */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select
                    value={selectedAgencia?.toString() || ""}
                    onValueChange={(value) =>
                      setSelectedAgencia(value ? parseInt(value) : null)
                    }
                  >
                    <SelectTrigger className="flex-1 w-full">
                      <SelectValue placeholder="Seleccionar agencia..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAgencias.map((agencia) => (
                        <SelectItem
                          key={agencia.CODSUCAGE}
                          value={agencia.CODSUCAGE.toString()}
                        >
                          {agencia.DESSUCAGE || `Agencia ${agencia.CODSUCAGE}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddAgencia}
                    disabled={!selectedAgencia || isSaving}
                    className="bg-gray-900 hover:bg-gray-800 text-white w-full sm:w-auto"
                  >
                    <Plus size={16} className="mr-2" />
                    Agregar
                  </Button>
                </div>

                {/* Agencias List */}
                <div className="space-y-2">
                  {tdtAgencias.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No hay agencias configuradas
                    </p>
                  ) : (
                    tdtAgencias.map((tdtAgencia) => {
                      const agencia = allAgencias.find(
                        (a) => a.CODSUCAGE === tdtAgencia.agencia
                      );
                      return (
                        <div
                          key={tdtAgencia.id}
                          className="flex items-center justify-between p-3 border rounded-lg gap-2"
                        >
                          <span className="text-sm flex-1 min-w-0 truncate">
                            {agencia?.DESSUCAGE ||
                              `Agencia ${tdtAgencia.agencia}`}
                          </span>
                          <Button
                            onClick={() => handleRemoveAgencia(tdtAgencia.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                            disabled={isSaving}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Options Section */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-lg sm:text-xl">Opciones</CardTitle>
                <Button
                  onClick={() => handleOpenOptionDialog()}
                  className="bg-gray-900 hover:bg-gray-800 text-white w-full sm:w-auto"
                >
                  <Plus size={16} className="mr-2" />
                  Nueva Opción
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tdtOptions.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No hay opciones configuradas
                  </p>
                ) : (
                  tdtOptions.map((option) => (
                    <div
                      key={option.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg gap-3"
                    >
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 font-medium">
                            Canal:
                          </span>{" "}
                          <span className="text-gray-900">
                            {option.canal || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 font-medium">
                            Lugar:
                          </span>{" "}
                          <span className="text-gray-900">
                            {option.lugar || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 font-medium">
                            Descripción:
                          </span>{" "}
                          <span className="text-gray-900">
                            {option.descripción || "-"}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end sm:justify-start">
                        <Button
                          onClick={() => handleOpenOptionDialog(option)}
                          variant="ghost"
                          size="sm"
                          disabled={isSaving}
                          className="flex-shrink-0"
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          onClick={() => handleDeleteOption(option.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                          disabled={isSaving}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Option Dialog */}
        <Dialog open={isOptionDialogOpen} onOpenChange={setIsOptionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingOption ? "Editar Opción" : "Nueva Opción"}
              </DialogTitle>
              <DialogDescription>
                Completa los campos de la opción. Al menos uno debe estar lleno.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="canal">Canal</Label>
                <Input
                  id="canal"
                  value={optionFormData.canal}
                  onChange={(e) =>
                    setOptionFormData({
                      ...optionFormData,
                      canal: e.target.value,
                    })
                  }
                  placeholder="Ej: Digital, Presencial..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lugar">Lugar</Label>
                <Input
                  id="lugar"
                  value={optionFormData.lugar}
                  onChange={(e) =>
                    setOptionFormData({
                      ...optionFormData,
                      lugar: e.target.value,
                    })
                  }
                  placeholder="Ej: Oficina, Sucursal..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  value={optionFormData.descripción}
                  onChange={(e) =>
                    setOptionFormData({
                      ...optionFormData,
                      descripción: e.target.value,
                    })
                  }
                  placeholder="Descripción de la opción"
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setIsOptionDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveOption}
                disabled={isSaving}
                className="bg-gray-900 hover:bg-gray-800 text-white w-full sm:w-auto"
              >
                <Save size={16} className="mr-2" />
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
      }
    >
      <SettingsPageContent />
    </Suspense>
  );
}
