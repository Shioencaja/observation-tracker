"use client";

import { useState, useEffect, Suspense } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [agencies, setAgencies] = useState<AgencyOption[]>([]);
  const [isLoadingAgencies, setIsLoadingAgencies] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadAgencies();
    }
  }, [user]);

  const loadAgencies = async () => {
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
  };

  const handleContinue = () => {
    if (selectedAgency) {
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const dateString = today.toISOString().split("T")[0];
      // Navigate to create session page with selected agency and date
      // selectedAgency is the agency name, convert it to slug
      const agencySlug = selectedAgency.toLowerCase().replace(/\s+/g, "-");
      router.push(
        `/toma-de-tiempos/${agencySlug}/${dateString}/create-session`
      );
    }
  };

  const handleBack = () => {
    router.push("/projects");
  };

  if (authLoading || isLoadingAgencies) {
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
            Selecciona una agencia para continuar
          </p>
        </div>

        {/* Form Content */}
        <div className="space-y-6">
          {/* Agency Selector */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Agencia *
            </label>
            <Select
              value={selectedAgency}
              onValueChange={setSelectedAgency}
              disabled={agencies.length === 0}
            >
              <SelectTrigger className="mt-2 w-full h-11 border-gray-200 focus:border-gray-400 focus:ring-gray-400">
                <SelectValue
                  placeholder={
                    agencies.length === 0
                      ? "No hay agencias disponibles"
                      : "Seleccionar agencia..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {agencies.map((agency) => (
                  <SelectItem key={agency.id} value={agency.name}>
                    {agency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {agencies.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">
                No hay agencias configuradas. Ve a Configuración para agregar
                agencias.
              </p>
            )}
          </div>

          {/* Continue Button */}
          <div className="pt-6 border-t border-gray-100">
            <Button
              onClick={handleContinue}
              disabled={!selectedAgency}
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
