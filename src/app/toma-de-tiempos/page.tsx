"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Loader2, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { FullPageLoading } from "@/components/LoadingSpinner";
import type { Database } from "@/types/supabase";

type TdtAgencia = Database["public"]["Tables"]["tdt_agencias"]["Row"];
type ListaAgencia = Database["public"]["Tables"]["lista_agencias"]["Row"];

interface AgencyOption {
  id: number;
  name: string;
  codSucAge: number;
}

function TomaDeTiemposPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedAgency, setSelectedAgency] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [agencies, setAgencies] = useState<AgencyOption[]>([]);
  const [isLoadingAgencies, setIsLoadingAgencies] = useState(true);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  // Convert agencies to ComboboxOption format
  const agencyOptions: ComboboxOption[] = agencies.map((agency) => ({
    value: agency.name,
    label: agency.name,
  }));

  // Role options
  const roleOptions: ComboboxOption[] = [
    { value: "Guía", label: "Guía" },
    { value: "Gerente", label: "Gerente" },
  ];

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const loadAgencies = useCallback(async () => {
    try {
      setIsLoadingAgencies(true);

      // Load tdt_agencias
      const { data: tdtAgenciasData, error: tdtAgenciasError } = await supabase
        .from("tdt_agencias")
        .select("*")
        .order("created_at", { ascending: false });

      if (tdtAgenciasError) {
        console.error("Error loading tdt_agencias:", tdtAgenciasError);
        throw tdtAgenciasError;
      }

      if (!tdtAgenciasData || tdtAgenciasData.length === 0) {
        setAgencies([]);
        return;
      }

      // Load all lista_agencias to get the names
      const { data: listaAgenciasData, error: listaAgenciasError } =
        await supabase.from("lista_agencias").select("*");

      if (listaAgenciasError) {
        console.error("Error loading lista_agencias:", listaAgenciasError);
        throw listaAgenciasError;
      }

      // Create a map for quick lookup
      const agenciasMap = new Map(
        (listaAgenciasData || []).map((agencia) => [
          agencia.CODSUCAGE,
          agencia.DESSUCAGE,
        ])
      );

      // Transform the data to create agency options
      const agencyOptions: AgencyOption[] = (tdtAgenciasData || []).map(
        (tdtAgencia) => {
          const agencyName = agenciasMap.get(tdtAgencia.agencia || 0);
          return {
            id: tdtAgencia.id,
            name: agencyName || `Agencia ${tdtAgencia.agencia}`,
            codSucAge: tdtAgencia.agencia || 0,
          };
        }
      );

      setAgencies(agencyOptions);
    } catch (error) {
      console.error("Error loading agencies:", error);
      setAgencies([]);
    } finally {
      setIsLoadingAgencies(false);
    }
  }, []);

  // Check if user has access to tdt_users
  useEffect(() => {
    const checkTdtUserAccess = async () => {
      if (!user || authLoading) {
        setIsCheckingAccess(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("tdt_users")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          // PGRST116 is "not found" error, which means user doesn't have access
          console.error("Error checking tdt_users:", error);
          // Redirect to request access page
          router.push("/toma-de-tiempos/request-access");
          return;
        }

        // If no data found, user doesn't have access
        if (!data) {
          router.push("/toma-de-tiempos/request-access");
          return;
        }

        // User has access, continue loading agencies
        setIsCheckingAccess(false);
        loadAgencies();
      } catch (error) {
        console.error("Error checking tdt_users access:", error);
        // On error, redirect to request access page to be safe
        router.push("/toma-de-tiempos/request-access");
      }
    };

    if (!authLoading && user) {
      checkTdtUserAccess();
    }
  }, [user, authLoading, router, loadAgencies]);

  const handleContinue = () => {
    if (selectedAgency && selectedRole) {
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const dateString = today.toISOString().split("T")[0];
      // Navigate to create session page with selected agency, date, and role
      // selectedAgency is the agency name, convert it to slug
      const agencySlug = selectedAgency.toLowerCase().replace(/\s+/g, "-");
      // Convert role to URL-safe slug (Guía -> guia, Gerente -> gerente)
      const roleSlug = selectedRole.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // Remove accents
      router.push(
        `/toma-de-tiempos/${agencySlug}/${dateString}/${roleSlug}/create-session`
      );
    }
  };

  const handleBack = () => {
    router.push("/projects");
  };

  if (authLoading || isLoadingAgencies || isCheckingAccess) {
    return <FullPageLoading text="Cargando..." />;
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <Button
              onClick={handleBack}
              variant="ghost"
              size="sm"
              className="p-0 h-auto text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft size={16} className="mr-2" />
              Volver
            </Button>
            <Button
              onClick={() => router.push("/toma-de-tiempos/settings")}
              variant="ghost"
              size="sm"
              className="p-0 h-auto text-gray-500 hover:text-gray-700"
            >
              <Settings size={16} className="mr-2" />
              Configuración
            </Button>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Toma de Tiempos
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Selecciona una agencia y rol para continuar
          </p>
        </div>

        {/* Form Content */}
        <div className="space-y-6">
          {/* Agency Selector */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Agencia *
            </label>
            <div className="mt-2">
              <Combobox
                options={agencyOptions}
                value={selectedAgency}
                onValueChange={setSelectedAgency}
                placeholder={
                  agencies.length === 0
                    ? "No hay agencias disponibles"
                    : "Seleccionar agencia..."
                }
                searchPlaceholder="Buscar agencia..."
                emptyText={
                  agencies.length === 0
                    ? "No hay agencias disponibles"
                    : "No se encontraron agencias"
                }
                disabled={agencies.length === 0}
                className="w-full"
              />
            </div>
            {agencies.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">
                No hay agencias configuradas. Ve a Configuración para agregar
                agencias.
              </p>
            )}
          </div>

          {/* Role Selector */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Rol *
            </label>
            <div className="mt-2">
              <Combobox
                options={roleOptions}
                value={selectedRole}
                onValueChange={setSelectedRole}
                placeholder="Seleccionar rol..."
                searchPlaceholder="Buscar rol..."
                emptyText="No se encontraron roles"
                className="w-full"
              />
            </div>
          </div>

          {/* Continue Button */}
          <div className="pt-6 border-t border-gray-100">
            <Button
              onClick={handleContinue}
              disabled={!selectedAgency || !selectedRole}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white"
              size="lg"
            >
              Continuar
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TomaDeTiemposPage() {
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
      <TomaDeTiemposPageContent />
    </Suspense>
  );
}
